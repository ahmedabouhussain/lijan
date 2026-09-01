import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// CancelMeeting — governed meeting cancellation.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { meeting_id, reason } = body;

    if (!meeting_id) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    const meeting = await base44.asServiceRole.entities.Meeting.get(meeting_id);
    if (!meeting) return Response.json({ error: 'Meeting not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: meeting.committee_id, capability: 'meeting.schedule' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    if (meeting.status === 'completed') {
      return Response.json({ error: 'Cannot cancel a completed meeting' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Meeting.update(meeting_id, { status: 'cancelled' });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: meeting.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'meeting.cancel', entity_type: 'Meeting', entity_id: meeting_id,
      entity_title: meeting.title, description: `Meeting cancelled: ${reason || 'no reason given'}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', meeting_id, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}