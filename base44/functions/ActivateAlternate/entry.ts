import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ActivateAlternate — activates an alternate member to replace a principal.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, alternate_membership_id, principal_membership_id, reason, meeting_id } = body;

    if (!committee_id || !alternate_membership_id) {
      return Response.json({ error: 'committee_id, alternate_membership_id are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.manage' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    // Activate the alternate
    await base44.asServiceRole.entities.CommitteeMembership.update(alternate_membership_id, {
      activated: true,
      status: 'active',
    });

    // Deactivate the principal if provided
    if (principal_membership_id) {
      await base44.asServiceRole.entities.CommitteeMembership.update(principal_membership_id, {
        status: 'inactive',
      });
    }

    // Record the activation
    const activation = await base44.asServiceRole.entities.AlternateActivation.create({
      organization_id: auth.organization_id,
      committee_id,
      alternate_membership_id,
      principal_membership_id: principal_membership_id || null,
      meeting_id: meeting_id || null,
      activated_by_name: auth.user.full_name || auth.user.email,
      activated_by_user_id: auth.user.id,
      reason: reason || 'Principal unavailable',
      activated_at: new Date().toISOString(),
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'alternate.activate', entity_type: 'AlternateActivation', entity_id: activation.id,
      description: `Alternate activated: ${reason || 'principal unavailable'}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', activation, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}