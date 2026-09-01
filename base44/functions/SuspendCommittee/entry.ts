import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// SuspendCommittee — temporarily suspends an active committee with documented reason.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, reason } = body;

    if (!committee_id || !reason) {
      return Response.json({ error: 'committee_id and reason are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.activate' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

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

    return Response.json({ status: 'ok', committee_id, new_status: 'temporarily_suspended', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}