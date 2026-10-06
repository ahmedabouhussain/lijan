import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { DEMO_DATASET, DEMO_USER } from '../../shared/demoDataset.ts';
import {
  DEMO_PERSONA_USER_ID,
  resolveCommittee,
  resolveSandboxCommitteeRole,
  isSandboxCommittee,
} from '../../shared/ameenScopeResolver.ts';
import { assessScopeInForce } from '../../shared/ameenRetrievalGuard.ts';

// GetAmeenSandboxData — the only data source for «أمين» inside the exploration experience.
//
// The sandbox scope is INTRINSIC to this function: every query below is pinned to the
// demo-dataset flag, so no caller can ever reach a governed record through it. That is
// why it demands no persona key and no reference — «أمين» can call it with no arguments
// at all and still be structurally unable to surface a real committee.
//
// With no committee_ref it returns the exploration persona's full portfolio (every
// sandbox committee they hold an office in, with counts). With a committee_ref it
// returns that committee's full detail.

// Closed-list rather than open-list: an action counts as open unless it is finished.
const CLOSED_ACTION_STATUSES = ['completed', 'closed', 'verified', 'cancelled'];
const OPEN_DECISION_STATUSES = ['draft', 'in_review', 'proposed', 'voting'];
const EXECUTING_DECISION_STATUSES = ['approved', 'issued', 'executing'];
const PENDING_MINUTES_STATUSES = ['draft', 'in_review'];

const LIMITS = {
  members: 20,
  meetings: 6,
  agenda: 12,
  minutes: 8,
  decisions: 12,
  actions: 12,
  documents: 12,
};

const NOTICE_AR = 'بيانات تجريبية غير حقيقية — للعرض فقط';
const NOTICE_EN = 'Fictional sandbox data — presentation only';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_ref } = body || {};
    const sr = base44.asServiceRole;

    const demoScope = { is_demo_data: true, demo_dataset: DEMO_DATASET };

    if (committee_ref) {
      const committee = await resolveCommittee(base44, committee_ref);
      if (!isSandboxCommittee(committee)) {
        return Response.json({ error: 'Sandbox committee not found' }, { status: 403 });
      }
      // A demonstration scope must still be LIVE before «أمين» reads it (ameen-retrieval-guard-1.0.0,
      // D-092): a closed or archived committee is history, not a scope — and the refusal is named.
      const scope = assessScopeInForce(committee);
      if (scope.live !== true) {
        return Response.json({
          error: 'Scope not in force',
          code: scope.code || 'scope_closed',
          scope_status: scope.status || null,
          reason_ar: 'هذه اللجنة ليست نطاقًا سارٍ الآن (مغلقة أو مؤرشفة)، فلا تُقرأ بياناتها.',
          reason_en: 'This committee is not a scope in force right now (closed or archived), so its data is not read.',
        }, { status: 403 });
      }
      return Response.json(await committeeDetail(base44, sr, committee));
    }

    // The portfolio is assembled from the LIVE sandbox scopes only, and every scope left out is named in
    // the same answer — never dropped silently (an unreadable or closed scope is not an empty one).
    const sandboxScopes = await sr.entities.Committee.filter(demoScope).catch(() => []);
    const liveScopes = (sandboxScopes || []).filter((c) => assessScopeInForce(c).live === true);
    const withdrawnScopes = (sandboxScopes || [])
      .filter((c) => assessScopeInForce(c).live !== true)
      .map((c) => {
        const s = assessScopeInForce(c);
        return { committee_ref: c.public_id || c.id, code: s.code || 'scope_closed', status: s.status || null };
      });

    return Response.json({ ...(await portfolio(sr, demoScope, liveScopes)), withdrawn_scopes: withdrawnScopes });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

