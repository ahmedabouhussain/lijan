import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { dispatchNotification, dispatchBatch, type NotificationParams } from '../../shared/notificationEngine.ts';

// DispatchNotification — HTTP entry point for the notification engine.
// Creates an outbox entry and dispatches via the appropriate channel.
// Supports single dispatch and batch dispatch.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { recipients, ...params } = body;

    // Batch mode: if recipients array provided, dispatch to each
    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      const paramsList: NotificationParams[] = recipients.map((r) => ({
        ...params,
        recipient_user_id: r.user_id || r.recipient_user_id,
        recipient_email: r.email,
        recipient_name: r.name,
      }));
      const result = await dispatchBatch(base44, paramsList);
      return Response.json({ status: 'ok', ...result });
    }

    // Single mode
    if (!params.recipient_user_id && !params.recipient_email) {
      return Response.json({ error: 'recipient_user_id or recipient_email is required' }, { status: 400 });
    }
    if (!params.event_type) {
      return Response.json({ error: 'event_type is required' }, { status: 400 });
    }
    if (!params.organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    const result = await dispatchNotification(base44, params);
    return Response.json({ status: 'ok', ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}