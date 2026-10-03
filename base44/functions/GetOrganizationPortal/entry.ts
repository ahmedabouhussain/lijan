import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { DEMO_DATASET } from '../../shared/demoDataset.ts';
import { resolveDemoPersona } from '../../shared/demoPersonas.ts';

// GetOrganizationPortal — verified read for the Organization Portal Home.
// Verifies membership server-side, returns org + committees + counts.
// RLS is the first layer; this function is the second (membership proof).
//
// CRITICAL: When demo_mode=true, queries demo data by DEMO_USER_ID
// (NOT the real authenticated user). This ensures demo data is isolated.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { public_id, demo_mode, demo_persona } = body;
    if (!public_id) return Response.json({ error: 'public_id is required' }, { status: 400 });

    const demoMode = demo_mode === true;

    // ── DEMO MODE: resolve the demo persona, then only that persona's demo data ──
    if (demoMode) {
      const persona = resolveDemoPersona(demo_persona);

      // Find demo organization by public_id
      let orgs = await sr.entities.Organization
        .filter({ public_id, is_demo_data: true, demo_dataset: persona.dataset })
        .catch(() => []);
      let org = (orgs || [])[0];
      if (!org) {
        org = await sr.entities.Organization.get(public_id).catch(() => null);
        if (org && (!org.is_demo_data || org.demo_dataset !== persona.dataset)) org = null;
      }
      if (!org) return Response.json({ error: 'Organization not found' }, { status: 404 });

      // Demo org membership
      const memberships = await sr.entities.OrganizationMembership
        .filter({ organization_id: org.id, user_id: persona.user_id, status: 'active' })
        .catch(() => []);
      const membership = (memberships || [])[0];

      // Get committees (org-scoped, demo only)
      const committees = await sr.entities.Committee
        .filter({ organization_id: org.id, is_demo_data: true })
        .catch(() => []);

      const cmList = committees || [];
      const activeCommittees = cmList.filter((c) => c.status === 'active');
      const draftCommittees = cmList.filter((c) => c.status === 'draft' || c.status === 'pending_activation');
      const suspendedCommittees = cmList.filter((c) => c.status === 'temporarily_suspended');
      const closingCommittees = cmList.filter((c) => c.status === 'closing' || c.status === 'closed');

      // Demo user's committee memberships in this org
      const myCommitteeMemberships = await sr.entities.CommitteeMembership
        .filter({ organization_id: org.id, user_id: persona.user_id, status: 'active' })
        .catch(() => []);
      const myCommitteeIds = new Set((myCommitteeMemberships || []).map((m) => m.committee_id));
      const myCommitteeRoles = {};
      (myCommitteeMemberships || []).forEach((m) => {
        if (!myCommitteeRoles[m.committee_id] || m.role === 'chair') {
          myCommitteeRoles[m.committee_id] = m.role;
        }
      });

      const tagCommittees = (list) => (list || []).map((c) => ({
        ...c,
        my_role_in_committee: myCommitteeIds.has(c.id) ? (myCommitteeRoles[c.id] || 'member') : null,
      }));

      return Response.json({
        organization: org,
        portal: {
          slug: org.slug,
          public_id: org.public_id,
          status: org.status,
          sandbox_badge: org.status === 'sandbox_active',
        },
        my_role: membership?.role || 'member',
        my_membership: membership || null,
        theme: null,
        my_committee_ids: Array.from(myCommitteeIds),
        committees: {
          total: cmList.length,
          active: tagCommittees(activeCommittees),
          draft: tagCommittees(draftCommittees),
          suspended: tagCommittees(suspendedCommittees),
          closing: tagCommittees(closingCommittees),
        },
        is_demo_mode: true,
      });
    }

    // ── NORMAL MODE: Real authenticated user ──
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Find organization by public_id (immutable authoritative identity)
    let orgs = await sr.entities.Organization
      .filter({ public_id })
      .catch(() => []);
    let org = (orgs || [])[0];
    // Fallback: try by org ID (for records without public_id)
    if (!org) {
      org = await sr.entities.Organization.get(public_id).catch(() => null);
    }
    if (!org) return Response.json({ error: 'Organization not found' }, { status: 404 });

    // Verify membership server-side
    const memberships = await sr.entities.OrganizationMembership
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

    // Get committees (org-scoped, exclude demo data)
    const committees = await sr.entities.Committee
      .filter({ organization_id: org.id })
      .catch(() => []);
    const realCommittees = (committees || []).filter((c) => !c.is_demo_data && c.demo_dataset !== DEMO_DATASET);

    // Categorize committees
    const cmList = realCommittees;
    const activeCommittees = cmList.filter((c) => c.status === 'active');
    const draftCommittees = cmList.filter((c) => c.status === 'draft' || c.status === 'pending_activation');
    const suspendedCommittees = cmList.filter((c) => c.status === 'temporarily_suspended');
    const closingCommittees = cmList.filter((c) => c.status === 'closing' || c.status === 'closed');

    // Get brand theme
    const themes = await sr.entities.BrandTheme
      .filter({ organization_id: org.id, status: 'active' })
      .catch(() => []);
    const theme = (themes || [])[0];

    // Get user's committee memberships (to distinguish "My Committees" from oversight)
    const myCommitteeMemberships = await sr.entities.CommitteeMembership
      .filter({ organization_id: org.id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const realMyMemberships = (myCommitteeMemberships || []).filter((m) => !m.is_demo_data && m.demo_dataset !== DEMO_DATASET);
    const myCommitteeIds = new Set(realMyMemberships.map((m) => m.committee_id));
    const myCommitteeRoles = {};
    realMyMemberships.forEach((m) => {
      if (!myCommitteeRoles[m.committee_id] || m.role === 'chair') {
        myCommitteeRoles[m.committee_id] = m.role;
      }
    });

    // Tag each committee with the user's role (or null if not a member)
    const tagCommittees = (list) => (list || []).map((c) => ({
      ...c,
      my_role_in_committee: myCommitteeIds.has(c.id) ? (myCommitteeRoles[c.id] || 'member') : null,
    }));

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
      my_committee_ids: Array.from(myCommitteeIds),
      committees: {
        total: cmList.length,
        active: tagCommittees(activeCommittees),
        draft: tagCommittees(draftCommittees),
        suspended: tagCommittees(suspendedCommittees),
        closing: tagCommittees(closingCommittees),
      },
      is_demo_mode: false,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}