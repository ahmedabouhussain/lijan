// LIJAN™ — contextual work-group permissions.
//
// Authority inside a work group is NEVER inferred from a title string. It is derived from two
// stored relationships the committee portal already resolves server-side:
//   1. the user's role in the COMMITTEE (CommitteeMembership.role)
//   2. the user's role in the WORK GROUP (WorkstreamMembership.role)
//
// A committee office holder sees every work group; a work-group member sees only their own.
// Platform administration grants no operational committee authority.

const CHAIR_LIKE = ["chair", "vice_chair"];
const ADMINISTRATIVE = ["secretary", "committee_administrator"];

/**
 * @param {object} input
 * @param {string|null} input.committeeRole  chair | vice_chair | secretary | committee_administrator | member | alternate | observer | advisor
 * @param {string|null} input.workGroupRole  lead | deputy_lead | member | contributor | observer
 * @param {boolean} input.isPlatformAdmin
 */
export function getWorkGroupCapabilities({ committeeRole, workGroupRole, isPlatformAdmin = false } = {}) {
  const isChairLike = CHAIR_LIKE.includes(committeeRole);
  const isAdministrative = ADMINISTRATIVE.includes(committeeRole);
  const isWorkGroupLead = workGroupRole === "lead" || workGroupRole === "deputy_lead";
  const isWorkGroupMember = !!workGroupRole;
  const isCommitteeMember = !!committeeRole && committeeRole !== "observer";

  // Who may act INSIDE a specific work group.
  const canManageGroup = isChairLike || isAdministrative || isWorkGroupLead;
  const canManageMeetings = canManageGroup;
  const canManageActions = canManageGroup;
  const canRecordDecision = isChairLike || isAdministrative;
  const canInviteMember = isChairLike || isAdministrative || isWorkGroupLead;

  return {
    // Reach
    canViewAllWorkGroups: isChairLike || isAdministrative,
    canViewGroup: isChairLike || isAdministrative || isWorkGroupMember || isCommitteeMember || isPlatformAdmin,

    // Content
    canViewDocuments: isChairLike || isAdministrative || isWorkGroupMember || isCommitteeMember,
    canDownloadDocuments: isChairLike || isAdministrative || isWorkGroupMember,
    canEditDocuments: canManageGroup,
    canShareDocuments: canManageGroup,

    // Group operations
    canManageGroup,
    canManageMeetings,
    canManageActions,
    canRecordDecision,
    canInviteMember,
    canBriefExecutive: isChairLike || isAdministrative || isWorkGroupLead,

    // Governance visibility
    canViewAudit: isChairLike || isAdministrative || isPlatformAdmin,

    // Institutional assets are platform-administration only — never a committee power.
    canManageOrganizationAssets: isPlatformAdmin,

    // Explicit non-grants (kept visible so no surface silently assumes them)
    isWorkGroupLead,
    isWorkGroupMember,
  };
}

/** Role ordering used when a person holds more than one work-group seat. */
const WORK_GROUP_ROLE_ORDER = { lead: 1, deputy_lead: 2, member: 3, contributor: 4, observer: 5 };

/** The person's highest work-group role across the groups of one committee. */
export function highestWorkGroupRole(memberships = []) {
  const active = memberships.filter((m) => m.status === "active");
  if (active.length === 0) return null;
  return active.sort(
    (a, b) => (WORK_GROUP_ROLE_ORDER[a.role] || 99) - (WORK_GROUP_ROLE_ORDER[b.role] || 99)
  )[0].role;
}