import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { DEMO_USER, DEMO_USER_ID, DEMO_DATASET } from '../../shared/demoDataset.ts';

// GetMyOrganizations — resolves the current user's organization memberships
// AND committee memberships across ALL organizations.
// Returns org details + committees (grouped by org) for each active membership.
//
// CRITICAL: When demo_mode=true, queries demo data by demo_dataset flag
// (NOT by user_id). This ensures demo data is isolated from the founder's real data.
// The founder's real memberships are never mixed with demo data.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let payload = {};
    try { payload = await req.json(); } catch (e) {}
    const demoMode = payload.demo_mode === true;

    const sr = base44.asServiceRole;

    // DEMO MODE: Return Fahad's demo data, scoped by demo_dataset flag
    if (demoMode) {
      const demoOrgs = await sr.entities.Organization
        .filter({ is_demo_data: true, demo_dataset: DEMO_DATASET })
        .catch(() => { return []; });

      const demoCommitteeMemberships = await sr.entities.CommitteeMembership
        .filter({ user_id: DEMO_USER_ID, status: 'active' })
        .catch(() => { return []; });

      const demoOrgMemberships = await sr.entities.OrganizationMembership
        .filter({ user_id: DEMO_USER_ID, status: 'active' })
        .catch(() => { return []; });

      const organizations = [];
      const seenOrgIds = new Set();
      for (const org of (demoOrgs || [])) {
        if (seenOrgIds.has(org.id)) continue;
        if (org.status === 'merged_duplicate') continue;
        seenOrgIds.add(org.id);
        const orgMembership = (demoOrgMemberships || []).find((m) => m.organization_id === org.id);
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
          my_role: orgMembership ? orgMembership.role : 'member',
          is_primary: org.public_id === 'DEMO-ORG-AUDIT-COUNCIL',
        });
      }

      const seenCommitteeIds = new Set();
      const myCommittees = [];
      for (const cm of (demoCommitteeMemberships || [])) {
        if (seenCommitteeIds.has(cm.committee_id)) continue;
        seenCommitteeIds.add(cm.committee_id);
        const committee = await sr.entities.Committee.get(cm.committee_id).catch(() => null);
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

      const committeesByOrg = {};
      for (const c of myCommittees) {
        if (!committeesByOrg[c.organization_id]) committeesByOrg[c.organization_id] = [];
        committeesByOrg[c.organization_id].push(c);
      }
      for (const org of organizations) {
        org.committees = committeesByOrg[org.id] || [];
      }

      organizations.sort((a, b) => {
        if (a.is_primary) return -1;
        if (b.is_primary) return 1;
        return 0;
      });

      const userProfile = {
        display_name_ar: DEMO_USER.name_ar,
        display_name_en: DEMO_USER.name_en,
        job_title_ar: DEMO_USER.job_title_ar,
        job_title_en: DEMO_USER.job_title_en,
        primary_org_ar: DEMO_USER.primary_org_ar,
        primary_org_en: DEMO_USER.primary_org_en,
        is_demo_user: true,
        demo_persona_key: DEMO_USER.persona_key,
      };

      return Response.json({
        organizations: organizations,
        has_org: organizations.length > 0,
        total_committees: myCommittees.length,
        active_org_id: organizations.length > 0 ? organizations[0].id : null,
        user_profile: userProfile,
        is_demo_mode: true,
      });
    }

    // NORMAL MODE: Real user's data, EXCLUDING demo data
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const orgMemberships = await sr.entities.OrganizationMembership
      .filter({ user_id: user.id, status: 'active' })
      .catch(() => { return []; });

    const realOrgMemberships = (orgMemberships || []).filter(function(m) {
      return !m.is_demo_data && m.demo_dataset !== DEMO_DATASET;
    });

    const rolePriority = { owner: 1, admin: 2, member: 3, auditor: 4 };
    const sortedOrgMemberships = realOrgMemberships.sort(function(a, b) {
      return (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99);
    });

    const seenOrgIds = new Set();
    const organizations = [];
    for (const m of sortedOrgMemberships) {
      if (seenOrgIds.has(m.organization_id)) continue;
      let org = await sr.entities.Organization.get(m.organization_id).catch(() => null);
      if (!org) continue;
      if (org.is_demo_data || org.demo_dataset === DEMO_DATASET) continue;

      if (org.status === 'merged_duplicate' || org.merge_status === 'merged_duplicate') {
        if (org.merged_into_organization_id) {
          const canonical = await sr.entities.Organization.get(org.merged_into_organization_id).catch(() => null);
          if (canonical) {
            const existingInCanonical = await sr.entities.OrganizationMembership
              .filter({ organization_id: canonical.id, user_id: user.id })
              .catch(() => { return []; });
            if (!existingInCanonical || existingInCanonical.length === 0) {
              await sr.entities.OrganizationMembership.update(m.id, {
                organization_id: canonical.id,
              }).catch(() => {});
            }
            org = canonical;
          } else {
            continue;
          }
        } else {
          continue;
        }
      }

      if (seenOrgIds.has(org.id)) continue;
      if (org.is_demo_data || org.demo_dataset === DEMO_DATASET) continue;
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

    const committeeMemberships = await sr.entities.CommitteeMembership
      .filter({ user_id: user.id, status: 'active' })
      .catch(() => { return []; });

    const realCommitteeMemberships = (committeeMemberships || []).filter(function(m) {
      return !m.is_demo_data && m.demo_dataset !== DEMO_DATASET;
    });

    const seenCommitteeIds = new Set();
    const myCommittees = [];
    for (const cm of realCommitteeMemberships) {
      if (seenCommitteeIds.has(cm.committee_id)) continue;
      seenCommitteeIds.add(cm.committee_id);
      const committee = await sr.entities.Committee.get(cm.committee_id).catch(() => null);
      if (!committee) continue;
      if (committee.is_demo_data || committee.demo_dataset === DEMO_DATASET) continue;
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

    const committeesByOrg = {};
    for (const c of myCommittees) {
      if (!committeesByOrg[c.organization_id]) committeesByOrg[c.organization_id] = [];
      committeesByOrg[c.organization_id].push(c);
    }
    for (const org of organizations) {
      org.committees = committeesByOrg[org.id] || [];
    }

    for (const c of myCommittees) {
      if (!seenOrgIds.has(c.organization_id)) {
        let org = await sr.entities.Organization.get(c.organization_id).catch(() => null);
        if (!org) continue;
        if (org.is_demo_data || org.demo_dataset === DEMO_DATASET) continue;

        if (org.status === 'merged_duplicate' || org.merge_status === 'merged_duplicate') {
          if (org.merged_into_organization_id) {
            org = await sr.entities.Organization.get(org.merged_into_organization_id).catch(() => null);
            if (!org) continue;
          } else {
            continue;
          }
        }

        if (seenOrgIds.has(org.id)) {
          const existing = organizations.find(function(o) { return o.id === org.id; });
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

    const primaryOrgId = user.data ? user.data.primary_org_id : null;
    for (const org of organizations) {
      org.is_primary = org.id === primaryOrgId;
    }
    organizations.sort(function(a, b) {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return 0;
    });

    const userProfile = {
      display_name_ar: (user.data && user.data.display_name_ar) || user.full_name,
      display_name_en: (user.data && user.data.display_name_en) || user.full_name,
      job_title_ar: user.data ? user.data.job_title_ar : null,
      job_title_en: user.data ? user.data.job_title_en : null,
      primary_org_ar: user.data ? user.data.primary_org_ar : null,
      primary_org_en: user.data ? user.data.primary_org_en : null,
      is_demo_user: false,
      demo_persona_key: null,
    };

    return Response.json({
      organizations: organizations,
      has_org: organizations.length > 0,
      total_committees: myCommittees.length,
      active_org_id: (user.data && user.data.active_org_id) || (organizations.length > 0 ? organizations[0].id : null),
      user_profile: userProfile,
      is_demo_mode: false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}