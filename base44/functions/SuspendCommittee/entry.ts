import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';

// SuspendCommittee — temporarily suspends an active committee with documented reason.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, reason } = body;

    if (!committee_id || !reason) {
      return Response.json({ error: 'committee_id and reason are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: suspension is a MANAGEMENT act on the committee record — it is
    // not activation, and it must not borrow the activation right.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    if (committee.status !== 'active') {
      return Response.json({ error: `Cannot suspend a committee in '${committee.status}' status` }, { status: 400 });
    }

    const oldStatus = committee.status;
    await base44.asServiceRole.entities.Committee.update(committee_id, {
      status: 'temporarily_suspended',
      version: (committee.version || 1) + 1,
      governance_complete: false,
    });

    await base44.asServiceRole.entities.CommitteeLifecycleEvent.create({
      organization_id: auth.organization_id,
      committee_id,
      event_type: 'suspended',
      actor_name: auth.user.full_name || auth.user.email,
      actor_user_id: auth.user.id,
      reason,
      occurred_at: new Date().toISOString(),
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'suspend', entity_type: 'Committee', entity_id: committee_id,
      entity_title: committee.name_ar || committee.name_en,
      description: `Committee suspended: ${reason}`,
      old_value: oldStatus, new_value: 'temporarily_suspended',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify all committee members that the committee has been suspended
    try {
      const members = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id, status: 'active' }).catch(() => []);
      const actorName = auth.user.full_name || auth.user.email;
      const deepLink = `/o/${auth.organization_id}/c/${committee_id}`;
      const notifParams = (members || [])
        .filter((m) => m.user_id && m.user_id !== auth.user.id)
        .map((m) => ({
          organization_id: auth.organization_id,
          committee_id,
          recipient_user_id: m.user_id,
          recipient_name: m.full_name || m.full_name_ar || '',
          event_type: 'committee_suspended',
          context: {
            committee_name: committee.name_ar || committee.name_en || '',
            reason,
            actor_name: actorName,
            message: `تم تعليق اللجنة: ${committee.name_ar || committee.name_en} — السبب: ${reason}`,
            deep_link: deepLink,
          },
          source_entity_type: 'Committee',
          source_entity_id: committee_id,
          source_title: committee.name_ar || committee.name_en,
          priority: 'urgent',
          correlation_id: auth.correlation_id,
          actor_name: actorName,
          deep_link: deepLink,
        }));
      if (notifParams.length > 0) {
        await dispatchBatch(base44, notifParams);
      }
    } catch {}

    return Response.json({ status: 'ok', committee_id, new_status: 'temporarily_suspended', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}