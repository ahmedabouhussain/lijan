import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';
import {
  evaluateIssuanceReadiness, issuanceVerdict, canonicalManifest, manifestDigest,
  ISSUANCE_COPY, INTEGRITY_POLICY_VERSION, ASSURANCE,
} from '../../shared/decisionIntegrity.ts';
import { AUTHORITY_POLICY_VERSION } from '../../shared/authorityKernel.ts';

// IssueDecision — issues a decision AS A GOVERNED TRANSITION, never as a writable status field.
//
// P0-01 of the national delivery brief: the decision presented as issued while carrying a 0-seat
// eligible electorate against 13 accepted votes, 5 of 6 mandatory items, empty proof links and no
// issue date. Issuance therefore no longer trusts the record's own numbers: it loads the seats,
// ballots, attendance, recusals and signatures, reconciles them through ONE evaluator, refuses when
// anything does not reconcile, and writes an immutable IssueSnapshot with a deterministic digest and
// a server-issued date. Nothing is invented to make a package pass — a missing signature requirement
// is reported as missing, and an explicit "none required" policy is a different, recorded fact.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { decision_id } = body;

    if (!decision_id) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    // Authority on a TRUSTED target: the guard loads the decision itself and derives the committee
    // from it, so no scope arrives from the request at all.
    const auth = await authorizeCommand(base44, {
      capability: 'decision.issue',
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const sr = base44.asServiceRole;
    const decision = auth.target;

    // Mandate authority: a decision cannot be issued by a committee with no mandate behind it.
    const committee = auth.trusted_target?.derived_committee_id
      ? await sr.entities.Committee.get(auth.trusted_target.derived_committee_id).catch(() => null)
      : null;
    if (!committee) return Response.json({ error: 'Committee not found for this decision' }, { status: 404 });
    if (!committee.mandate && !committee.mandate_id) {
      return Response.json({ error: 'Committee has no mandate — cannot issue decisions' }, { status: 400 });
    }

    if (!['approved', 'voting', 'issued', 'executing', 'draft', 'proposed'].includes(decision.status)) {
      return Response.json({ error: `Decision must be approved before issuance (current: ${decision.status})` }, { status: 400 });
    }

    // ── Facts, all read server-side ─────────────────────────────────────────────────────────────
    const [signatures, votes, memberships, recusals, attendance, actions, snapshots] = await Promise.all([
      sr.entities.Signature.filter({ document_type: 'Decision', document_id: decision_id, status: 'active' }).catch(() => []),
      sr.entities.Vote.filter({ decision_id }).catch(() => []),
      sr.entities.CommitteeMembership.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
      sr.entities.Recusal.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
      decision.meeting_id ? sr.entities.Attendance.filter({ meeting_id: decision.meeting_id }).catch(() => []) : Promise.resolve([]),
      sr.entities.Action.filter({ decision_id }).catch(() => []),
      sr.entities.IssueSnapshot.filter({ decision_id }, { sort: '-created_date', limit: 1 }).catch(() => []),
    ]);
    const storedSnapshot = (Array.isArray(snapshots) ? snapshots : (snapshots?.items || []))[0] || null;

    const proofLinks = [
      ...(actions || []).map((a) => a.evidence_url),
      decision.legal_basis,
    ];

    const readiness = evaluateIssuanceReadiness({
      decision, committee, memberships, recusals, votes, attendance, signatures, proof_links: proofLinks,
    });

    const buildProofChain = (issuedAt) => ({
      decision_id,
      decision_number: decision.decision_number,
      title: decision.title,
      committee_id: committee.id,
      committee_name: committee.name_ar || committee.name_en,
      mandate: committee.mandate || committee.mandate_id,
      meeting_id: decision.meeting_id,
      vote_certification: {
        for: readiness.ballots.tally.for,
        against: readiness.ballots.tally.against,
        abstain: readiness.ballots.tally.abstain,
        accepted_ballots: readiness.ballots.accepted_count,
        eligible_electorate: readiness.electorate.size,
        voting_rule: committee.voting_rule || null,
        threshold_basis: readiness.threshold.basis,
      },
      quorum: readiness.quorum,
      electorate_basis: readiness.electorate.basis,
      excluded_seats: readiness.electorate.excluded,
      required_signatures: (signatures || []).map((s) => ({
        signer: s.signer_name, role: s.signer_role, intent: s.intent, signed_at: s.signed_at,
      })),
      signature_requirement: readiness.signatures.requirement,
      signature_basis: readiness.signatures.basis,
      issuing_authority: auth.user.full_name || auth.user.email,
      issuing_role: auth.effective_role,
      created_actions: (actions || []).map((a) => ({ id: a.id, title: a.title, owner: a.owner_name })),
      issued_at: issuedAt,
      assurance: ASSURANCE,
      audit_correlation_id: auth.correlation_id,
    });

    // Already issued: return the VERIFICATION verdict, never a bare "ok". A contradictory package
    // is reported as inconsistent here rather than hidden behind a successful response.
    if (decision.status === 'issued' || decision.status === 'executing') {
      const verdict = issuanceVerdict({ decision, stored: storedSnapshot, recomputed: readiness });
      return Response.json({
        status: 'ok',
        decision_id,
        already_issued: true,
        issuance: verdict,
        readiness: { ready: readiness.ready, blockers: readiness.blockers, completeness: readiness.completeness },
        proof_chain: buildProofChain(storedSnapshot?.issued_at || decision.issued_at || null),
        correlation_id: auth.correlation_id,
      });
    }

    // ── The issuance gate ───────────────────────────────────────────────────────────────────────
    if (!readiness.ready) {
      return Response.json({
        error: ISSUANCE_COPY.blocked_en,
        error_ar: ISSUANCE_COPY.blocked_ar,
        code: 'issuance_blocked',
        readiness: {
          ready: false,
          blockers: readiness.blockers,
          completeness: readiness.completeness,
          electorate: { size: readiness.electorate.size, basis: readiness.electorate.basis, excluded: readiness.electorate.excluded },
          ballots: { accepted: readiness.ballots.accepted_count, tally: readiness.ballots.tally, rejected: readiness.ballots.ineligible.length + readiness.ballots.duplicates.length + readiness.ballots.malformed.length },
          quorum: readiness.quorum,
          signatures: readiness.signatures,
        },
        integrity_policy_version: INTEGRITY_POLICY_VERSION,
        decided: 'refused_before_write',
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // Exclusivity on ISSUANCE: two simultaneous issues both see a non-issued status, so the right to
    // issue is claimed first. Exactly one transition writes the material effect and one audit event;
    // the loser performs NO write and is told the issuance is already claimed.
    const claim = await claimTransition(base44, {
      key: `decision.issue:${decision_id}`,
      command: 'IssueDecision',
      entity_type: 'Decision',
      entity_id: decision_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'This decision issuance is already in progress or complete');

    const issuedAt = new Date().toISOString();
    const canonical = canonicalManifest({ ...readiness.manifest_input, issued_at: issuedAt });
    const digest = await manifestDigest(canonical);

    const snapshot = await sr.entities.IssueSnapshot.create({
      organization_id: auth.organization_id,
      committee_id: committee.id,
      decision_id,
      decision_number: decision.decision_number || null,
      snapshot_version: 1,
      proposal_version: String(decision.updated_date || decision.created_date || ''),
      material_version: String(decision.updated_date || ''),
      mandate_version: String(committee.version || 1),
      integrity_policy_version: INTEGRITY_POLICY_VERSION,
      authority_policy_version: AUTHORITY_POLICY_VERSION,
      voting_rule: committee.voting_rule || null,
      quorum_required: readiness.quorum.required,
      quorum_present: readiness.quorum.present,
      quorum_met: readiness.quorum.met,
      threshold_basis: readiness.threshold.basis,
      threshold_needed: readiness.threshold.needed,
      threshold_met: readiness.ballots.tally.for >= readiness.threshold.needed,
      electorate_size: readiness.electorate.size,
      electorate_basis: readiness.electorate.basis,
      eligible_seat_ids: readiness.electorate.seats.map((s) => s.seat_id),
      excluded_seats: readiness.electorate.excluded.map((e) => `${e.seat_id}:${e.reason}`),
      accepted_ballots: readiness.ballots.accepted.map((b) => `${b.seat_id || b.user_id}:${b.choice}:${b.method}`),
      accepted_ballot_count: readiness.ballots.accepted_count,
      rejected_ballots: [
        ...readiness.ballots.ineligible.map((b) => `${b.seat_id || b.user_id}:ineligible`),
        ...readiness.ballots.duplicates.map((b) => `${b.seat_id || b.user_id}:duplicate`),
        ...readiness.ballots.malformed.map((b) => `${b.vote_id}:malformed`),
      ],
      tally_for: readiness.ballots.tally.for,
      tally_against: readiness.ballots.tally.against,
      tally_abstain: readiness.ballots.tally.abstain,
      completeness_required: readiness.completeness.required,
      completeness_satisfied: readiness.completeness.satisfied,
      signature_requirement: readiness.signatures.requirement,
      signatures_present: readiness.signatures.present_count,
      signature_basis: readiness.signatures.basis,
      evidence_manifest: canonical,
      manifest_sha256: digest,
      assurance_level: ASSURANCE.level,
      issuer_user_id: auth.user.id,
      issuer_name: auth.user.full_name || auth.user.email,
      issuer_capacity: auth.effective_role,
      issued_at: issuedAt,
      source_meeting_id: decision.meeting_id || null,
      source_agenda_item_id: decision.agenda_item_id || null,
      execution_links: (actions || []).map((a) => a.id),
      correlation_id: auth.correlation_id,
    });

    await sr.entities.Decision.update(decision_id, {
      status: 'issued',
      outcome: decision.outcome || 'Issued with a verified issuance package',
      issued_at: issuedAt,
      issued_by_user_id: auth.user.id,
      issued_by_name: auth.user.full_name || auth.user.email,
      issue_snapshot_id: snapshot.id,
      issue_manifest_sha256: digest,
      issuance_state: 'complete',
    });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: committee.id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'decision.issue', entity_type: 'Decision', entity_id: decision_id,
      entity_title: decision.title,
      description: `Decision issued: electorate ${readiness.electorate.size} seat(s), ${readiness.ballots.accepted_count} accepted ballot(s), completeness ${readiness.completeness.satisfied}/${readiness.completeness.required}, signatures ${readiness.signatures.requirement} (${readiness.signatures.present_count} present)`,
      new_value: 'issued',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    await completeTransition(base44, claim.claim_id, { result_ref: decision_id });

    // Dispatch decision_issued notifications to all active committee members
    try {
      const actorName = auth.user.full_name || auth.user.email;
      // The link must land in the record's real scope, so the organization is resolved from the
      // committee rather than assumed to be the record's organization id.
      const org = committee.organization_id
        ? await sr.entities.Organization.get(committee.organization_id).catch(() => null)
        : null;
      const orgRef = org?.public_id || null;
      const committeeRef = committee.public_id || null;
      const deepLink = orgRef && committeeRef
        ? `/o/${orgRef}/c/${committeeRef}/decisions/${decision_id}`
        : `/o/${committeeRef || committee.id}/c/${committeeRef || committee.id}/decisions/${decision_id}`;
      const notifParams = (memberships || [])
        .filter((m) => m.user_id && m.user_id !== auth.user.id)
        .map((m) => ({
          organization_id: auth.organization_id,
          committee_id: committee.id,
          recipient_user_id: m.user_id,
          recipient_name: m.full_name || m.full_name_ar || '',
          event_type: 'decision_issued',
          context: {
            decision_title: decision.title,
            decision_number: decision.decision_number || '',
            committee_name: committee.name_ar || committee.name_en || '',
            actor_name: actorName,
            deep_link: deepLink,
          },
          source_entity_type: 'Decision',
          source_entity_id: decision_id,
          source_title: decision.title,
          priority: 'urgent',
          correlation_id: auth.correlation_id,
          actor_name: actorName,
          deep_link: deepLink,
        }));
      if (notifParams.length > 0) await dispatchBatch(base44, notifParams);
    } catch {}

    return Response.json({
      status: 'ok',
      decision_id,
      snapshot_id: snapshot.id,
      manifest_sha256: digest,
      assurance: ASSURANCE,
      issuance: issuanceVerdict({ decision: { ...decision, status: 'issued', issued_at: issuedAt }, stored: snapshot, recomputed: readiness }),
      proof_chain: buildProofChain(issuedAt),
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}