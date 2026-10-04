import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveDemoPersona } from '../../shared/demoPersonas.ts';
import { resolvePersonaCapabilities } from '../../shared/committeeAuth.ts';
import { resolveCapabilities } from '../../shared/capabilityKernel.ts';
import { capabilitiesForRole } from '../../shared/authorityKernel.ts';

// GetCommitteeRecord — the SINGLE governed read path for a committee record's detail surface.
//
// Why it exists: a register (meetings, decisions, documents, minutes) is assembled on the server
// for the actor's scope, while a detail page that reads the same record straight from the client
// SDK is evaluated against the REAL caller's row-level rules. The two can disagree — a record that
// is listed can be unreadable in detail — which surfaces as "not available" on a record the user
// just clicked. Every detail surface therefore reads through here, in the same scope as its list.
//
// It returns the record, its committee, the actor's resolved role and authority, and the related
// records the detail surface needs — so a page never assembles its own parallel view of the data.

const ALLOWED_TYPES = ['Meeting', 'Decision', 'MeetingMinutes', 'Document'];

function effectiveSeats(seats) {
  const now = new Date().toISOString().split('T')[0];
  return (seats || []).filter((m) => {
    if (m.term_start && now < m.term_start) return false;
    if (m.term_end && now > m.term_end) return false;
    return true;
  });
}

const ROLE_PRIORITY = { chair: 1, vice_chair: 2, secretary: 3, committee_administrator: 4, member: 5, alternate: 6, observer: 7, advisor: 8 };

function highestRole(seats) {
  if (!seats || !seats.length) return 'observer';
  return [...seats].sort((a, b) => (ROLE_PRIORITY[a.role] || 99) - (ROLE_PRIORITY[b.role] || 99))[0].role;
}

