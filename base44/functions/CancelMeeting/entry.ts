import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// CancelMeeting — governed meeting cancellation.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { meeting_id, reason } = body;

    if (!meeting_id) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    // Authority on a TRUSTED target: cancellation carries its own right, and the committee is
    // derived from the meeting record itself.
    const auth = await authorizeCommand(base44, {
      capability: 'meeting.cancel',
      target_type: 'Meeting',
      target_id: meeting_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const meeting = auth.target;

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