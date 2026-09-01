import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveCapabilities } from '../../shared/capabilityKernel.ts';

// GetCommitteeCapabilities — resolves explicit backend-governed capabilities
// for the authenticated user within a specific committee context.
// Platform Admin does NOT automatically gain operational committee authority.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { committee_id, public_id } = body;

    // Resolve committee
    let committee;
    if (public_id) {
      const list = await base44.asServiceRole.entities.Committee.filter({ public_id }).catch(() => []);
      committee = (list || [])[0];
    } else if (committee_id) {
      committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    }
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    // Org membership
    const orgMemberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: committee.organization_id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const orgMembership = (orgMemberships || [])[0];

    // Committee memberships (effective-dated)
    const cmMemberships = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id: committee.id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const now = new Date().toISOString().split('T')[0];
    const activeMemberships = (cmMemberships || []).filter((m) => {
      if (m.term_start && now < m.term_start) return false;
      if (m.term_end && now > m.term_end) return false;
      return true;
    });

    const capabilities = resolveCapabilities({
      user,
      orgMembership,
      committeeMemberships: activeMemberships,
      isPlatformAdmin: user.role === 'admin',
    });

    return Response.json({
      committee_id: committee.id,
      organization_id: committee.organization_id,
      capabilities,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}