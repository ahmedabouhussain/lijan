import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';

// ApproveMinutes — chair/vice_chair approves draft meeting minutes.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { minutes_id } = body;

    if (!minutes_id) return Response.json({ error: 'minutes_id is required' }, { status: 400 });

    // Authority on a TRUSTED target: the committee is derived from the minutes record itself, and
    // the permitted-state gate (only draft or in_review minutes may be approved) is applied here.
    const auth = await authorizeCommand(base44, {
      capability: 'minutes.approve',
      target_type: 'MeetingMinutes',
      target_id: minutes_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const minutes = auth.target;

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

    // Notify all committee members that minutes have been approved/published
    try {
      const members = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id: minutes.committee_id, status: 'active' }).catch(() => []);
      const actorName = auth.user.full_name || auth.user.email;
      const deepLink = `/o/${auth.organization_id}/c/${minutes.committee_id}/minutes`;
      const notifParams = (members || [])
        .filter((m) => m.user_id && m.user_id !== auth.user.id)
        .map((m) => ({
          organization_id: auth.organization_id,
          committee_id: minutes.committee_id,
          recipient_user_id: m.user_id,
          recipient_name: m.full_name || m.full_name_ar || '',
          event_type: 'minutes_published',
          context: {
            minutes_title: minutes.minutes_number || 'Meeting Minutes',
            actor_name: actorName,
            message: `تم اعتماد محضر الاجتماع: ${minutes.minutes_number || ''}`,
            deep_link: deepLink,
          },
          source_entity_type: 'MeetingMinutes',
          source_entity_id: minutes_id,
          source_title: minutes.minutes_number || 'Meeting Minutes',
          priority: 'normal',
          correlation_id: auth.correlation_id,
          actor_name: actorName,
          deep_link: deepLink,
        }));
      if (notifParams.length > 0) {
        await dispatchBatch(base44, notifParams);
      }
    } catch {}

    return Response.json({ status: 'ok', minutes_id, new_status: 'approved', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}