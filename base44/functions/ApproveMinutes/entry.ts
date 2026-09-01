import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ApproveMinutes — chair/vice_chair approves draft meeting minutes.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { minutes_id } = body;

    if (!minutes_id) return Response.json({ error: 'minutes_id is required' }, { status: 400 });

    const minutes = await base44.asServiceRole.entities.MeetingMinutes.get(minutes_id);
    if (!minutes) return Response.json({ error: 'Minutes not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: minutes.committee_id, capability: 'minutes.approve' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    if (!['draft', 'in_review'].includes(minutes.status)) {
      return Response.json({ error: `Cannot approve minutes in '${minutes.status}' status` }, { status: 400 });
    }

    await base44.asServiceRole.entities.MeetingMinutes.update(minutes_id, {
      status: 'approved',
      approved_by_name: auth.user.full_name || auth.user.email,
      approved_date: new Date().toISOString().split('T')[0],
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: minutes.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'approve', entity_type: 'MeetingMinutes', entity_id: minutes_id,
      entity_title: minutes.minutes_number || 'Meeting Minutes',
      description: `Minutes approved by ${auth.user.full_name || auth.user.email}`,
      old_value: minutes.status, new_value: 'approved',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', minutes_id, new_status: 'approved', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}