/** Every sandbox committee the exploration persona holds an office in, with workload counts. */
async function portfolio(sr, demoScope, committees) {
  // Child records inherit their scope from the committee they belong to: a record is
  // sandbox data exactly when its committee is a sandbox committee. Governed records
  // stay unreachable because their committee is never part of this set. The caller passes the
  // LIVE sandbox scopes in, so a closed one is excluded and named rather than counted here.
  const committeeScope = { committee_id: { $in: (committees || []).map((c) => c.id) } };

  const [memberships, organizations, meetings, minutes, decisions, actions] = await Promise.all([
    sr.entities.CommitteeMembership.filter({ ...committeeScope, user_id: DEMO_PERSONA_USER_ID, status: 'active' }).catch(() => []),
    sr.entities.Organization.filter(demoScope).catch(() => []),
    sr.entities.Meeting.filter(committeeScope).catch(() => []),
    sr.entities.MeetingMinutes.filter(committeeScope).catch(() => []),
    sr.entities.Decision.filter(committeeScope).catch(() => []),
    sr.entities.Action.filter(committeeScope).catch(() => []),
  ]);

  const roleByCommittee = new Map();
  (memberships || []).forEach((m) => {
    if (m.committee_id) roleByCommittee.set(m.committee_id, m.role);
  });

  const groupByCommittee = (rows) => {
    const map = new Map();
    (rows || []).forEach((r) => {
      if (!r.committee_id) return;
      const list = map.get(r.committee_id) || [];
      list.push(r);
      map.set(r.committee_id, list);
    });
    return map;
  };

  const meetingsBy = groupByCommittee(meetings);
  const actionsBy = groupByCommittee(actions);
  const decisionsBy = groupByCommittee(decisions);
  const minutesBy = groupByCommittee(minutes);
  const orgById = new Map((organizations || []).map((o) => [o.id, o]));

  const now = Date.now();

  const rows = (committees || [])
    .filter((c) => roleByCommittee.has(c.id))
    .map((c) => {
      const held = (meetingsBy.get(c.id) || []).filter((m) => m.status !== 'cancelled');
      const upcoming = held
        .filter((m) => new Date(m.date || 0).getTime() >= now)
        .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

      const openActions = (actionsBy.get(c.id) || []).filter(
        (a) => !CLOSED_ACTION_STATUSES.includes(a.status)
      );
      const decisions = decisionsBy.get(c.id) || [];
      const minutesFor = minutesBy.get(c.id) || [];
      const org = orgById.get(c.organization_id);

      return {
        ref: c.public_id || c.slug,
        name_ar: c.name_ar,
        name_en: c.name_en,
        type: c.type,
        status: c.status,
        classification: c.classification || null,
        organization: org ? (org.name_ar || org.name_en) : null,
        role: roleByCommittee.get(c.id),
        next_meeting: upcoming[0]
          ? {
              title: upcoming[0].title_ar || upcoming[0].title,
              date: upcoming[0].date,
              agenda_ready: upcoming[0].agenda_ready === true,
            }
          : null,
        meetings_upcoming: upcoming.length,
        meetings_held: held.length - upcoming.length,
        actions_open: openActions.length,
        actions_overdue: openActions.filter(
          (a) => a.status === 'overdue' || (a.deadline && new Date(a.deadline).getTime() < now)
        ).length,
        decisions_open: decisions.filter((d) => OPEN_DECISION_STATUSES.includes(d.status)).length,
        decisions_executing: decisions.filter((d) => EXECUTING_DECISION_STATUSES.includes(d.status)).length,
        minutes_pending: minutesFor.filter((m) => PENDING_MINUTES_STATUSES.includes(m.status)).length,
      };
    })
    .sort((a, b) => String(a.name_ar || '').localeCompare(String(b.name_ar || ''), 'ar'));

  const sum = (key) => rows.reduce((total, r) => total + r[key], 0);

  const organizationsHeld = [];
  rows.forEach((r) => {
    if (!r.organization) return;
    const entry = organizationsHeld.find((o) => o.name === r.organization);
    if (entry) entry.committees += 1;
    else organizationsHeld.push({ name: r.organization, committees: 1 });
  });

  return {
    sandbox: true,
    scope: 'portfolio',
    notice_ar: NOTICE_AR,
    notice_en: NOTICE_EN,
    persona: personaBlock(),
    totals: {
      organizations: organizationsHeld.length,
      committees: rows.length,
      meetings_upcoming: sum('meetings_upcoming'),
      actions_open: sum('actions_open'),
      actions_overdue: sum('actions_overdue'),
      decisions_open: sum('decisions_open'),
      minutes_pending: sum('minutes_pending'),
    },
    organizations: organizationsHeld,
    committees: rows,
  };
}

