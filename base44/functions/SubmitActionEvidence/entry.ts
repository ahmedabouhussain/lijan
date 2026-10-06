import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';
import {
  EVIDENCE_ACCEPTANCE_VERSION,
  EVIDENCE_TRANSITIONS,
  MAX_EVIDENCE_URL_LENGTH,
  refusal,
} from '../../shared/evidenceAcceptance.ts';

// SubmitActionEvidence — the PERFORMER submits evidence for an execution action.
//
// This is the act that was missing entirely: before it, evidence was attached by whoever held the
// closure right, and the same act then wrote `compliance_verified: true`. Now submitting is separate
// from verifying, and it is never a verdict:
//   • the right exercised is `action.progress` — the performer's own right. A plain member seat is
//     bound by the command guard to the action assigned to it, so a member cannot submit for someone
//     else; the offices that administer execution may submit on behalf of an action with no owner.
//   • the state it may start from comes from the acceptance contract, so an ACCEPTED verdict is never
//     overwritten by a later upload.
//   • the submission is bound to a REVISION, and the verdict that follows judges exactly that content.
//   • a repeated request is the SAME submission (one revision, one notice), never a second one.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, evidence_url, notes, progress_percent } = body;

    if (!action_id) return Response.json({ error: 'action_id is required' }, { status: 400 });
    if (!isHttpUrl(evidence_url)) return refusalResponse2(refusal('invalid_evidence_url'));

    const auth = await authorizeCommand(base44, {
      capability: EVIDENCE_TRANSITIONS.submit.capability,
      target_type: 'Action',
      target_id: action_id,
      ...requestClaims(body),
    });
    if (!auth.allowed) return refusalResponse(auth);
    const action = auth.target;

    const state = action.verification_state || 'not_submitted';
    if (!EVIDENCE_TRANSITIONS.submit.from.includes(state)) {
      return refusalResponse2(refusal('already_accepted', {
        verification_state: state,
        evidence_revision: Number(action.evidence_revision || 0),
      }));
    }

    const revision = Number(action.evidence_revision || 0) + 1;
    const actorName = auth.user.full_name || auth.user.email;

    // A retry of the SAME submission while it awaits a verdict is the same revision, not a new one.
    const sameSubmission = state === 'submitted'
      && (action.evidence_url || '') === evidence_url
      && (action.evidence_submitted_by_user_id || null) === auth.user.id;
    if (sameSubmission) {
      return Response.json({
        status: 'ok', action_id, evidence_revision: revision - 1, verification_state: 'submitted',
        idempotent: true, contract_version: EVIDENCE_ACCEPTANCE_VERSION, correlation_id: auth.correlation_id,
      });
    }

    // Exclusivity: two simultaneous submissions of the same revision would write twice and notify twice.
    const key = `action.evidence.submit:${action_id}:r${revision}`;
    const claim = await claimTransition(base44, {
      key,
      command: 'SubmitActionEvidence',
      entity_type: 'Action',
      entity_id: action_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'This evidence submission is already recorded');

    const updateData: Record<string, any> = {
      evidence_url,
      evidence_notes: notes || null,
      verification_state: EVIDENCE_TRANSITIONS.submit.to,
      evidence_revision: revision,
      evidence_submitted_at: new Date().toISOString(),
      evidence_submitted_by_user_id: auth.user.id,
      evidence_submitted_by_name: actorName,
      status: 'under_review',
      // A new submission carries no verdict: any earlier verdict belonged to the earlier revision.
      compliance_verified: false,
      return_reason: null,
      evidence_returned_at: null,
      last_verification_key: key,
      verification_correlation_id: auth.correlation_id,
    };
    if (progress_percent !== undefined && progress_percent !== null && progress_percent !== '') {
      updateData.progress_percent = Math.min(100, Math.max(0, Number(progress_percent) || 0));
    }

    await base44.asServiceRole.entities.Action.update(action_id, updateData);

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: actorName, actor_email: auth.user.email,
      action: 'action.evidence.submit', entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: `Evidence submitted for independent verification (revision ${revision})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    await completeTransition(base44, claim.claim_id, { result_ref: action_id });

    // The notice reaches the seats that normally carry the verification duty. A notice is not
    // authority: whether THIS actor may verify is decided by the kernel at the act, never by a notice.
    try {
      await notifyVerifiers(base44, { auth, action, revision, actorName, key });
    } catch (_e) { /* delivery is tracked in the outbox, never reported as success here */ }

    return Response.json({
      status: 'ok', action_id, evidence_revision: revision, verification_state: 'submitted',
      contract_version: EVIDENCE_ACCEPTANCE_VERSION, correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message, code: 'unexpected_error', contract_version: EVIDENCE_ACCEPTANCE_VERSION }, { status: 500 });
  }
}

function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  const url = value.trim();
  if (!url || url.length > MAX_EVIDENCE_URL_LENGTH) return false;
  return /^https?:\/\/\S+$/i.test(url);
}

function refusalResponse2(r) {
  return Response.json(
    { error: r.reason, error_ar: r.reason_ar, code: r.code, contract_version: r.contract_version },
    { status: r.status },
  );
}

async function notifyVerifiers(base44, { auth, action, revision, actorName, key }) {
  const memberships = await base44.asServiceRole.entities.CommitteeMembership
    .filter({ committee_id: action.committee_id, status: 'active', role: { $in: ['chair', 'secretary'] } })
    .catch(() => []);
  const deepLink = `/o/${auth.organization_id}/c/${action.committee_id}/actions`;
  const params = (memberships || [])
    .filter((m) => m.user_id && m.user_id !== auth.user.id)
    .map((m) => ({
      organization_id: auth.organization_id,
      committee_id: action.committee_id,
      recipient_user_id: m.user_id,
      recipient_email: m.user_email || undefined,
      recipient_name: m.full_name_ar || m.full_name || '',
      event_type: 'action_reminder',
      context: {
        action_title: action.title,
        new_status: 'under_review',
        actor_name: actorName,
        message: `دليل مُقدَّم للإجراء «${action.title}» (رقعة ${revision}) بانتظار تحقق مستقل`,
        deep_link: deepLink,
      },
      source_entity_type: 'Action',
      source_entity_id: action.id,
      source_title: action.title,
      priority: 'normal',
      correlation_id: auth.correlation_id,
      actor_name: actorName,
      deep_link: deepLink,
      transition_id: key,
      idempotency_key: key,
    }));
  if (params.length > 0) await dispatchBatch(base44, params);
}