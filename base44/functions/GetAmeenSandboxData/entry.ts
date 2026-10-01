import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { DEMO_DATASET, DEMO_USER } from '../../shared/demoDataset.ts';
import {
  DEMO_PERSONA_KEY,
  resolveScope,
  resolveSandboxCommitteeRole,
  isSandboxCommittee,
} from '../../shared/ameenScopeResolver.ts';

// GetAmeenSandboxData — the only data source for «أمين» inside the exploration experience.
//
// The sandbox scope never touches governed records: every query is pinned to the
// sandbox dataset flag, so a demo session can never surface a real committee.
// This keeps the exploration experience honest and the production data isolated.

const LIMITS = {
  members: 20,
  meetings: 6,
  agenda: 12,
  minutes: 8,
  decisions: 12,
  actions: 12,
  documents: 12,
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { org_ref, committee_ref, demo_mode, demo_persona_key } = body || {};

    if (demo_mode !== true || demo_persona_key !== DEMO_PERSONA_KEY) {
      return Response.json({ error: 'Sandbox scope only' }, { status: 403 });
    }

    const { organization, committee } = await resolveScope(base44, {
      orgRef: org_ref,
      committeeRef: committee_ref,
    });

    if (!isSandboxCommittee(committee)) {
      return Response.json({ error: 'Sandbox committee not found' }, { status: 403 });
    }

    const role = await resolveSandboxCommitteeRole(base44, committee);
    const scope = {
      committee_id: committee.id,
      is_demo_data: true,
      demo_dataset: DEMO_DATASET,
    };

    const sr = base44.asServiceRole;
    const load = (entity) => sr.entities[entity].filter(scope).catch(() => []);

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
      ? await sr.entities.AgendaItem.filter({ ...scope, meeting_id: nextMeeting.id }).catch(() => [])
      : [];

    return Response.json({
      sandbox: true,
      persona: {
        name_ar: DEMO_USER.name_ar,
        name_en: DEMO_USER.name_en,
        job_title_ar: DEMO_USER.job_title_ar,
        job_title_en: DEMO_USER.job_title_en,
      },
      role,
      notice_ar: 'بيانات تجريبية غير حقيقية — للعرض فقط',
      notice_en: 'Fictional sandbox data — presentation only',
      organization: organization
        ? { name_ar: organization.name_ar, name_en: organization.name_en, type: organization.type }
        : null,
      committee: {
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
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}