/** One sandbox committee in full — the exploration persona's office in it included. */
async function committeeDetail(base44, sr, committee) {
  const organization = committee.organization_id
    ? await sr.entities.Organization.get(committee.organization_id).catch(() => null)
    : null;

  const role = await resolveSandboxCommitteeRole(base44, committee);
  // Same rule as the portfolio: the committee itself is the sandbox boundary.
  const committeeScope = { committee_id: committee.id };
  const load = (entity) => sr.entities[entity].filter(committeeScope).catch(() => []);

  const [memberships, meetings, minutes, decisions, actions, documents] = await Promise.all([
    load('CommitteeMembership'),
    load('Meeting'),
    load('MeetingMinutes'),
    load('Decision'),
    load('Action'),
    load('Document'),
  ]);

  const now = Date.now();
  const sortedMeetings = (meetings || [])
    .slice()
    .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

  const upcoming = sortedMeetings.filter((m) => new Date(m.date || 0).getTime() >= now);
  const past = sortedMeetings.filter((m) => new Date(m.date || 0).getTime() < now).reverse();

  const nextMeeting = upcoming[0] || null;
  const agendaItems = nextMeeting
    ? await sr.entities.AgendaItem.filter({ ...committeeScope, meeting_id: nextMeeting.id }).catch(() => [])
    : [];

  return {
    sandbox: true,
    scope: 'committee',
    notice_ar: NOTICE_AR,
    notice_en: NOTICE_EN,
    persona: personaBlock(),
    role,
    organization: organization
      ? { name_ar: organization.name_ar, name_en: organization.name_en, type: organization.type }
      : null,
    committee: {
      ref: committee.public_id || committee.slug,
      name_ar: committee.name_ar,
      name_en: committee.name_en,
      type: committee.type,
      status: committee.status,
      mandate: committee.mandate || null,
      scope: committee.scope || null,
      classification: committee.classification || null,
      establishing_authority: committee.establishing_authority || null,
      establishing_doc_reference: committee.establishing_doc_reference || null,
      term_start: committee.term_start || null,
      term_end: committee.term_end || null,
      quorum_count: committee.quorum_count || null,
      voting_rule: committee.voting_rule || null,
      meeting_cadence: committee.meeting_cadence || null,
      chair_name: committee.chair_name || null,
      secretary_name: committee.secretary_name || null,
    },
    members: (memberships || [])
      .slice()
      .sort((a, b) => (a.protocol_order || 99) - (b.protocol_order || 99))
      .slice(0, LIMITS.members)
      .map((m) => ({
        name: m.full_name_ar || m.full_name,
        role: m.role,
        status: m.status,
        voting_right: m.voting_right === true,
        institution: m.institution_name || null,
      })),
    meetings_upcoming: upcoming.slice(0, LIMITS.meetings).map((m) => ({
      title: m.title_ar || m.title,
      date: m.date,
      duration_minutes: m.duration_minutes || null,
      location: m.location || null,
      mode: m.mode || null,
      status: m.status,
      agenda_ready: m.agenda_ready === true,
    })),
    meetings_recent: past.slice(0, LIMITS.meetings).map((m) => ({
      title: m.title_ar || m.title,
      date: m.date,
      location: m.location || null,
      status: m.status,
    })),
    next_meeting_agenda: (agendaItems || [])
      .slice()
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      .slice(0, LIMITS.agenda)
      .map((i) => ({
        sequence: i.sequence,
        title: i.title_ar || i.title,
        objective: i.objective || null,
        time_allocation_minutes: i.time_allocation_minutes || null,
        required_decision: i.required_decision || null,
        readiness: i.readiness || null,
        status: i.status || null,
      })),
    minutes: (minutes || []).slice(0, LIMITS.minutes).map((m) => ({
      title: m.title_ar || m.title,
      status: m.status,
      approved_by_name: m.approved_by_name || null,
      approved_at: m.approved_at || null,
    })),
    decisions: (decisions || []).slice(0, LIMITS.decisions).map((d) => ({
      number: d.decision_number || null,
      title: d.title_ar || d.title,
      status: d.status,
      legal_basis: d.legal_basis || null,
      issued_at: d.issued_at || null,
      vote_for: d.vote_for ?? null,
      vote_against: d.vote_against ?? null,
      vote_abstain: d.vote_abstain ?? null,
    })),
    actions: (actions || []).slice(0, LIMITS.actions).map((a) => ({
      title: a.title_ar || a.title,
      owner: a.owner_name || null,
      status: a.status,
      deadline: a.deadline || null,
      priority: a.priority || null,
      progress_percent: a.progress_percent ?? null,
    })),
    documents: (documents || []).slice(0, LIMITS.documents).map((d) => ({
      title: d.title_ar || d.title,
      type: d.document_type || null,
      classification: d.classification || null,
      version: d.current_version_number ?? null,
      status: d.status,
      owner: d.owner_name || null,
    })),
  };
}

function personaBlock() {
  return {
    name_ar: DEMO_USER.name_ar,
    name_en: DEMO_USER.name_en,
    job_title_ar: DEMO_USER.job_title_ar,
    job_title_en: DEMO_USER.job_title_en,
  };
}