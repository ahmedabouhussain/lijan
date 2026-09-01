import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// AdjournMeeting — transitions an in_progress meeting to adjourned.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { meeting_id, next_meeting_date } = body;

    if (!meeting_id) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    const meeting = await base44.asServiceRole.entities.Meeting.get(meeting_id);
    if (!meeting) return Response.json({ error: 'Meeting not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: meeting.committee_id, capability: 'meeting.start' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    if (meeting.status !== 'in_progress') {
      return Response.json({ error: `Cannot adjourn a meeting in '${meeting.status}' status` }, { status: 400 });
    }

    await base44.asServiceRole.entities.Meeting.update(meeting_id, { status: 'adjourned' });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: meeting.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'adjourn', entity_type: 'Meeting', entity_id: meeting_id,
      entity_title: meeting.title,
      description: `Meeting adjourned${next_meeting_date ? ` — next meeting: ${next_meeting_date}` : ''}`,
      old_value: 'in_progress', new_value: 'adjourned',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', meeting_id, new_status: 'adjourned', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}