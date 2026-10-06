import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import { dispatchNotification } from '../../shared/notificationEngine.ts';
import {
  ACCEPTANCE_REQUIRES_PROGRESS,
  EVIDENCE_ACCEPTANCE_VERSION,
  EVIDENCE_TRANSITIONS,
  RETURN_REASON_MIN_LENGTH,
  refusal,
} from '../../shared/evidenceAcceptance.ts';

// ReviewActionEvidence — the INDEPENDENT VERIFIER accepts the submitted evidence, or returns it with
// a stated reason so the owner can correct it and submit again.
//
// `action.verify` is its own operational right (chair, secretary — and a delegate under an active
// delegation). The command guard carries two structural gates read from the acceptance contract:
//   • the record must hold a submission awaiting a verdict (`verification_state = submitted`);
//   • the judging seat must not be the evidence submitter or the action owner — separation of duty,
//     enforced for every role, not only for plain members.
// The verdict is bound to the REVISION it judged, so a verdict can never be applied to content that
// arrived later. Acceptance marks the evidence verified; it does NOT close the action — closure stays
// a separate accountable act resting on this verdict.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, verdict, notes, return_reason } = body;

    if (!action_id) return Response.json({ error: 'action_id is required' }, { status: 400 });
    if (verdict !== 'accepted' && verdict !== 'returned') return refusalResponse2(refusal('not_a_verdict'));

    const auth = await authorizeCommand(base44, {
      capability: EVIDENCE_TRANSITIONS.verdict.capability,
      target_type: 'Action',
      target_id: action_id,
      ...requestClaims(body),
    });
    if (!auth.allowed) return refusalResponse(auth);
    const action = auth.target;

    const revision = Number(action.evidence_revision || 0);
    if (!action.evidence_url || (action.verification_state || 'not_submitted') !== 'submitted') {
      return refusalResponse2(refusal('evidence_missing', { verification_state: action.verification_state || 'not_submitted' }));
    }
    if (verdict === 'accepted') {
      const progress = Number(action.progress_percent || 0);
      if (progress < ACCEPTANCE_REQUIRES_PROGRESS) {
        return refusalResponse2(refusal('progress_incomplete', { progress_percent: progress }));
      }
    }
    const reason = typeof return_reason === 'string' ? return_reason.trim() : '';
    if (verdict === 'returned' && reason.length < RETURN_REASON_MIN_LENGTH) {
      return refusalResponse2(refusal('return_reason_required'));
    }

    // One verdict per judged revision: a second simultaneous verdict, or a retry of this one, is refused
    // rather than applied twice — and a verdict can never be bound to a later submission.
    const key = `action.evidence.verdict:${action_id}:r${revision}`;
    const claim = await claimTransition(base44, {
      key,
      command: 'ReviewActionEvidence',
      entity_type: 'Action',
      entity_id: action_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'A verdict is already recorded for this evidence revision');

    const actorName = auth.user.full_name || auth.user.email;
    const now = new Date().toISOString();
    const updateData: Record<string, any> = verdict === 'accepted'
      ? {
        verification_state: EVIDENCE_TRANSITIONS.verdict.accept,
        compliance_verified: true,
        verification_notes: notes || 'Evidence verified against the submitted revision',
        verified_by_user_id: auth.user.id,
        verified_by_name: actorName,
        verified_at: now,
        status: 'verified',
        return_reason: null,
        evidence_returned_at: null,
        last_verification_key: key,
        verification_correlation_id: auth.correlation_id,
      }
      : {
        verification_state: EVIDENCE_TRANSITIONS.verdict.return,
        compliance_verified: false,
        verification_notes: notes || null,
        return_reason: reason,
        evidence_returned_at: now,
        returned_by_user_id: auth.user.id,
        returned_by_name: actorName,
        status: 'evidence_pending',
        last_verification_key: key,
        verification_correlation_id: auth.correlation_id,
      };

    await base44.asServiceRole.entities.Action.update(action_id, updateData);

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: actorName, actor_email: auth.user.email,
      action: verdict === 'accepted' ? 'action.evidence.accept' : 'action.evidence.return',
      entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: verdict === 'accepted'
        ? `Evidence accepted (revision ${revision}) — verified by ${actorName}; closure remains a separate act`
        : `Evidence returned for correction (revision ${revision}): ${reason}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    await completeTransition(base44, claim.claim_id, { result_ref: action_id });

    if (action.owner_user_id && action.owner_user_id !== auth.user.id) {
      try {
        const deepLink = `/o/${auth.organization_id}/c/${action.committee_id}/actions`;
        await dispatchNotification(base44, {
          organization_id: auth.organization_id,
          committee_id: action.committee_id,
          recipient_user_id: action.owner_user_id,
          recipient_name: action.owner_name || '',
          event_type: 'action_reminder',
          context: {
            action_title: action.title,
            status: verdict === 'accepted' ? 'verified' : 'evidence_pending',
            actor_name: actorName,
            message: verdict === 'accepted'
              ? `قُبل دليل إجرائك «${action.title}» (رقعة ${revision}) من متحقّق مستقل`
              : `أُعيد دليل إجرائك «${action.title}» للتعديل: ${reason}`,
            deep_link: deepLink,
          },
          source_entity_type: 'Action',
          source_entity_id: action_id,
          source_title: action.title,
          priority: verdict === 'returned' ? 'high' : 'normal',
          correlation_id: auth.correlation_id,
          actor_name: actorName,
          deep_link: deepLink,
          transition_id: key,
          idempotency_key: `${key}:owner`,
        });
      } catch (_e) { /* delivery state lives in the outbox */ }
    }

    return Response.json({
      status: 'ok', action_id, verdict, verification_state: updateData.verification_state,
      evidence_revision: revision, contract_version: EVIDENCE_ACCEPTANCE_VERSION, correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message, code: 'unexpected_error', contract_version: EVIDENCE_ACCEPTANCE_VERSION }, { status: 500 });
  }
}

function refusalResponse2(r) {
  return Response.json(
    { error: r.reason, error_ar: r.reason_ar, code: r.code, contract_version: r.contract_version },
    { status: r.status },
  );
}