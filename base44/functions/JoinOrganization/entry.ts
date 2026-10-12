import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// JoinOrganization — lets a user join an existing organization portal.
// Creates an OrganizationMembership (role: member, status: active) for the current user.
// If already a member, just sets active_org_id and redirects.
// Returns: { portal_url, status }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { organization_id } = body;

    if (!organization_id) {
      return Response.json({ error: 'organization_id is required' }, { status: 400 });
    }

    // Verify org exists
    const org = await base44.asServiceRole.entities.Organization.get(organization_id);
    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check existing membership — a member may always re-enter
    const existing = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: org.id, user_id: user.id })
      .catch(() => []);

    if (existing && existing.length > 0) {
      // Already a member — just set active_org_id and redirect
      await base44.auth.updateMe({ active_org_id: org.id }).catch(() => {});
      return Response.json({
        portal_url: `/o/${org.slug}--${org.public_id}`,
        status: 'already_member',
      });
    }

    // D-122 — self-service join closed: no membership is created without the
    // organization's own consent. A join request is recorded for the owner to
    // approve; the requester is NOT a member and may NOT read the org's records
    // until an admin grants it through the governed membership command.
    const existingRequest = await base44.asServiceRole.entities.OrganizationAccessRequest
      .filter({ organization_id: org.id, requester_user_id: user.id, status: { $in: ['pending_review', 'pending_email_verification'] } })
      .catch(() => []);

    if (existingRequest && existingRequest.length > 0) {
      return Response.json({
        portal_url: null,
        status: 'access_already_requested',
        message: 'Your access request is pending review by the organization administrator.',
      });
    }

    await base44.asServiceRole.entities.OrganizationAccessRequest.create({
      organization_id: org.id,
      requester_user_id: user.id,
      requester_email: user.email,
      requester_name: user.full_name || user.email,
      requested_role: 'member',
      verification_method: 'manual_review',
      official_domain_match: false,
      status: 'pending_review',
      justification: 'Self-service join request',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: org.id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'create',
      entity_type: 'OrganizationAccessRequest',
      entity_id: org.id,
      entity_title: org.name_ar || org.name_en,
      description: 'User requested access to organization portal (pending review)',
      correlation_id: 'joinreq_' + Date.now().toString(36),
    });

    return Response.json({
      portal_url: null,
      status: 'access_requested',
      message: 'Your access request has been submitted. An organization administrator will review it.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}