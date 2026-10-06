import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { loadRoundContext } from '../../shared/roundContext.ts';
import {
  canonicalProposal, proposalDigest, contentBinding, compareProposals,
  PROPOSAL_CONTENT_VERSION, versionLabel,
} from '../../shared/proposalContent.ts';

// GetProposalChanges — the governed read behind the proposal-integrity surface (D-061, S14).
//
// It answers four questions on ONE screen, before anyone votes or issues:
//   1. WHICH text is the version in force       (the current canonical fingerprint)
//   2. WHICH text the open round FROZE          (the frozen copy, re-hashed — a digest that verifies)
//   3. WHAT moved                             (per-field findings; material ones highlighted)
//   4. WHAT the previous round was bound to     (what a re-vote changes against)
//
// The read is authority-bound like every other governed command, and it RE-VERIFIES the frozen copy
// by re-hashing it, so a stored content that no longer matches its own fingerprint is reported as
// tampered instead of being displayed as sound evidence.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, decision_id } = body || {};
    if (!decision_id) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'read',
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const decision = auth.target;
    const committeeId = auth.trusted_target.derived_committee_id;

    const ctx = await loadRoundContext(base44.asServiceRole, { decision_id, committee_id: committeeId });
    const openRound = ctx.round || null;
    // Every round ever frozen for this decision, so a re-vote can be compared against the round it
    // replaces. Read explicitly: the round contract reports `rounds_seen` but returns only the round
    // in force, and the earlier texts are exactly what a material-change review needs.
    const allRounds = (await base44.asServiceRole.entities.EligibleVoterSnapshot
      .filter({ decision_id }, { sort: '-round', limit: 20 })).items || [];
    const previousRound = allRounds
      .filter((r) => r.id !== openRound?.id && r.proposal_sha256)
      .sort((a, b) => (b.round || 0) - (a.round || 0))[0] || null;

    const current = canonicalProposal(decision);
    const current_sha256 = await proposalDigest(current);

    const binding = await contentBinding({ round: openRound, decision });

    // What moved since the round froze — only meaningful when the content is bound but was edited,
    // or when there is no open round and the comparison is against the previous round.
    let changes = binding.changes;
    if (!changes && previousRound?.proposal_content) {
      try { changes = compareProposals(JSON.parse(previousRound.proposal_content), current); } catch { changes = null; }
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
      current: {
        version: versionLabel(current_sha256),
        sha256: current_sha256,
        content: current,
      },
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
        verified: binding.state === 'bound' || binding.state === 'stale',
      },
      changes,
      round_conflict: ctx.conflict || null,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}