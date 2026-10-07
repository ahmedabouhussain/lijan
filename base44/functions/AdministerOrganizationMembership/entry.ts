import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  ORG_MEMBER_ACTIONS, ORG_AUTHORITY_REFUSALS,
  orgRefusal, orgAuthorityResponse, orgCorrelation, resolveOrganizationAuthority,
} from '../../shared/organizationAuthority.ts';

// AdministerOrganizationMembership — the ONE route that changes a membership of an institution.
//
// Replaces a direct client write (`OrganizationMembership.update` from the administration screen), where
// the only gate was RLS keyed on the session's selected organization (`user.data.active_org_id`). That
// made the selection, not the target institution, the authorising fact, and it let a refusal be reported
// nowhere but the browser console (D-116).
//
// Here: the membership row IS the trusted target; authority is derived from active membership rows of
// that same institution; a person cannot administer their own access; an owner is protected from every
// non-owner; the change is attributed, correlated and audited; and every stop is returned as a named
// refusal in both languages.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { membership_id, action, reason = null } = body;

    if (!membership_id || !action) {
      return Response.json({ error: 'membership_id and action are required', recognized: Object.keys(ORG_MEMBER_ACTIONS), contract_version: 'organization-authority-1.0.0' }, { status: 400 });
    }
    if (!Object.keys(ORG_MEMBER_ACTIONS).includes(action)) {
      return orgAuthorityResponse(orgRefusal('invalid_action', { status: 400 }));
    }

    const user = await base44.auth.me().catch(() => null);
    if (!user) return orgAuthorityResponse(orgRefusal('unauthenticated', { status: 401 }));

    const correlation_id = orgCorrelation();

    let membership;
    try {
      membership = await sr.entities.OrganizationMembership.get(membership_id);
    } catch (e) {
      if (e && e.status === 404) return orgAuthorityResponse(orgRefusal('target_not_found', { status: 404, correlation_id }));
      return orgAuthorityResponse(orgRefusal('authority_unavailable', { status: 503, correlation_id }));
    }
    if (!membership) return orgAuthorityResponse(orgRefusal('target_not_found', { status: 404, correlation_id }));

    // Authority over the institution THIS ROW belongs to — never the portal in view, never the body.
    const auth = await resolveOrganizationAuthority({
      sr, callerUser: user, organization_id: membership.organization_id, required: 'admin', correlation_id,
    });
    if (!auth.allowed) return orgAuthorityResponse(auth);

    if (membership.user_id === user.id) {
      return orgAuthorityResponse(orgRefusal('self_action_refused', { status: 403, correlation_id }));
    }
    if (membership.role === 'owner' && auth.role !== 'owner') {
      return orgAuthorityResponse(orgRefusal('owner_protected', { status: 403, correlation_id }));
    }

    const next = ORG_MEMBER_ACTIONS[action];
    if (membership.status === next) {
      return orgAuthorityResponse(orgRefusal('target_already_in_state', { status: 409, correlation_id, current_status: membership.status }));
    }

    const now = new Date().toISOString();
    const patch: Record<string, any> = { status: next };
    if (next === 'suspended') patch.suspended_at = now;
    if (next === 'active') patch.suspended_at = null;

    const updated = await sr.entities.OrganizationMembership.update(membership.id, patch);

    await sr.entities.AuditEvent.create({
      organization_id: membership.organization_id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: `organization.membership_${action}`,
      entity_type: 'OrganizationMembership',
      entity_id: membership.id,
      entity_title: membership.user_name || membership.user_email || membership.user_id,
      description: `Membership of ${membership.user_email || membership.user_id} set to ${next} by ${auth.role} of the institution${reason ? ` — stated reason: ${reason}` : ''}`,
      correlation_id,
      authority_context: auth.authority_context,
    }).catch(() => {});

    return Response.json({
      status: 'ok',
      membership_id: membership.id,
      membership_state: next,
      previous_state: membership.status,
      organization_id: membership.organization_id,
      member_user_id: membership.user_id,
      actor_role: auth.role,
      contract_version: auth.contract_version,
      correlation_id,
      membership: updated || null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}