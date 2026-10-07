import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { orgRefusal, orgAuthorityResponse, orgCorrelation } from '../../shared/organizationAuthority.ts';

// EnterOrganizationPortal — the ONE place the session's portal context is established.
//
// It used to be a side effect of the portal READ: opening an institution's page wrote
// `active_org_id` on the user record, and every RLS rule keyed on that field followed whichever tab
// loaded last. The selection therefore authorised reads, two simultaneous organization tabs could
// disagree about which institution was in force, and nothing recorded who set the context or why.
//
// Now the context is set by its own act: the target institution is resolved from its own record, the
// actor's active membership of THAT institution is proved (platform administration carries oversight
// only, and is treated as oversight here — it establishes no institutional authority), and the write is
// attributed. A read never mutates the session again (GetOrganizationPortal declares `context_written: false`).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { public_id, demo_mode } = body;

    if (!public_id) return Response.json({ error: 'public_id is required' }, { status: 400 });

    // A demonstration session reads synthetic records under a persona: it establishes no portal context
    // on the real session, so viewing a demonstration never changes what the real user may read.
    if (demo_mode === true) {
      return Response.json({ status: 'ok', context_written: false, context_scope: 'demonstration_session', contract_version: 'organization-authority-1.0.0' });
    }

    const user = await base44.auth.me().catch(() => null);
    if (!user) return orgAuthorityResponse(orgRefusal('unauthenticated', { status: 401 }));

    const correlation_id = orgCorrelation();

    let orgs = await sr.entities.Organization.filter({ public_id }).catch(() => []);
    let org = (orgs || [])[0];
    if (!org) org = await sr.entities.Organization.get(public_id).catch(() => null);
    if (!org) return orgAuthorityResponse(orgRefusal('target_not_found', { status: 404, correlation_id }));

    const memberships = await sr.entities.OrganizationMembership
      .filter({ organization_id: org.id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const membership = (memberships && (memberships[0] || memberships.items?.[0])) || null;

    // Oversight: a platform administrator may view the institution and needs the context for RLS-backed
    // oversight reads. That is a READ scope, held as `admin_oversight`, and it carries no operational act
    // — every organization command independently refuses `admin_not_operational`.
    const oversight = !membership && user.role === 'admin';
    if (!membership && !oversight) {
      return orgAuthorityResponse(orgRefusal('not_a_member_of_target', { status: 403, correlation_id }));
    }
    if (org.status === 'suspended' && !oversight) {
      return orgAuthorityResponse(orgRefusal('org_suspended', { status: 403, correlation_id, organization_status: org.status }));
    }

    await base44.auth.updateMe({ active_org_id: org.id });

    return Response.json({
      status: 'ok',
      context_written: true,
      organization_id: org.id,
      public_id: org.public_id || org.id,
      my_role: membership ? membership.role : 'admin_oversight',
      oversight,
      contract_version: 'organization-authority-1.0.0',
      correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}