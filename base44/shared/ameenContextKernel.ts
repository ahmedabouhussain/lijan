// ameenContextKernel.ts — server-owned scope rules for the single assistant «أمين».
// The client never decides what أمين may read; this module does.
//
// Context keys are mirrored from src/lib/ameenAgent.js (client owns labels only).

const CLASSIFICATION_ORDER = [
  'public',
  'internal',
  'confidential',
  'restricted',
  'highly_restricted',
];

// Baseline sources any authorized participant may draw on.
const BASE_SOURCES = ['committee_profile', 'meetings', 'agenda', 'documents'];

// Privilege tiers — each role inherits only what its office requires.
const ROLE_TIER = {
  observer: [],
  advisor: ['decisions', 'actions', 'members'],
  alternate: ['decisions', 'actions', 'members', 'votes', 'minutes'],
  member: ['decisions', 'actions', 'members', 'votes', 'minutes'],
  committee_administrator: [
    'decisions', 'actions', 'members', 'votes', 'minutes', 'attendance', 'governance_rules',
  ],
  secretary: [
    'decisions', 'actions', 'members', 'votes', 'minutes', 'attendance', 'governance_rules',
  ],
  vice_chair: [
    'decisions', 'actions', 'members', 'votes', 'minutes', 'attendance', 'governance_rules', 'audit',
  ],
  chair: [
    'decisions', 'actions', 'members', 'votes', 'minutes', 'attendance', 'governance_rules', 'audit',
  ],
};

/**
 * Resolve the effective data-classification ceiling for the scope.
 * Never widens beyond the committee's own classification.
 */
export function resolveClassificationCeiling({ committee, organization }) {
  const committeeLevel = committee?.classification;
  if (committeeLevel && CLASSIFICATION_ORDER.includes(committeeLevel)) return committeeLevel;

  const orgLevel = organization?.classification_policy;
  if (orgLevel && CLASSIFICATION_ORDER.includes(orgLevel)) return orgLevel;

  return 'internal';
}

/**
 * Resolve the sources «أمين» may draw on for this user in this scope.
 * Platform/Organization administrators get NO operational committee authority.
 */
export function resolveAmeenSources({ role, isCommitteeScope, isOrgAdmin, isPlatformAdmin }) {
  if (!isCommitteeScope || !role) {
    // Administrative scope only — committee identity, never committee content.
    if (isOrgAdmin || isPlatformAdmin) return ['committee_profile'];
    return [];
  }
  if (role === 'org_admin' || role === 'platform_admin') return ['committee_profile'];

  const tier = ROLE_TIER[role] || [];
  return [...BASE_SOURCES, ...tier];
}