import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { attemptOutboxDelivery, aggregateNoticeState } from '../../shared/notificationEngine.ts';

// RetryEscalationNotice — re-attempt the delivery of a notice that belongs to an escalation
// that is ALREADY confirmed.
//
// Rules this function enforces:
//   • The escalation level is never moved: the retry cannot create a second transition, and
//     the response says so explicitly (`level_unchanged`).
//   • No second notice is created: the failed rows of the same transition are retried in
//     place, keeping their attempt count and their correlation with the transition.
//   • A repeated retry request with the same key returns `duplicate` and touches nothing.
//   • Only an actor holding the committee's action authority may retry.

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const actionId = typeof body.action_id === 'string' ? body.action_id : '';
    const requestedKey = typeof body.idempotency_key === 'string' ? body.idempotency_key.trim().slice(0, 120) : '';

    if (!actionId) return Response.json({ error: 'action_id is required' }, { status: 400 });

    const action = await base44.asServiceRole.entities.Action.get(actionId).catch(() => null);
    if (!action) return Response.json({ error: 'Action not found' }, { status: 404 });

    // Authority on a TRUSTED target: the committee is derived from the action record itself.
    const auth = await authorizeCommand(base44, {
      capability: 'action.admin',
      target_type: 'Action',
      target_id: action.id,
      claimed_committee_id: action.committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const transitionId = action.escalation_transition_id;
    if (!transitionId) {
      return Response.json(
        { status: 'nothing_to_retry', error: 'This action has no confirmed escalation to notify' },
        { status: 409 },
      );
    }

    // Only the notices of THIS transition, and only those that are not yet delivered.
    const found = await base44.asServiceRole.entities.NotificationOutbox.filter(
      {
        source_entity_id: actionId,
        transition_id: transitionId,
        status: { $in: ['failed', 'queued', 'dispatching', 'retry_scheduled'] },
      },
      { limit: 50 },
    );
    const pending = Array.isArray(found) ? found : (found?.items || []);

    if (pending.length === 0) {
      return Response.json(
        {
          status: 'nothing_to_retry',
          notice_state: action.escalation_notice_state || 'not_required',
          correlation_id: auth.correlation_id,
        },
        { status: 409 },
      );
    }

    // Idempotency: the same retry request twice is one retry.
    const retryKey = requestedKey || `${transitionId}:retry:${pending[0].attempt_count || 0}`;
    if (pending.every((row: any) => row.last_retry_key === retryKey)) {
      return Response.json({
        status: 'duplicate',
        already_applied: true,
        unchanged: true,
        action_id: actionId,
        level_unchanged: true,
        escalation_level: action.escalation_level || 'none',
        notice_state: action.escalation_notice_state || 'failed',
        retry_key: retryKey,
        correlation_id: auth.correlation_id,
      });
    }

    // The notice is being re-attempted — say so rather than leaving a stale state.
    await base44.asServiceRole.entities.Action.updateMany(
      { id: actionId, escalation_transition_id: transitionId },
      { $set: { escalation_notice_state: 'retry_scheduled' } },
    );

    const delivery = [];
    for (const row of pending) {
      await base44.asServiceRole.entities.NotificationOutbox
        .update(row.id, { last_retry_key: retryKey })
        .catch(() => {});
      const res = await attemptOutboxDelivery(base44, row);
      delivery.push({
        name: row.recipient_name || row.recipient_email || null,
        role: null,
        entity: row.source_title || null,
        status: res.status,
        failure_reason: res.failure_reason,
        attempt_count: res.attempt_count,
        next_retry_at: res.next_retry_at,
        outbox_id: res.outbox_id,
      });
    }

    const noticeState = aggregateNoticeState(delivery.map((d) => d.status));
    await base44.asServiceRole.entities.Action.updateMany(
      { id: actionId, escalation_transition_id: transitionId },
      { $set: { escalation_notice_state: noticeState } },
    );

    const deliveredCount = delivery.filter((d) => d.status === 'delivered').length;
    const failedCount = delivery.filter((d) => d.status === 'failed').length;

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'escalation_notice_retry', entity_type: 'Action', entity_id: actionId, entity_title: action.title,
      old_value: action.escalation_notice_state || 'failed', new_value: noticeState,
      description: `Notice re-attempted for transition ${transitionId}: ${deliveredCount} delivered, ${failedCount} failed`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      action_id: actionId,
      level_unchanged: true,
      escalation_level: action.escalation_level || 'none',
      notice_state: noticeState,
      notice_transition_id: transitionId,
      retry_key: retryKey,
      delivered_count: deliveredCount,
      failed_count: failedCount,
      delivery,
      failure_reason: delivery.find((d) => d.failure_reason)?.failure_reason || null,
      next_retry_at: delivery.find((d) => d.next_retry_at)?.next_retry_at || null,
      retry_available: failedCount > 0,
      correlation_id: auth.correlation_id,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}