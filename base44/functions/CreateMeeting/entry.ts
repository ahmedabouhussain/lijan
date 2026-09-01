import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// CreateMeeting — governed meeting creation inside a committee.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, title, title_ar, date, location, mode, provider, meeting_url, quorum_required } = body;

    if (!committee_id || !title || !date) {
      return Response.json({ error: 'committee_id, title, date are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'meeting.schedule' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const meeting = await base44.asServiceRole.entities.Meeting.create({
      organization_id: auth.organization_id,
      committee_id,
      title, title_ar: title_ar || null,
      date, location: location || null,
      mode: mode || 'hybrid',
      provider: provider || 'none',
      meeting_url: meeting_url || null,
      quorum_required: quorum_required || 3,
      agenda_ready: false,
      status: 'scheduled',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'meeting.create', entity_type: 'Meeting', entity_id: meeting.id,
      entity_title: title, description: `Meeting scheduled: ${date}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', meeting, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}