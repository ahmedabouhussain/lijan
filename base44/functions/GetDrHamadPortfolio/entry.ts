import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { DR_HAMAD_PERSONA, DR_HAMAD_PERSON_KEY, DEMO_SCENARIO_ID } from '../../shared/drHamadDataset.ts';

// GetDrHamadPortfolio — returns Dr. Hamad's seven committee memberships with role,
// committee-owning organization, represented organization (always QDB), and workload
// signals. Server-verified from CommitteeMembership + AuthorityGrant records — never
// derived from a client-supplied role.

const CLOSED_ACTION_STATUSES = ['closed', 'verified'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const memberships = await sr.entities.CommitteeMembership.filter({
      user_id: DR_HAMAD_PERSON_KEY, status: 'active',
    }).catch(() => []);

    const committeeIds = memberships.map((m) => m.committee_id);
    if (committeeIds.length === 0) {
      return Response.json({ persona: DR_HAMAD_PERSONA, committees: [], totals: {} });
    }

    const [committees, grants, organizations, meetings, actions, decisions, documents] = await Promise.all([
      sr.entities.Committee.filter({ id: { $in: committeeIds } }).catch(() => []),
      sr.entities.AuthorityGrant.filter({ person_key: DR_HAMAD_PERSON_KEY }).catch(() => []),
      sr.entities.Organization.filter({}).catch(() => []),
      sr.entities.Meeting.filter({ committee_id: { $in: committeeIds } }).catch(() => []),
      sr.entities.Action.filter({ committee_id: { $in: committeeIds } }).catch(() => []),
      sr.entities.Decision.filter({ committee_id: { $in: committeeIds } }).catch(() => []),
      sr.entities.Document.filter({ committee_id: { $in: committeeIds } }).catch(() => []),
    ]);

    const orgById = new Map(organizations.map((o) => [o.id, o]));
    const grantByCommittee = new Map(grants.map((g) => [g.committee_id, g]));
    const groupBy = (rows) => {
      const map = new Map();
      rows.forEach((r) => {
        const list = map.get(r.committee_id) || [];
        list.push(r);
        map.set(r.committee_id, list);
      });
      return map;
    };
    const meetingsBy = groupBy(meetings);
    const actionsBy = groupBy(actions);
    const decisionsBy = groupBy(decisions);
    const docsBy = groupBy(documents);
    const now = Date.now();

    const cards = memberships.map((m) => {
      const committee = committees.find((c) => c.id === m.committee_id);
      if (!committee) return null;
      const owningOrg = orgById.get(committee.organization_id);
      const grant = grantByCommittee.get(committee.id);
      const upcoming = (meetingsBy.get(committee.id) || [])
        .filter((mt) => new Date(mt.date || 0).getTime() >= now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null;
      const openActions = (actionsBy.get(committee.id) || []).filter((a) => !CLOSED_ACTION_STATUSES.includes(a.status));
      const pendingDecisions = (decisionsBy.get(committee.id) || []).filter((d) => ['draft', 'in_review', 'proposed', 'voting'].includes(d.status));

      return {
        committee_ref: committee.public_id,
        name_ar: committee.name_ar,
        name_en: committee.name_en,
        owning_organization: owningOrg ? { name_ar: owningOrg.name_ar, name_en: owningOrg.name_en } : null,
        represented_organization: { name_ar: DR_HAMAD_PERSONA.primary_org_ar, name_en: DR_HAMAD_PERSONA.primary_org_en },
        role: m.role,
        classification: grant ? grant.classification : 'synthetic_demonstration',
        synthetic_label: grant && grant.classification === 'synthetic_demonstration' && m.role === 'chair' && owningOrg?.name_en === 'ELAN Group'
          ? { ar: 'دور تجريبي افتراضي — لا يمثل منصبًا فعليًا', en: 'Synthetic Demonstration Role — Not an Actual Appointment' }
          : null,
        next_meeting: upcoming ? { title: upcoming.title_ar, date: upcoming.date } : null,
        actions_open: openActions.length,
        decisions_pending: pendingDecisions.length,
        documents_count: (docsBy.get(committee.id) || []).length,
        requires_my_action: openActions.length > 0 || pendingDecisions.length > 0,
      };
    }).filter(Boolean);

    const chairCount = memberships.filter((m) => m.role === 'chair').length;
    const viceChairCount = memberships.filter((m) => m.role === 'vice_chair').length;
    const memberCount = memberships.filter((m) => m.role === 'member').length;
    const secretaryCount = memberships.filter((m) => m.role === 'secretary').length;

    return Response.json({
      persona: DR_HAMAD_PERSONA,
      totals: {
        committees: cards.length,
        chair: chairCount,
        vice_chair: viceChairCount,
        member: memberCount,
        secretary: secretaryCount,
      },
      committees: cards,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}