import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// StartMeeting — transitions a scheduled meeting to in_progress.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { meeting_id } = body;

    if (!meeting_id) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    const meeting = await base44.asServiceRole.entities.Meeting.get(meeting_id);
    if (!meeting) return Response.json({ error: 'Meeting not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: meeting.committee_id, capability: 'meeting.start' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    if (meeting.status !== 'scheduled') {
      return Response.json({ error: `Cannot start a meeting in '${meeting.status}' status` }, { status: 400 });
    }

    await base44.asServiceRole.entities.Meeting.update(meeting_id, { status: 'in_progress' });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: meeting.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'start', entity_type: 'Meeting', entity_id: meeting_id,
      entity_title: meeting.title,
      description: `Meeting started`,
      old_value: 'scheduled', new_value: 'in_progress',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', meeting_id, new_status: 'in_progress', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}