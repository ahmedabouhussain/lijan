import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// StartMeeting — transitions a scheduled meeting to in_progress.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { meeting_id } = body;

    if (!meeting_id) return Response.json({ error: 'meeting_id is required' }, { status: 400 });

    // Authority on a TRUSTED target: the committee is derived from the meeting record itself, and
    // the permitted-state gate (a meeting may only be started while 'scheduled') is applied here.
    const auth = await authorizeCommand(base44, {
      capability: 'meeting.start',
      target_type: 'Meeting',
      target_id: meeting_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const meeting = auth.target;

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