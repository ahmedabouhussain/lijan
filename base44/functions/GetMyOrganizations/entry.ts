import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// GetMyOrganizations — resolves the current user's organization memberships.
// Returns org details (public_id, slug, name, branding) for each active membership.
// Used by EntryPortal to redirect authenticated users to their org portal.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Get all active org memberships for the user
    const memberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ user_id: user.id, status: 'active' })
      .catch(() => []);

    if (!memberships || memberships.length === 0) {
      return Response.json({ organizations: [], has_org: false });
    }

    // Sort: owner first, then admin, then member
    const rolePriority = { owner: 1, admin: 2, member: 3, auditor: 4 };
    const sortedMemberships = memberships.sort(
      (a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99)
    );

    // Get org details for each unique org
    const seenOrgIds = new Set();
    const organizations = [];
    for (const m of sortedMemberships) {
      if (seenOrgIds.has(m.organization_id)) continue;
      seenOrgIds.add(m.organization_id);
      const org = await base44.asServiceRole.entities.Organization
        .get(m.organization_id)
        .catch(() => null);
      if (!org) continue;
      organizations.push({
        id: org.id,
        public_id: org.public_id,
        slug: org.slug,
        name_ar: org.name_ar,
        name_en: org.name_en,
        type: org.type,
        status: org.status,
        branding_primary_color: org.branding_primary_color,
        logo_url: org.logo_url,
        my_role: m.role,
      });
    }

    // Set active_org_id on user profile if not already set
    if (organizations.length > 0) {
      const currentActiveOrg = user.data?.active_org_id;
      if (!currentActiveOrg) {
        await base44.auth.updateMe({ active_org_id: organizations[0].id }).catch(() => {});
      }
    }

    return Response.json({
      organizations,
      has_org: organizations.length > 0,
      active_org_id: user.data?.active_org_id || organizations[0]?.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}