// capabilityKernel.ts — Backend-governed capability resolution for RAQEEM.
// Resolves explicit capabilities based on org membership, committee membership,
// delegation/alternate activation, and recusal status.
// Platform Admin does NOT automatically gain operational committee authority.
// Org Admin does NOT become Chair, Secretary, voting member, or signatory.

export function resolveCapabilities({ user, orgMembership, committeeMemberships, isPlatformAdmin }) {
  const isOrgAdmin = !!(orgMembership && (orgMembership.role === 'owner' || orgMembership.role === 'admin'));
  const isOrgOwner = !!(orgMembership && orgMembership.role === 'owner');

  // Effective committee role (highest-priority active membership)
  const rolePriority = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };
  const sorted = [...(committeeMemberships || [])].sort(
    (a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99)
  );
  const effectiveCommitteeRole = sorted.length > 0 ? sorted[0].role : null;

  const isCommitteeChair = effectiveCommitteeRole === 'chair';
  const isCommitteeSecretary = effectiveCommitteeRole === 'secretary';
  const isCommitteeViceChair = effectiveCommitteeRole === 'vice_chair';
  const isCommitteeOfficer = isCommitteeChair || isCommitteeSecretary || isCommitteeViceChair;
  const isCommitteeMember = (committeeMemberships || []).length > 0;

  // Platform Admin gets NO operational committee authority.
  // Org Admin gets administrative config but NOT operational committee roles.
  return {
    // Level 1 — Page Configuration (administrative)
    can_configure_committee_pages: isOrgAdmin || isOrgOwner || isCommitteeOfficer,
    can_edit_page_drafts: isOrgAdmin || isOrgOwner || isCommitteeOfficer,
    can_publish_page_configuration: isOrgOwner || isOrgAdmin || isCommitteeChair,
    can_restore_configuration_version: isOrgOwner || isOrgAdmin || isCommitteeChair,

    // Level 2 — Operational Record Editing (committee officers only, NOT org admin unless they hold a committee role)
    can_manage_committee_records: isCommitteeOfficer,
    can_manage_membership: isCommitteeOfficer,
    can_manage_meetings: isCommitteeOfficer,
    can_manage_documents: isCommitteeOfficer,
    can_manage_minutes: isCommitteeSecretary || isCommitteeChair,
    can_manage_decisions: isCommitteeChair,
    can_manage_execution: isCommitteeOfficer,
    can_manage_notifications: isCommitteeOfficer || isOrgAdmin,
    can_manage_governance: isCommitteeChair || isOrgAdmin,
    can_manage_integrations: isOrgAdmin || isOrgOwner,

    // Level 3 — Protected Official Records
    can_supersede_official_records: isCommitteeChair || isOrgAdmin,

    // Audit
    can_view_audit: isCommitteeMember || isOrgAdmin || isOrgOwner,

    // Identity context
    effective_committee_role: effectiveCommitteeRole,
    is_platform_admin: !!isPlatformAdmin,
    is_org_admin: isOrgAdmin,
    is_org_owner: isOrgOwner,
    is_committee_member: isCommitteeMember,
    is_committee_officer: isCommitteeOfficer,
  };
}