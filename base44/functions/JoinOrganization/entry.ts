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

    // Check existing membership
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

    // Create membership
    await base44.asServiceRole.entities.OrganizationMembership.create({
      organization_id: org.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      role: 'member',
      status: 'active',
      joined_at: new Date().toISOString(),
    });

    // Create RoleAssignment
    await base44.asServiceRole.entities.RoleAssignment.create({
      organization_id: org.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      role_key: 'member',
      status: 'active',
    });

    // Audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: org.id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'create',
      entity_type: 'OrganizationMembership',
      entity_id: org.id,
      entity_title: org.name_ar || org.name_en,
      description: 'User joined organization portal',
      correlation_id: 'join_' + Date.now().toString(36),
    });

    // Set active_org_id
    await base44.auth.updateMe({ active_org_id: org.id }).catch(() => {});

    return Response.json({
      portal_url: `/o/${org.slug}--${org.public_id}`,
      status: 'joined',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}