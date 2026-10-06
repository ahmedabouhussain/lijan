import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';
import {
  evaluateIssuanceReadiness, issuanceVerdict, verifyStoredManifest, canonicalManifest, manifestDigest,
  ISSUANCE_COPY, INTEGRITY_POLICY_VERSION, ASSURANCE,
} from '../../shared/decisionIntegrity.ts';
import { AUTHORITY_POLICY_VERSION } from '../../shared/authorityKernel.ts';
import { loadRoundContext } from '../../shared/roundContext.ts';
// A written resolution freezes its own evidence, so issuance can read it through the same evaluation.
import { circulationAsFrozenRound } from '../../shared/circulationRoundContext.ts';
import { issuanceGate, refusalFor } from '../../shared/decisionLifecycle.ts';
import { contentBinding, bindingRefusal, PROPOSAL_CONTENT_VERSION } from '../../shared/proposalContent.ts';

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

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

    // D-041: this gate accepted SEVEN states — including `draft` and `proposed` — while refusing with
    // the text "Decision must be approved before issuance". The refusal described a rule the code did
    // not enforce, so approval, issuance and effectiveness were not distinguished. The gate now comes
    // from the shared lifecycle contract: first issuance acts on `approved` alone (a state only the
    // vote result produces), and an already issued/executing decision takes the IDEMPOTENT answer —
    // a re-verification of the same package, never a silent second issuance.
    const issueGate = issuanceGate(decision.status);
    if (!issueGate.allowed) {
      return Response.json(refusalFor('issue', decision.status), { status: 409 });
    }

    // ── Facts, all read server-side ─────────────────────────────────────────────────────────────
    // The memberships, recusals and ballots that decide this package come from the ROUND context, not
    // from today's register: the frozen round is the authority for who was eligible and for which
    // ballots belong to it (see shared/roundContext.ts).
    //
    // DEFECT CORRECTED HERE (5 Oct review): this Promise.all carried EIGHT queries while destructuring
    // SEVEN names, so the EligibleVoterSnapshot result was discarded and `frozenRounds` was then
    // referenced without being declared — every issuance attempt that got past the guard died in a
    // ReferenceError and answered 500. The round is now resolved by ONE call that cannot drift out of
    // step with its own destructuring, and a missing round BLOCKS issuance rather than falling back.
    const [signatures, attendance, actions, snapshots, activeRoundCtx] = await Promise.all([
      sr.entities.Signature.filter({ document_type: 'Decision', document_id: decision_id, status: 'active' }).catch(() => []),
      decision.meeting_id ? sr.entities.Attendance.filter({ meeting_id: decision.meeting_id }).catch(() => []) : Promise.resolve([]),
      sr.entities.Action.filter({ decision_id }).catch(() => []),
      sr.entities.IssueSnapshot.filter({ decision_id }, { sort: '-created_date', limit: 1 }).catch(() => []),
      loadRoundContext(sr, { decision_id, committee_id: committee.id }),
    ]);
    const storedSnapshot = arr(snapshots)[0] || null;

    // ── HISTORY BINDING ────────────────────────────────────────────────────────────────────────
    // When a package already exists, the evidence that counts is the evidence of the round it was
    // issued FROM — not today's active round. Rebinding here is what stops a later round from being
    // used to re-judge an earlier issuance: after a re-vote or a correction the active round is a
    // DIFFERENT round, and judging the old package by it read a valid issuance as inconsistent.
    const issuedRoundId = storedSnapshot?.round_snapshot_id || null;
    let roundCtx = activeRoundCtx;
    let boundTo: string = issuedRoundId ? 'issued_round' : 'active_round';
    if (issuedRoundId && issuedRoundId !== activeRoundCtx.round?.id) {
      roundCtx = await loadRoundContext(sr, { decision_id, committee_id: committee.id, round_id: issuedRoundId });
    } else if (storedSnapshot && !issuedRoundId) {
      // A package written before round binding existed names no round, so it cannot be bound to one.
      // The limitation is REPORTED, never papered over by assuming today's round is the right one.
      boundTo = 'unbound_legacy_package';
    }

    // An existing package is never silently replaced by a second one. Re-issuance after the round was
    // superseded is a CORRECTION, and a correction is a NEW linked record — a procedure this build
    // does not authorize, so the governed answer is a stop that names the reason.
    if (storedSnapshot && !['issued', 'executing'].includes(decision.status)) {
      return Response.json({
        error: 'An issuance package already exists for this decision',
        code: 'issuance_package_exists',
        message: {
          ar: 'توجد حزمة إصدار محفوظة لهذا القرار؛ لا تُستبدل ولا يُكتب فوقها. وإن تغيّرت الدورة أو النص، فالمسار قرار تصحيحي جديد مرتبط بالأصل.',
          en: 'A stored issuance package already exists; it is never replaced or overwritten. If the round or the text changed, the route is a new correction record linked to the original.',
        },
        existing_snapshot: { id: storedSnapshot.id, issued_at: storedSnapshot.issued_at || null, round_snapshot_id: issuedRoundId },
        current_round_id: activeRoundCtx.round?.id || null,
        correction_procedure: null,
        policy_authorized_alternative: null,
        decided: 'refused_before_write',
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // A missing frozen round BLOCKS new issuance. A live recomputation of today's register is not an
    // equivalent package: it is weaker evidence, it is never substituted for a frozen round, and it is
    // never described as one. A SEPARATE, policy-authorized alternative procedure could supply
    // equivalent evidence — none is defined in this build, so the answer here is a governed stop.
    // More than one ACTIVE round is a contradiction the caller must settle, not a choice to make by
    // sort order: with no single frozen round named, nothing is issued or certified on this evidence.
    if (roundCtx.conflict) {
      return Response.json({
        error: 'More than one active frozen voting round exists for this decision',
        code: roundCtx.conflict,
        message: {
          ar: 'توجد أكثر من دورة تصويت نشطة مجمّدة لهذا القرار؛ لا تُختار دورة بالترتيب. يلزم حسم الدورة المعتمدة قبل الإصدار أو الشهادة.',
          en: 'More than one active frozen round exists. No round is chosen by order: the governing round must be settled before issuance or certification.',
        },
        rounds_seen: roundCtx.rounds_seen,
        decided: 'refused_before_write',
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // A decision approved by WRITTEN RESOLUTION carries its own frozen evidence: the eligible seats at
    // dispatch, the frozen text and every authenticated response. It is read through the SAME
    // evaluation as a vote round, and the basis names the route — so a package never pretends a ballot
    // round existed. Without this the circulation route would approve decisions that nothing could
    // officialise: a dead end of the D-041 class.
    if (!roundCtx.round) {
      const circ = await circulationAsFrozenRound(sr, { decision_id, committee_id: committee.id });
      if (circ.conflict) {
        return Response.json({
          error: 'The circulation evidence for this decision cannot support an issuance',
          code: circ.conflict,
          message: {
            ar: 'أدلة القرار بالتمرير غير صالحة للإصدار: لا يصدر قرار على موافقات أُبطلت بتعديل مادي، ولا على أكثر من دورة معتمدة.',
            en: 'The circulation evidence cannot support issuance: no issuance rests on approvals invalidated by a material amendment, nor on more than one approved round.',
          },
          decided: 'refused_before_write',
          correlation_id: auth.correlation_id,
        }, { status: 409 });
      }
      if (circ.round) roundCtx = circ;
    }

    if (!roundCtx.round) {
      return Response.json({
        error: 'No frozen voting round exists for this decision',
        code: 'no_frozen_round',
        message: {
          ar: 'لا توجد دورة تصويت مجمّدة لهذا القرار؛ لا يصدر قرار على إعادة حساب حيّة. يلزم فتح التصويت لتثبيت الهيئة الناخبة، أو إجراء بديل معتمد بالسياسة يوفّر أدلة مكافئة.',
          en: 'No frozen voting round exists for this decision; issuance does not proceed on a live recomputation. Either the vote is reopened so the electorate is frozen, or a policy-authorized alternative procedure must supply equivalent evidence.',
        },
        policy_authorized_alternative: null,
        decided: 'refused_before_write',
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // A round naming a seat whose row no longer exists is a broken chain, not a pass. A seat that
    // merely ENDED is not broken: it is resolved historically, because that is the seat that voted.
    if (roundCtx.unresolved_seat_ids.length > 0) {
      return Response.json({
        error: 'The frozen voting round can no longer be resolved',
        code: 'frozen_round_unresolvable',
        message: {
          ar: 'دورة التصويت المجمّدة تشير إلى مقاعد لم تعد موجودة؛ لا يمكن الإصدار على أساس ناقص.',
          en: 'The frozen voting round names seats that no longer exist; issuance cannot rest on an incomplete electorate.',
        },
        frozen_seats: (roundCtx.round.eligible_seat_ids || []).length,
        resolved_seats: roundCtx.memberships.length,
        unresolved_seat_ids: roundCtx.unresolved_seat_ids,
        decided: 'refused_before_write',
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // D-061 (proposal-content-1.0.0): a NEW issuance rests on the text the round froze. If the
    // proposal was edited after the vote opened, what would be issued is not what was voted; a round
    // opened before content freezing names no text at all. Both stop here, before any claim or write.
    let contentBound: any = null;
    if (!storedSnapshot) {
      contentBound = await contentBinding({ round: roundCtx.round, decision });
      if (contentBound.state !== 'bound') {
        return Response.json(bindingRefusal(contentBound, auth.correlation_id), { status: 409 });
      }
    }

    const electorateBasisNote = roundCtx.basis;

    const proofLinks = [
      ...(actions || []).map((a) => a.evidence_url),
      decision.legal_basis,
    ];

    const readiness = evaluateIssuanceReadiness({
      decision, committee,
      // The frozen seats, the recusals as they stood on the freeze day, and ONLY the ballots bound to
      // this round — evaluated as of that day, so today's register cannot rewrite the electorate and
      // a ballot from another round cannot be counted here.
      memberships: roundCtx.memberships,
      recusals: roundCtx.recusals,
      votes: roundCtx.ballots,
      attendance, signatures, proof_links: proofLinks,
      now: roundCtx.as_of || undefined,
      // The package records the round it rests on (1.2.0), so re-verification can bind to it.
      round: roundCtx.round,
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
      // The stored package is VERIFIED against its own digest before any verdict is reported, so a
      // tampered package can never be returned as a clean result.
      const manifestCheck = await verifyStoredManifest(storedSnapshot);
      const verdict = issuanceVerdict({ decision, stored: storedSnapshot, recomputed: readiness, manifest_check: manifestCheck });
      return Response.json({
        status: 'ok',
        decision_id,
        already_issued: true,
        round_binding: {
          bound_to: boundTo,
          round_id: roundCtx.round?.id || null,
          round_status: roundCtx.round_status,
          superseded_by: roundCtx.superseded_by,
        },
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
    // The package names the FROZEN proposal fingerprint, so re-hashing the manifest also proves which
    // text was issued — not only which seats and ballots.
    const canonical = canonicalManifest({
      ...readiness.manifest_input,
      issued_at: issuedAt,
      proposal: contentBound ? { sha256: contentBound.frozen_sha256, contract_version: PROPOSAL_CONTENT_VERSION } : null,
    });
    const digest = await manifestDigest(canonical);

    const snapshot = await sr.entities.IssueSnapshot.create({
      organization_id: auth.organization_id,
      committee_id: committee.id,
      decision_id,
      decision_number: decision.decision_number || null,
      snapshot_version: 1,
      round_snapshot_id: roundCtx.round.id,
      round_number: roundCtx.round.round || 1,
      round_frozen_on: roundCtx.round.frozen_on || null,
      // Bound to the ROUND's frozen content (D-061), not to whatever timestamp the record carries now.
      proposal_version: roundCtx.round.proposal_version || null,
      proposal_sha256: contentBound?.frozen_sha256 || null,
      proposal_contract_version: PROPOSAL_CONTENT_VERSION,
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
      electorate_basis: `${readiness.electorate.basis} — ${electorateBasisNote}`,
      eligible_seat_ids: readiness.electorate.seats.map((s) => s.seat_id),
      excluded_seats: readiness.electorate.excluded.map((e) => `${e.seat_id}:${e.reason}`),
      accepted_ballots: readiness.ballots.accepted.map((b) => `${b.seat_id || b.user_id}:${b.choice}:${b.method}`),
      accepted_ballot_count: readiness.ballots.accepted_count,
      rejected_ballots: [
        ...readiness.ballots.ineligible.map((b) => `${b.seat_id || b.user_id}:ineligible`),
        ...readiness.ballots.duplicates.map((b) => `${b.seat_id || b.user_id}:duplicate`),
        ...readiness.ballots.malformed.map((b) => `${b.vote_id}:malformed`),
        // Ballots bound to ANOTHER round are recorded as rejected here, so a ballot from another
        // round is visible in the package instead of being silently dropped.
        ...roundCtx.out_of_round_votes.map((v) => `${v.voter_membership_id || v.voter_user_id || v.id}:out_of_round`),
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
      const notifParams = (roundCtx.memberships || [])
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
      frozen_round: {
        id: roundCtx.round.id, round: roundCtx.round.round || 1,
        eligible_count: roundCtx.round.eligible_count ?? null,
        frozen_on: roundCtx.round.frozen_on || null,
        eligibility_policy_version: roundCtx.round.eligibility_policy_version || null,
        proposal_version: roundCtx.round.proposal_version || null,
      },
      ballots_in_round: roundCtx.ballots.length,
      ballots_out_of_round: roundCtx.out_of_round_votes.length,
      round_binding: {
        bound_to: boundTo,
        round_id: roundCtx.round.id,
        round_status: roundCtx.round_status,
        superseded_by: roundCtx.superseded_by,
      },
      electorate_basis: electorateBasisNote,
      assurance: ASSURANCE,
      issuance: issuanceVerdict({ decision: { ...decision, status: 'issued', issued_at: issuedAt }, stored: snapshot, recomputed: readiness, manifest_check: await verifyStoredManifest(snapshot) }),
      proof_chain: buildProofChain(issuedAt),
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}