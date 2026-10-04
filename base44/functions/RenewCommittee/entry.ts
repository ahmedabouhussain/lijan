import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// RenewCommittee — renews a closing/closed committee with a new term.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, new_term_start, new_term_end, reason } = body;

    if (!committee_id || !new_term_start || !new_term_end || !reason) {
      return Response.json({ error: 'committee_id, new_term_start, new_term_end, and reason are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: the committee record is the target itself.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    if (!['closing', 'closed', 'expiring_soon', 'temporarily_suspended'].includes(committee.status)) {
      return Response.json({ error: `Cannot renew a committee in '${committee.status}' status` }, { status: 400 });
    }

    if (new Date(new_term_end) <= new Date(new_term_start)) {
      return Response.json({ error: 'Term end must be after term start' }, { status: 400 });
    }

    const oldStatus = committee.status;
    await base44.asServiceRole.entities.Committee.update(committee_id, {
      status: 'active',
      term_start: new_term_start,
      term_end: new_term_end,
      version: (committee.version || 1) + 1,
      governance_complete: true,
    });

    await base44.asServiceRole.entities.CommitteeLifecycleEvent.create({
      organization_id: auth.organization_id,
      committee_id,
      event_type: 'renewed',
      actor_name: auth.user.full_name || auth.user.email,
      actor_user_id: auth.user.id,
      reason,
      occurred_at: new Date().toISOString(),
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'renew', entity_type: 'Committee', entity_id: committee_id,
      entity_title: committee.name_ar || committee.name_en,
      description: `Committee renewed: ${oldStatus} → active (${new_term_start} to ${new_term_end})`,
      old_value: oldStatus, new_value: 'active',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', committee_id, new_status: 'active', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}