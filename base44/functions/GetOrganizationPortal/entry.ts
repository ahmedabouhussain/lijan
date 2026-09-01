import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// GetOrganizationPortal — verified read for the Organization Portal Home.
// Verifies membership server-side, returns org + committees + counts.
// RLS is the first layer; this function is the second (membership proof).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { public_id } = body;
    if (!public_id) return Response.json({ error: 'public_id is required' }, { status: 400 });

    // Find organization by public_id (immutable authoritative identity)
    const orgs = await base44.asServiceRole.entities.Organization
      .filter({ public_id })
      .catch(() => []);
    const org = (orgs || [])[0];
    if (!org) return Response.json({ error: 'Organization not found' }, { status: 404 });

    // Verify membership server-side
    const memberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: org.id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const membership = (memberships || [])[0];

    // Platform admin oversight
    if (!membership && user.role !== 'admin') {
      return Response.json({ error: 'Not a member of this organization' }, { status: 403 });
    }

    // Check org status
    if (org.status === 'suspended' && user.role !== 'admin') {
      return Response.json({ error: 'Organization is suspended', organization_status: 'suspended' }, { status: 403 });
    }

    // Get committees (org-scoped)
    const committees = await base44.asServiceRole.entities.Committee
      .filter({ organization_id: org.id })
      .catch(() => []);

    // Categorize committees
    const cmList = committees || [];
    const activeCommittees = cmList.filter((c) => c.status === 'active');
    const draftCommittees = cmList.filter((c) => c.status === 'draft' || c.status === 'pending_activation');
    const suspendedCommittees = cmList.filter((c) => c.status === 'temporarily_suspended');
    const closingCommittees = cmList.filter((c) => c.status === 'closing' || c.status === 'closed');

    // Get brand theme
    const themes = await base44.asServiceRole.entities.BrandTheme
      .filter({ organization_id: org.id, status: 'active' })
      .catch(() => []);
    const theme = (themes || [])[0];

    // Set user's active_org_id context for RLS
    await base44.auth.updateMe({ active_org_id: org.id }).catch(() => {});

    return Response.json({
      organization: org,
      portal: {
        slug: org.slug,
        public_id: org.public_id,
        status: org.status,
        sandbox_badge: org.status === 'sandbox_active',
      },
      my_role: membership?.role || 'admin_oversight',
      my_membership: membership || null,
      theme: theme || null,
      committees: {
        total: cmList.length,
        active: activeCommittees,
        draft: draftCommittees,
        suspended: suspendedCommittees,
        closing: closingCommittees,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}