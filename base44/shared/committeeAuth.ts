// committeeAuth.ts — Shared committee authentication & capability resolution.
// Used by all governed page-configuration backend functions.

import { resolveCapabilities } from './capabilityKernel.ts';

/**
 * Authority boundary for ONE committee office.
 * Powers are scoped to the committee that granted them and never escalate:
 *  - Committee Secretary prepares agendas, minutes and packs — never approves a decision.
 *  - Vice-Chair supports and recommends — Chair powers only with an ACTIVE delegation.
 *  - Member reviews, recommends and provides evidence — never approves.
 *  - Chair approves only inside the committee that granted the office.
 */
export function evaluateCommitteeAuthority({ role, delegationActive = false }) {
  const isChair = role === 'chair';
  const isViceChair = role === 'vice_chair';
  const isSecretary = role === 'secretary';
  const isMember = role === 'member';
  const actingChair = isChair || (isViceChair && delegationActive);

  return {
    can_view_committee: !!role,
    can_review: !!role,
    can_comment: !!role,
    can_recommend: isMember || isViceChair || isChair,
    can_provide_evidence: !!role,
    can_prepare_agenda: isChair || isSecretary,
    can_approve_agenda: isChair,
    can_run_agenda_progression: isChair,
    can_prepare_minutes: isChair || isSecretary,
    can_approve_minutes: isChair,
    can_prepare_meeting_pack: isChair || isSecretary,
    can_follow_up_actions: isChair || isSecretary,
    can_assign_actions: isChair,
    can_decide: isChair,
    can_approve_decisions: isChair,
    can_escalate: isChair,
    can_act_as_chair: actingChair,
    requires_active_delegation: isViceChair,
    delegation_active: !!delegationActive,
    effective_committee_role: role || null,
  };
}

/**
 * Capability + authority-context resolution for a governed demonstration persona.
 * The persona is a virtual principal (DEMO-USER-*): its membership, grant, purpose,
 * classification, record state, conflict status and effective dates are read from
 * persisted records — never inferred by the client.
 */
export async function resolvePersonaCapabilities(base44, persona, committee) {
  const sr = base44.asServiceRole;
  const today = new Date().toISOString().slice(0, 10);

  const membershipRows = await sr.entities.CommitteeMembership
    .filter({ committee_id: committee.id, user_id: persona.user_id, status: 'active' })
    .catch(() => []);
  const activeMemberships = (membershipRows || []).filter((m) => {
    if (m.term_start && today < m.term_start) return false;
    if (m.term_end && today > m.term_end) return false;
    return true;
  });

  const grantRows = await sr.entities.AuthorityGrant
    .filter({ committee_id: committee.id, person_key: persona.user_id })
    .catch(() => []);
  const grant = (grantRows || [])[0] || null;

  const inValidity = !!grant
    && (!grant.validity_start || today >= grant.validity_start)
    && (!grant.validity_end || today <= grant.validity_end);
  const delegationActive = !!grant
    && grant.delegation_status === 'active'
    && (!grant.delegation_valid_from || today >= grant.delegation_valid_from)
    && (!grant.delegation_valid_until || today <= grant.delegation_valid_until);

  const membership = activeMemberships[0] || null;
  const membershipRole = membership ? membership.role : null;
  const blocked = !!grant && (grant.conflict_status === 'declared' || !inValidity);
  const effectiveRole = blocked ? null : membershipRole;

  return {
    role: effectiveRole,
    membership: membership,
    grant: grant,
    capabilities: evaluateCommitteeAuthority({ role: effectiveRole, delegationActive: delegationActive }),
    authority_context: {
      principal: persona.user_id,
      persona_id: persona.persona_id || null,
      primary_org_ar: persona.primary_org_ar || null,
      primary_org_en: persona.primary_org_en || null,
      represented_org: membership ? (membership.institution_name || null) : null,
      committee_id: committee.id,
      committee_public_id: committee.public_id || null,
      committee_membership_id: membership ? membership.id : null,
      membership_role: membershipRole,
      authority_type: grant ? grant.authority_type : null,
      purpose: grant ? grant.purpose : null,
      classification: grant ? grant.classification : null,
      record_state: grant ? (inValidity ? 'in_validity' : 'out_of_validity') : 'no_grant',
      delegation: grant ? grant.delegation_status : 'none',
      delegation_active: delegationActive,
      conflict_status: grant ? grant.conflict_status : 'none',
      validity_start: grant ? grant.validity_start : null,
      validity_end: grant ? grant.validity_end : null,
      effective_committee_role: effectiveRole,
    },
  };
}

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