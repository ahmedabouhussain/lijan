import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// CloseCommittee — initiates or completes committee closure.
// Blocks closure if unresolved records exist.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, reason, initiate_only } = body;

    if (!committee_id) return Response.json({ error: 'committee_id is required' }, { status: 400 });

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.close' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    // If initiate_only, just transition to closing
    if (initiate_only) {
      await base44.asServiceRole.entities.Committee.update(committee_id, { status: 'closing' });
      await base44.asServiceRole.entities.CommitteeLifecycleEvent.create({
        organization_id: auth.organization_id, committee_id,
        event_type: 'closure_initiated', from_status: committee.status, to_status: 'closing',
        actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email,
        reason: reason || 'Closure initiated', occurred_at: new Date().toISOString(),
        correlation_id: auth.correlation_id,
      });
      return Response.json({ status: 'ok', committee_id, new_status: 'closing', correlation_id: auth.correlation_id });
    }

    // Full closure — check for blocking records
    const blockingErrors = [];

    const openDecisions = await base44.asServiceRole.entities.Decision
      .filter({ committee_id, status: { $in: ['draft', 'in_review', 'proposed', 'voting'] } }).catch(() => []);
    if (openDecisions && openDecisions.length > 0) blockingErrors.push(`${openDecisions.length} open decisions`);

    const openActions = await base44.asServiceRole.entities.Action
      .filter({ committee_id, status: { $nin: ['closed', 'verified'] } }).catch(() => []);
    if (openActions && openActions.length > 0) blockingErrors.push(`${openActions.length} open actions`);

    const upcomingMeetings = await base44.asServiceRole.entities.Meeting
      .filter({ committee_id, status: 'scheduled' }).catch(() => []);
    if (upcomingMeetings && upcomingMeetings.length > 0) blockingErrors.push(`${upcomingMeetings.length} scheduled meetings`);

    if (blockingErrors.length > 0) {
      return Response.json({ error: 'Cannot close committee with unresolved records', blocking: blockingErrors }, { status: 400 });
    }

    const oldStatus = committee.status;
    await base44.asServiceRole.entities.Committee.update(committee_id, {
      status: 'closed', version: (committee.version || 1) + 1,
    });

    await base44.asServiceRole.entities.CommitteeLifecycleEvent.create({
      organization_id: auth.organization_id, committee_id,
      event_type: 'closed', from_status: oldStatus, to_status: 'closed',
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email,
      reason: reason || 'Committee closed', occurred_at: new Date().toISOString(),
      correlation_id: auth.correlation_id,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'committee.close', entity_type: 'Committee', entity_id: committee_id,
      entity_title: committee.name_ar || committee.name_en,
      description: `Committee closed: ${reason || 'all records resolved'}`,
      old_value: oldStatus, new_value: 'closed',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', committee_id, new_status: 'closed', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}