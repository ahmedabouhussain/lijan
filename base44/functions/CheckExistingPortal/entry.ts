import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// CheckExistingPortal — checks if an organization already exists for a given entity name.
// Searches by name_ar OR name_en (case-insensitive, trimmed) across ALL organizations
// using service role (bypasses RLS) so users can discover portals they don't own.
// Returns: { exists, organization, is_member, portal_url }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { name_ar, name_en } = body;

    if (!name_ar && !name_en) {
      return Response.json({ error: 'name_ar or name_en is required' }, { status: 400 });
    }

    const normalize = (s) => (s || '').trim().toLowerCase();

    // Search all orgs (service role bypasses RLS) matching either name
    const allOrgs = await base44.asServiceRole.entities.Organization.list('-created_date', 500);
    const matched = (allOrgs || []).find((o) => {
      return normalize(o.name_ar) === normalize(name_ar) ||
             normalize(o.name_en) === normalize(name_en);
    });

    if (!matched) {
      return Response.json({ exists: false });
    }

    // Check if current user is already a member
    const memberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: matched.id, user_id: user.id })
      .catch(() => []);
    const is_member = memberships && memberships.length > 0;

    const portal_url = `/o/${matched.slug}--${matched.public_id}`;

    return Response.json({
      exists: true,
      organization: {
        id: matched.id,
        name_ar: matched.name_ar,
        name_en: matched.name_en,
        type: matched.type,
        status: matched.status,
        slug: matched.slug,
        public_id: matched.public_id,
        owner_name: matched.owner_name,
        portal_url,
      },
      is_member,
      portal_url,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}