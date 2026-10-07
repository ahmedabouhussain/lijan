import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  ORG_STATUS_ACTIONS,
  orgRefusal, orgAuthorityResponse, orgCorrelation, resolveOrganizationAuthority,
} from '../../shared/organizationAuthority.ts';

// SetOrganizationStatus — suspending or restoring an institution, as a governed act.
//
// Replaces the direct client write from the administration screen. Suspending an institution stops its
// members' access, so it takes the OWNER's authority — resolved from the institution's own membership
// rows, not from the selected portal — and it is named in the audit trail as the act it is.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { organization_id, action, reason = null } = body;

    if (!organization_id || !action) {
      return Response.json({ error: 'organization_id and action are required', recognized: Object.keys(ORG_STATUS_ACTIONS), contract_version: 'organization-authority-1.0.0' }, { status: 400 });
    }
    if (!Object.keys(ORG_STATUS_ACTIONS).includes(action)) {
      return orgAuthorityResponse(orgRefusal('invalid_action', { status: 400 }));
    }

    const user = await base44.auth.me().catch(() => null);
    if (!user) return orgAuthorityResponse(orgRefusal('unauthenticated', { status: 401 }));

    const correlation_id = orgCorrelation();

    let organization;
    try {
      organization = await sr.entities.Organization.get(organization_id);
    } catch (e) {
      if (e && e.status === 404) return orgAuthorityResponse(orgRefusal('target_not_found', { status: 404, correlation_id }));
      return orgAuthorityResponse(orgRefusal('authority_unavailable', { status: 503, correlation_id }));
    }
    if (!organization) return orgAuthorityResponse(orgRefusal('target_not_found', { status: 404, correlation_id }));

    const next = ORG_STATUS_ACTIONS[action];
    const restoring = action === 'unsuspend';

    // Restoring a suspended institution requires the same owner authority as suspending it; authority
    // itself is resolved before that state is considered, so the check never becomes its own exemption.
    const auth = await resolveOrganizationAuthority({
      sr, callerUser: user, organization_id, required: 'owner', correlation_id,
    });
    if (!auth.allowed) return orgAuthorityResponse(auth);

    if (organization.status === next) {
      return orgAuthorityResponse(orgRefusal('target_already_in_state', { status: 409, correlation_id, current_status: organization.status }));
    }
    if (!restoring && organization.status === 'suspended') {
      return orgAuthorityResponse(orgRefusal('target_already_in_state', { status: 409, correlation_id, current_status: organization.status }));
    }

    const now = new Date().toISOString();
    const patch: Record<string, any> = { status: next };
    if (next === 'suspended') patch.suspended_at = now;
    if (restoring) patch.suspended_at = null;

    await sr.entities.Organization.update(organization.id, patch);

    await sr.entities.AuditEvent.create({
      organization_id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: action === 'suspend' ? 'organization.suspended' : 'organization.unsuspended',
      entity_type: 'Organization',
      entity_id: organization.id,
      entity_title: organization.name || organization.public_id || organization.id,
      description: `Institution status set to ${next} (was ${organization.status})${reason ? ` — stated reason: ${reason}` : ''}`,
      correlation_id,
      authority_context: auth.authority_context,
    }).catch(() => {});

    return Response.json({
      status: 'ok',
      organization_id,
      organization_state: next,
      previous_state: organization.status,
      actor_role: auth.role,
      contract_version: auth.contract_version,
      correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}