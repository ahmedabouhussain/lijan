// committeeAuth.ts — Shared committee authentication & capability resolution.
// Used by all governed page-configuration backend functions.

import { resolveCapabilities } from './capabilityKernel.ts';

export async function resolveUserCapabilities(base44, user, committee) {
  const orgMemberships = await base44.asServiceRole.entities.OrganizationMembership
    .filter({ organization_id: committee.organization_id, user_id: user.id, status: 'active' })
    .catch(() => []);
  const orgMembership = (orgMemberships || [])[0];

  const cmMemberships = await base44.asServiceRole.entities.CommitteeMembership
    .filter({ committee_id: committee.id, user_id: user.id, status: 'active' })
    .catch(() => []);
  const now = new Date().toISOString().split('T')[0];
  const activeMemberships = (cmMemberships || []).filter((m) => {
    if (m.term_start && now < m.term_start) return false;
    if (m.term_end && now > m.term_end) return false;
    return true;
  });

  return resolveCapabilities({
    user,
    orgMembership,
    committeeMemberships: activeMemberships,
    isPlatformAdmin: user.role === 'admin',
  });
}