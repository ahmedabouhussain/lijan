import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import { loadRoundContext } from '../../shared/roundContext.ts';
import {
  canonicalProposal, proposalDigest, contentBinding, compareProposals,
  PROPOSAL_CONTENT_VERSION, versionLabel,
} from '../../shared/proposalContent.ts';

// GetProposalChanges — the governed read behind the proposal-integrity surface (D-061, S14).
//
// It answers four questions on ONE screen, before anyone votes or issues:
//   1. WHICH text is the version in force        (the current canonical fingerprint)
//   2. WHICH text the open round FROZE           (the frozen copy, RE-HASHED — a fingerprint that verifies)
//   3. WHAT moved                               (per-field findings, material ones named)
//   4. WHAT the previous round was bound to      (what a re-vote is changing against)
//
// It reads through the SAME governed read path as every detail surface (resolvePrincipal +
// authorizeRead), so a record the requester cannot read is refused here too instead of being
// summarised; `showcase_token` is the only authority-bearing input, and the committee comes from the
// record itself, never from the payload.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { decision_id, showcase_token } = body || {};

    if (!decision_id) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    const callerUser = await base44.auth.me().catch(() => null);
    const principal = await resolvePrincipal({ sr, body: { showcase_token }, callerUser });

    const decision: any = await sr.entities.Decision.get(decision_id).catch(() => null);
    if (!decision) return Response.json(refusalBody('not_found'), { status: 404 });

    const allowed: any = await authorizeRead({ base44, sr, principal, record: decision });
    if (!allowed.allowed) {
      return Response.json(refusalBody(allowed.reason), { status: refusalStatus(allowed.reason) });
    }

    const committeeId = decision.committee_id;

    const ctx = await loadRoundContext(sr, { decision_id, committee_id: committeeId });
    const openRound = ctx.round || null;

    // Every round ever frozen for this decision, so a re-vote is compared against the round it
    // replaces. Read explicitly: the round contract reports how many rounds it saw but returns only
    // the round in force, and the earlier texts are exactly what a material-change review needs.
    const allRounds = (await sr.entities.EligibleVoterSnapshot
      .filter({ decision_id }, { sort: '-round', limit: 20 }).catch(() => ({ items: [] }))).items || [];
    const previousRound = allRounds
      .filter((r: any) => r.id !== openRound?.id && r.proposal_sha256)
      .sort((a: any, b: any) => (b.round || 0) - (a.round || 0))[0] || null;

    const current = canonicalProposal(decision);
    const current_sha256 = await proposalDigest(current);
    const binding = await contentBinding({ round: openRound, decision });

    // What moved: against the open round's frozen text when there is one, otherwise against the
    // previous round — so a decision being prepared for a re-vote still names what it changes.
    let changes = binding.changes;
    let comparedAgainst = binding.changes ? 'open_round' : null;
    if (!changes && previousRound?.proposal_content) {
      try {
        changes = compareProposals(JSON.parse(previousRound.proposal_content), current);
        comparedAgainst = 'previous_round';
      } catch { changes = null; }
    }

    const frozen = (() => {
      if (!openRound?.proposal_content) return null;
      try { return JSON.parse(openRound.proposal_content); } catch { return null; }
    })();

    return Response.json({
      status: 'ok',
      contract_version: PROPOSAL_CONTENT_VERSION,
      decision_id,
      committee_id: committeeId,
      decision_status: decision.status,
      current: { version: versionLabel(current_sha256), sha256: current_sha256, content: current },
      open_round: openRound ? {
        round_id: openRound.id,
        round_number: openRound.round || null,
        frozen_at: openRound.frozen_at || null,
        frozen_version: openRound.proposal_version || null,
        frozen_sha256: openRound.proposal_sha256 || null,
        frozen_content: frozen,
        contract_version: openRound.proposal_contract_version || null,
        material_changes_from_previous: openRound.material_changes_from_previous || [],
      } : null,
      previous_round: previousRound ? {
        round_id: previousRound.id,
        round_number: previousRound.round || null,
        frozen_sha256: previousRound.proposal_sha256 || null,
        frozen_version: previousRound.proposal_version || null,
      } : null,
      binding: {
        state: binding.state,
        code: binding.code,
        frozen_sha256: binding.frozen_sha256,
        current_sha256: binding.current_sha256,
        // "verified" means the stored frozen copy re-hashed to its own fingerprint — a digest check,
        // not proof of legal validity or trusted time.
        verified: binding.state === 'bound' || binding.state === 'stale',
      },
      changes,
      changes_compared_against: comparedAgainst,
      round_conflict: ctx.conflict || null,
      correlation_id: null,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}