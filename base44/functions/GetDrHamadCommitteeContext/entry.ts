import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  DR_HAMAD_PERSONA, getRolePermittedActions, resolveDrHamadCommitteeGrant,
} from '../../shared/drHamadDataset.ts';

// GetDrHamadCommitteeContext — the server-evaluated authority boundary for ONE committee.
// Permitted actions are computed from the committee's own AuthorityGrant record only:
// - A chair grant in this committee never leaks into another committee.
// - A vice_chair grant only unlocks chair_authority actions while delegation_status === 'active'.
// - A secretary grant never includes approve_reject_defer_decisions / approve_minutes.
// This is the authorization evidence: nowhere does this function compare `role === 'chair'`
// to decide what the caller may do — it always reads the committee-scoped AuthorityGrant.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { committee_ref } = body || {};
    if (!committee_ref) return Response.json({ error: 'committee_ref is required' }, { status: 400 });

    const { committee, membership, grant } = await resolveDrHamadCommitteeGrant(sr, committee_ref);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    if (!membership || !grant) {
      // No membership + no grant in THIS committee ⇒ no access. Direct URL manipulation
      // to another committee's ref lands here and is denied — nothing further is returned.
      return Response.json({ error: 'No authorized membership in this committee' }, { status: 403 });
    }

    const owningOrg = await sr.entities.Organization.get(committee.organization_id).catch(() => null);
    const delegationActive = grant.delegation_status === 'active';
    const permittedActions = getRolePermittedActions(grant.role, grant.authority_type, delegationActive);
    const chairActionsBlocked = grant.requires_delegation && !delegationActive;

    const [meetings, agendaItems, decisions, actions, documents] = await Promise.all([
      sr.entities.Meeting.filter({ committee_id: committee.id }).catch(() => []),
      sr.entities.AgendaItem.filter({ committee_id: committee.id }).catch(() => []),
      sr.entities.Decision.filter({ committee_id: committee.id }).catch(() => []),
      sr.entities.Action.filter({ committee_id: committee.id }).catch(() => []),
      sr.entities.Document.filter({ committee_id: committee.id }).catch(() => []),
    ]);

    return Response.json({
      persona: { name_ar: DR_HAMAD_PERSONA.name_ar, name_en: DR_HAMAD_PERSONA.name_en },
      primary_organization: { name_ar: DR_HAMAD_PERSONA.primary_org_ar, name_en: DR_HAMAD_PERSONA.primary_org_en },
      committee: {
        ref: committee.public_id, name_ar: committee.name_ar, name_en: committee.name_en,
        owning_organization: owningOrg ? { name_ar: owningOrg.name_ar, name_en: owningOrg.name_en } : null,
      },
      authority: {
        role: grant.role,
        authority_type: grant.authority_type,
        classification: grant.classification,
        requires_delegation: grant.requires_delegation,
        delegation_status: grant.delegation_status,
        chair_actions_blocked: chairActionsBlocked,
        permitted_actions: permittedActions,
        conflict_status: grant.conflict_status,
      },
      meetings, agendaItems, decisions, actions, documents,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}