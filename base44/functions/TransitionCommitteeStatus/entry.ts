import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// TransitionCommitteeStatus — the first governed backend command.
// Verifies: auth, org membership, effective role, committee scope, current state,
// expected version, activation readiness, mandate, chair, secretary, quorum, voting, dates, classification.
// Replaces the unsafe direct client activateCommittee update.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, target_status, expected_version, reason } = body;

    if (!committee_id || !target_status) {
      return Response.json({ error: 'committee_id and target_status are required' }, { status: 400 });
    }

    // Resolve authority server-side
    // Authority on a TRUSTED target: a lifecycle transition is a MANAGEMENT act on the committee
    // record — never the activation right, which is bound to the pre-activation states.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    // Fetch committee
    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    if (!committee) {
      return Response.json({ error: 'Committee not found' }, { status: 404 });
    }

    // Verify organization scope (skip for platform admin oversight)
    if (auth.effective_role !== 'platform_admin' && committee.organization_id !== auth.organization_id) {
      return Response.json({ error: 'Committee not found' }, { status: 404 });
    }

    // Optimistic version check
    if (expected_version !== undefined && committee.version !== expected_version) {
      return Response.json({ error: 'Stale record — someone else modified this committee', status: 'conflict' }, { status: 409 });
    }

    // State machine validation
    const allowedTransitions = {
      draft: ['pending_activation', 'active'],
      pending_activation: ['active', 'draft'],
      active: ['temporarily_suspended', 'closing'],
      temporarily_suspended: ['active'],
      closing: ['closed'],
      closed: ['archived'],
    };
    const allowed = (allowedTransitions[committee.status] || []).includes(target_status);
    if (!allowed) {
      return Response.json({ error: `Cannot transition from '${committee.status}' to '${target_status}'` }, { status: 400 });
    }

    // Activation readiness gate
    if (target_status === 'active') {
      const readinessErrors = [];
      if (!committee.mandate && !committee.mandate_id) readinessErrors.push('mandate');
      if (!committee.chair_name) readinessErrors.push('chair assignment');
      if (!committee.secretary_name) readinessErrors.push('secretary assignment');
      if (!committee.quorum_count || committee.quorum_count < 1) readinessErrors.push('quorum rule');
      if (!committee.voting_rule) readinessErrors.push('voting rule');
      if (!committee.term_start || !committee.term_end) readinessErrors.push('valid term dates');
      if (!committee.classification) readinessErrors.push('classification');

      // Verify members exist
      const members = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id, status: 'active' })
        .catch(() => []);
      if (!members || members.length < (committee.quorum_count || 3)) {
        readinessErrors.push(`minimum membership (${committee.quorum_count || 3} required, ${members?.length || 0} active)`);
      }

      if (readinessErrors.length > 0) {
        return Response.json({
          error: 'Committee activation readiness not satisfied',
          missing: readinessErrors,
        }, { status: 400 });
      }
    }

    // Execute transition
    const oldStatus = committee.status;
    const newVersion = (committee.version || 1) + 1;
    await base44.asServiceRole.entities.Committee.update(committee_id, {
      status: target_status,
      version: newVersion,
      governance_complete: target_status === 'active',
    });

    // Audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id,
      actor_user_id: auth.user.id,
      actor_name: auth.user.full_name || auth.user.email,
      actor_email: auth.user.email,
      action: 'activate',
      entity_type: 'Committee',
      entity_id: committee_id,
      entity_title: committee.name_ar || committee.name_en,
      description: `Status transition: ${oldStatus} → ${target_status}${reason ? ` (${reason})` : ''}`,
      old_value: oldStatus,
      new_value: target_status,
      correlation_id: auth.correlation_id,
      authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      committee_id,
      old_status: oldStatus,
      new_status: target_status,
      version: newVersion,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}