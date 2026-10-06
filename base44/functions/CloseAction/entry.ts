import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import { dispatchNotification } from '../../shared/notificationEngine.ts';

// CloseAction — closes an action after evidence verification.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, compliance_notes } = body;

    if (!action_id) return Response.json({ error: 'action_id is required' }, { status: 400 });

    // Authority on a TRUSTED target: the committee is derived from the action record itself, and
    // the parent chain (action → decision / meeting → committee) must agree before it is used.
    // Closing is an ACCEPTANCE act, not general administration: `action.close` is held by the chair
    // (and by a delegate under an active delegation). It also carries the permitted-state gate, so an
    // action already verified or closed can never be closed a second time.
    const auth = await authorizeCommand(base44, {
      capability: 'action.close',
      target_type: 'Action',
      target_id: action_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const action = auth.target;
    // The gate that makes closure mean something is STRUCTURAL, not advisory: `action.close` now
    // carries a required state read from evidence-acceptance-1.0.0 — the record must hold a verdict
    // ACCEPTED by an independent verifier. A reported percentage together with an attachment can no
    // longer pass for verification, and the refusal names the requirement (D-046).

    // Exclusivity on CLOSURE: a second simultaneous closure would write twice and notify twice.
    const claim = await claimTransition(base44, {
      key: `action.close:${action_id}`,
      command: 'CloseAction',
      entity_type: 'Action',
      entity_id: action_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'This action is already closed or its closure is in progress');

    await base44.asServiceRole.entities.Action.update(action_id, {
      status: 'closed',
      closed_at: new Date().toISOString(),
      closed_by_user_id: auth.user.id,
      closed_by_name: auth.user.full_name || auth.user.email,
      // The verdict already marked the evidence verified; closure records the accountable act and
      // never re-writes the verification fields it did not judge.
      compliance_notes: compliance_notes || action.compliance_notes || 'Execution closed on accepted evidence',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'action.close', entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: `Action closed on accepted evidence revision ${Number(action.evidence_revision || 0)} (verified by ${action.verified_by_name || 'an independent verifier'})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    await completeTransition(base44, claim.claim_id, { result_ref: action_id });

    // Notify the action owner that their action has been closed/verified
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
            status: 'closed',
            actor_name: auth.user.full_name || auth.user.email,
            message: `أُغلق إجراءك «${action.title}» بعد قبول دليله من متحقّق مستقل`,
            deep_link: deepLink,
          },
          source_entity_type: 'Action',
          source_entity_id: action_id,
          source_title: action.title,
          priority: 'normal',
          correlation_id: auth.correlation_id,
          actor_name: auth.user.full_name || auth.user.email,
          deep_link: deepLink,
        });
      } catch {}
    }

    return Response.json({ status: 'ok', action_id, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}