async function loadRelated(sr, entityType, record, committee) {
  if (entityType === 'Meeting') {
    const [agenda, decisions, attendance, minutes, members] = await Promise.all([
      sr.entities.AgendaItem.filter({ meeting_id: record.id }).catch(() => []),
      sr.entities.Decision.filter({ meeting_id: record.id }).catch(() => []),
      sr.entities.Attendance.filter({ meeting_id: record.id }).catch(() => []),
      sr.entities.MeetingMinutes.filter({ meeting_id: record.id }).catch(() => []),
      sr.entities.CommitteeMembership.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
    ]);
    const orderedAgenda = (agenda || []).sort((a, b) => (a.sequence || 99) - (b.sequence || 99));
    const agendaIds = orderedAgenda.map((a) => a.id);
    const documents = agendaIds.length
      ? await sr.entities.Document.filter({ agenda_item_id: { $in: agendaIds } }).catch(() => [])
      : [];
    return {
      agenda: orderedAgenda,
      decisions: decisions || [],
      attendance: attendance || [],
      minutes: minutes || [],
      members: members || [],
      documents: documents || [],
    };
  }

  if (entityType === 'Decision') {
    const [actions, votes, meeting] = await Promise.all([
      sr.entities.Action.filter({ decision_id: record.id }).catch(() => []),
      sr.entities.Vote.filter({ decision_id: record.id }).catch(() => []),
      record.meeting_id ? sr.entities.Meeting.get(record.meeting_id).catch(() => null) : Promise.resolve(null),
    ]);
    const superseding = record.superseded_by ? await sr.entities.Decision.get(record.superseded_by).catch(() => null) : null;
    return { actions: actions || [], votes: votes || [], meeting, superseding_decision: superseding };
  }

  if (entityType === 'MeetingMinutes') {
    const meeting = record.meeting_id ? await sr.entities.Meeting.get(record.meeting_id).catch(() => null) : null;
    const [agenda, decisions, attendance, members] = await Promise.all([
      record.meeting_id ? sr.entities.AgendaItem.filter({ meeting_id: record.meeting_id }).catch(() => []) : Promise.resolve([]),
      record.meeting_id ? sr.entities.Decision.filter({ meeting_id: record.meeting_id }).catch(() => []) : Promise.resolve([]),
      record.meeting_id ? sr.entities.Attendance.filter({ meeting_id: record.meeting_id }).catch(() => []) : Promise.resolve([]),
      sr.entities.CommitteeMembership.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
    ]);
    return {
      meeting,
      agenda: (agenda || []).sort((a, b) => (a.sequence || 99) - (b.sequence || 99)),
      decisions: decisions || [],
      attendance: attendance || [],
      members: members || [],
    };
  }

  // Document
  const [versions, requests] = await Promise.all([
    sr.entities.DocumentVersion.filter({ document_id: record.id }).catch(() => []),
    sr.entities.ReviewRequest.filter({ document_id: record.id }).catch(() => []),
  ]);
  const orderedVersions = (versions || []).sort((a, b) => (b.version_number || 0) - (a.version_number || 0));
  const requestIds = (requests || []).map((r) => r.id);
  const responses = requestIds.length
    ? await sr.entities.ReviewResponse.filter({ review_request_id: { $in: requestIds } }).catch(() => [])
    : [];
  let meeting = null;
  let decision = null;
  if (record.agenda_item_id) {
    const item = await sr.entities.AgendaItem.get(record.agenda_item_id).catch(() => null);
    if (item?.meeting_id) meeting = await sr.entities.Meeting.get(item.meeting_id).catch(() => null);
  }
  if (record.decision_id) decision = await sr.entities.Decision.get(record.decision_id).catch(() => null);
  return {
    versions: orderedVersions,
    review_requests: requests || [],
    review_responses: responses || [],
    meeting,
    decision,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { entity_type, record_id, demo_mode, demo_persona_key } = body || {};

    if (!entity_type || !record_id) {
      return Response.json({ error: 'entity_type and record_id are required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(entity_type)) {
      return Response.json({ error: 'Unsupported record type' }, { status: 400 });
    }

    const demoMode = demo_mode === true;
    const persona = resolveDemoPersona(demo_persona_key);

    const record = await sr.entities[entity_type].get(record_id).catch(() => null);
    if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });

    const committee = record.committee_id ? await sr.entities.Committee.get(record.committee_id).catch(() => null) : null;
    if (!committee) return Response.json({ error: 'Committee not found for this record' }, { status: 404 });

    let role = 'observer';
    let capabilities = {};
    let actor = null;
    let isDemo = false;

    if (demoMode || persona) {
      // Exploration: the record must belong to the persona's governed dataset, and the persona
      // must actually hold a seat in the committee that owns it — a link may not widen scope.
      if (!persona) {
        return Response.json({ error: 'Unknown or missing demo persona', code: 'unknown_persona' }, { status: 400 });
      }
      if (committee.is_demo_data !== true || committee.demo_dataset !== persona.dataset) {
        return Response.json({ error: 'Record not found in this exploration scope', code: 'out_of_scope' }, { status: 404 });
      }
      const seats = await sr.entities.CommitteeMembership
        .filter({ committee_id: committee.id, user_id: persona.user_id, status: 'active' })
        .catch(() => []);
      const active = effectiveSeats(seats);
      if (!active.length) {
        return Response.json({ error: 'No seat in this committee within this exploration scope' }, { status: 403 });
      }
      const resolved = await resolvePersonaCapabilities(base44, persona, committee);
      role = resolved.role || highestRole(active);
      capabilities = resolved.capabilities || {};
      actor = { kind: 'persona', id: persona.user_id, name: persona.name_ar || persona.name_en || null };
      isDemo = true;
    } else {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      const [orgSeats, seats] = await Promise.all([
        sr.entities.OrganizationMembership.filter({ organization_id: committee.organization_id, user_id: user.id, status: 'active' }).catch(() => []),
        sr.entities.CommitteeMembership.filter({ committee_id: committee.id, user_id: user.id, status: 'active' }).catch(() => []),
      ]);
      const orgSeat = (orgSeats || [])[0];
      const active = effectiveSeats(seats);
      const isOrgAdmin = !!(orgSeat && (orgSeat.role === 'owner' || orgSeat.role === 'admin'));

      if (!active.length && !isOrgAdmin && user.role !== 'admin') {
        return Response.json({ error: 'Not a member of this committee' }, { status: 403 });
      }
      capabilities = resolveCapabilities({
        user,
        orgMembership: orgSeat,
        committeeMemberships: active,
        isPlatformAdmin: user.role === 'admin',
      });
      role = highestRole(active);
      actor = { kind: 'user', id: user.id, name: user.full_name || user.email };
    }

    const related = await loadRelated(sr, entity_type, record, committee);

    return Response.json({
      record,
      committee,
      my_role: role,
      capabilities,
      // The role's authority, resolved in ONE place — a surface gates its controls on this list
      // instead of hardcoding which roles may act.
      authority: capabilitiesForRole(role),
      actor,
      is_demo_mode: isDemo,
      ...related,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}