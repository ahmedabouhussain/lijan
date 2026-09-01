import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ActivateCommittee — wraps TransitionCommitteeStatus for the specific activation path.
// Performs the full activation readiness gate.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, reason } = body;

    if (!committee_id) return Response.json({ error: 'committee_id is required' }, { status: 400 });

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.activate' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    if (committee.organization_id !== auth.organization_id) {
      return Response.json({ error: 'Committee not found' }, { status: 404 });
    }

    // Activation readiness gate
    const readinessErrors = [];
    if (!committee.mandate && !committee.mandate_id) readinessErrors.push('mandate');
    if (!committee.chair_name) readinessErrors.push('chair assignment');
    if (!committee.secretary_name) readinessErrors.push('secretary assignment');
    if (!committee.quorum_count || committee.quorum_count < 1) readinessErrors.push('quorum rule');
    if (!committee.voting_rule) readinessErrors.push('voting rule');
    if (!committee.term_start || !committee.term_end) readinessErrors.push('valid term dates');
    if (!committee.classification) readinessErrors.push('classification');

    const members = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id, status: 'active' }).catch(() => []);
    if (!members || members.length < (committee.quorum_count || 3)) {
      readinessErrors.push(`minimum membership (${committee.quorum_count || 3} required, ${members?.length || 0} active)`);
    }

    if (readinessErrors.length > 0) {
      return Response.json({ error: 'Activation readiness not satisfied', missing: readinessErrors }, { status: 400 });
    }

    const oldStatus = committee.status;
    const newVersion = (committee.version || 1) + 1;
    await base44.asServiceRole.entities.Committee.update(committee_id, {
      status: 'active', version: newVersion, governance_complete: true,
    });

    // Lifecycle event
    await base44.asServiceRole.entities.CommitteeLifecycleEvent.create({
      organization_id: auth.organization_id, committee_id,
      event_type: 'activated', from_status: oldStatus, to_status: 'active',
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email,
      reason: reason || 'Activation approved', effective_date: new Date().toISOString().split('T')[0],
      correlation_id: auth.correlation_id, occurred_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'activate', entity_type: 'Committee', entity_id: committee_id,
      entity_title: committee.name_ar || committee.name_en,
      description: `Committee activated: ${oldStatus} → active${reason ? ` (${reason})` : ''}`,
      old_value: oldStatus, new_value: 'active',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', committee_id, old_status: oldStatus, new_status: 'active', version: newVersion, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}