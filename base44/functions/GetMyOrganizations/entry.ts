import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// GetMyOrganizations — resolves the current user's organization memberships
// AND committee memberships across ALL organizations.
// Returns org details + committees (grouped by org) for each active membership.
// Used by EntryPortal to show a unified cross-org workspace.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // 1) Get all active ORG memberships for the user
    const orgMemberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ user_id: user.id, status: 'active' })
      .catch(() => []);

    // Sort: owner first, then admin, then member
    const rolePriority = { owner: 1, admin: 2, member: 3, auditor: 4 };
    const sortedOrgMemberships = (orgMemberships || []).sort(
      (a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99)
    );

    // 2) Build org list with details — EXCLUDE merged duplicates, redirect to canonical
    const seenOrgIds = new Set();
    const organizations = [];
    for (const m of sortedOrgMemberships) {
      if (seenOrgIds.has(m.organization_id)) continue;
      let org = await base44.asServiceRole.entities.Organization
        .get(m.organization_id)
        .catch(() => null);
      if (!org) continue;

      // If this org was merged, follow the redirect to the canonical org
      if (org.status === 'merged_duplicate' || org.merge_status === 'merged_duplicate') {
        if (org.merged_into_organization_id) {
          const canonical = await base44.asServiceRole.entities.Organization
            .get(org.merged_into_organization_id)
            .catch(() => null);
          if (canonical) {
            // Move the membership to the canonical org if not already there
            const existingInCanonical = await base44.asServiceRole.entities.OrganizationMembership
              .filter({ organization_id: canonical.id, user_id: user.id })
              .catch(() => []);
            if (!existingInCanonical || existingInCanonical.length === 0) {
              await base44.asServiceRole.entities.OrganizationMembership.update(m.id, {
                organization_id: canonical.id,
              }).catch(() => {});
            }
            org = canonical;
          } else {
            continue; // canonical gone — skip
          }
        } else {
          continue; // merged but no canonical — skip
        }
      }

      // Deduplicate by canonical org id
      if (seenOrgIds.has(org.id)) continue;
      seenOrgIds.add(org.id);

      organizations.push({
        id: org.id,
        public_id: org.public_id,
        slug: org.slug,
        name_ar: org.name_ar,
        name_en: org.name_en,
        type: org.type,
        status: org.status,
        directory_key: org.directory_key,
        branding_primary_color: org.branding_primary_color,
        logo_url: org.logo_url,
        my_role: m.role,
      });
    }

    // 3) Get all active COMMITTEE memberships for the user (across all orgs)
    const committeeMemberships = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ user_id: user.id, status: 'active' })
      .catch(() => []);

    // 4) Fetch committee details for each membership
    const seenCommitteeIds = new Set();
    const myCommittees = [];
    for (const cm of (committeeMemberships || [])) {
      if (seenCommitteeIds.has(cm.committee_id)) continue;
      seenCommitteeIds.add(cm.committee_id);
      const committee = await base44.asServiceRole.entities.Committee
        .get(cm.committee_id)
        .catch(() => null);
      if (!committee) continue;
      myCommittees.push({
        id: committee.id,
        name_ar: committee.name_ar,
        name_en: committee.name_en,
        slug: committee.slug,
        public_id: committee.public_id,
        type: committee.type,
        status: committee.status,
        organization_id: committee.organization_id,
        my_role: cm.role,
      });
    }

    // 5) Group committees by organization_id
    const committeesByOrg = {};
    for (const c of myCommittees) {
      if (!committeesByOrg[c.organization_id]) committeesByOrg[c.organization_id] = [];
      committeesByOrg[c.organization_id].push(c);
    }

    // 6) Attach committees to each org in the list
    for (const org of organizations) {
      org.committees = committeesByOrg[org.id] || [];
    }

    // 7) Also include orgs where the user has committees but no org membership
    //    (edge case: invited to a committee without explicit org membership)
    //    Skip merged duplicates — follow redirect to canonical
    for (const c of myCommittees) {
      if (!seenOrgIds.has(c.organization_id)) {
        let org = await base44.asServiceRole.entities.Organization
          .get(c.organization_id)
          .catch(() => null);
        if (!org) continue;

        // Follow merge redirect
        if (org.status === 'merged_duplicate' || org.merge_status === 'merged_duplicate') {
          if (org.merged_into_organization_id) {
            org = await base44.asServiceRole.entities.Organization
              .get(org.merged_into_organization_id)
              .catch(() => null);
            if (!org) continue;
          } else {
            continue;
          }
        }

        if (seenOrgIds.has(org.id)) {
          // Already listed — just attach committees
          const existing = organizations.find((o) => o.id === org.id);
          if (existing && !existing.committees) {
            existing.committees = committeesByOrg[c.organization_id] || [];
          }
          continue;
        }
        seenOrgIds.add(org.id);
        organizations.push({
          id: org.id,
          public_id: org.public_id,
          slug: org.slug,
          name_ar: org.name_ar,
          name_en: org.name_en,
          type: org.type,
          status: org.status,
          directory_key: org.directory_key,
          branding_primary_color: org.branding_primary_color,
          logo_url: org.logo_url,
          my_role: 'committee_member',
          committees: committeesByOrg[c.organization_id] || [],
        });
      }
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
      total_committees: myCommittees.length,
      active_org_id: user.data?.active_org_id || organizations[0]?.id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}