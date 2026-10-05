import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  GOVERNED_READ_TYPES,
  resolvePrincipal,
  authorizeRead,
  projectRecord,
  gateRelated,
  projectBundle,
  refusalBody,
  refusalStatus,
} from '../../shared/governedReadPolicy.ts';
import { evaluateIssuanceReadiness, issuanceVerdict } from '../../shared/decisionIntegrity.ts';

// GetCommitteeRecord — the SINGLE governed read path for a committee record's detail surface.
//
// Why it exists: a register (meetings, decisions, documents, minutes) is assembled on the server
// for the actor's scope, while a detail page that reads the same record straight from the client
// SDK is evaluated against the REAL caller's row-level rules. The two can disagree — a record that
// is listed can be unreadable in detail — which surfaces as "not available" on a record the user
// just clicked. Every detail surface therefore reads through here, in the same scope as its list.
//
// The decision itself lives in shared/governedReadPolicy.ts, together with the isolation self test,
// so exactly one implementation answers "may this principal read this record".

const ALLOWED_TYPES = GOVERNED_READ_TYPES;
const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

async function loadRelated(sr: any, entityType: string, record: any, committee: any) {
  if (entityType === 'Meeting') {
    const [agenda, decisions, attendance, minutes, members] = await Promise.all([
      sr.entities.AgendaItem.filter({ meeting_id: record.id }).catch(() => []),
      sr.entities.Decision.filter({ meeting_id: record.id }).catch(() => []),
      sr.entities.Attendance.filter({ meeting_id: record.id }).catch(() => []),
      sr.entities.MeetingMinutes.filter({ meeting_id: record.id }).catch(() => []),
      sr.entities.CommitteeMembership.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
    ]);
    const orderedAgenda = arr(agenda).sort((a: any, b: any) => (a.sequence || 99) - (b.sequence || 99));
    const agendaIds = orderedAgenda.map((a: any) => a.id);
    const documents = agendaIds.length
      ? arr(await sr.entities.Document.filter({ agenda_item_id: { $in: agendaIds } }).catch(() => []))
      : [];
    return {
      agenda: orderedAgenda,
      decisions: arr(decisions),
      attendance: arr(attendance),
      minutes: arr(minutes),
      members: arr(members),
      documents,
    };
  }

  if (entityType === 'Decision') {
    const [actions, votes, meeting] = await Promise.all([
      sr.entities.Action.filter({ decision_id: record.id }).catch(() => []),
      sr.entities.Vote.filter({ decision_id: record.id }).catch(() => []),
      record.meeting_id ? sr.entities.Meeting.get(record.meeting_id).catch(() => null) : Promise.resolve(null),
    ]);
    const superseding = record.superseded_by
      ? await sr.entities.Decision.get(record.superseded_by).catch(() => null)
      : null;
    return { actions: arr(actions), votes: arr(votes), meeting, superseding_decision: superseding };
  }

  if (entityType === 'MeetingMinutes') {
    const meeting = record.meeting_id
      ? await sr.entities.Meeting.get(record.meeting_id).catch(() => null)
      : null;
    const [agenda, decisions, attendance, members] = await Promise.all([
      record.meeting_id ? sr.entities.AgendaItem.filter({ meeting_id: record.meeting_id }).catch(() => []) : Promise.resolve([]),
      record.meeting_id ? sr.entities.Decision.filter({ meeting_id: record.meeting_id }).catch(() => []) : Promise.resolve([]),
      record.meeting_id ? sr.entities.Attendance.filter({ meeting_id: record.meeting_id }).catch(() => []) : Promise.resolve([]),
      sr.entities.CommitteeMembership.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
    ]);
    return {
      meeting,
      agenda: arr(agenda).sort((a: any, b: any) => (a.sequence || 99) - (b.sequence || 99)),
      decisions: arr(decisions),
      attendance: arr(attendance),
      members: arr(members),
    };
  }

  // Document
  const [versions, requests] = await Promise.all([
    sr.entities.DocumentVersion.filter({ document_id: record.id }).catch(() => []),
    sr.entities.ReviewRequest.filter({ document_id: record.id }).catch(() => []),
  ]);
  const orderedVersions = arr(versions).sort((a: any, b: any) => (b.version_number || 0) - (a.version_number || 0));
  const requestIds = arr(requests).map((r: any) => r.id);
  const responses = requestIds.length
    ? arr(await sr.entities.ReviewResponse.filter({ review_request_id: { $in: requestIds } }).catch(() => []))
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
    review_requests: arr(requests),
    review_responses: responses,
    meeting,
    decision,
  };
}

// A decision that presents as ISSUED is re-verified on every read, so a clean badge can never sit
// over contradictory evidence (P0-01). The verdict is computed in the same scope as the record and
// returned alongside it; the surface shows it, and the contradiction is never relabelled away.
async function decisionIntegrity(sr: any, record: any, committee: any) {
  const [memberships, recusals, attendance, snapshots, votes, signatures] = await Promise.all([
    sr.entities.CommitteeMembership.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
    sr.entities.Recusal.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
    record.meeting_id ? sr.entities.Attendance.filter({ meeting_id: record.meeting_id }).catch(() => []) : Promise.resolve([]),
    sr.entities.IssueSnapshot.filter({ decision_id: record.id }, { sort: '-created_date', limit: 1 }).catch(() => []),
    sr.entities.Vote.filter({ decision_id: record.id }).catch(() => []),
    sr.entities.Signature.filter({ document_type: 'Decision', document_id: record.id, status: 'active' }).catch(() => []),
  ]);
  const stored = arr(snapshots)[0] || null;
  const readiness = evaluateIssuanceReadiness({
    decision: record, committee, memberships, recusals, votes: arr(votes), attendance: arr(attendance),
    signatures: arr(signatures), proof_links: [record.legal_basis],
  });
  const verdict = issuanceVerdict({ decision: record, stored, recomputed: readiness });
  return {
    ...verdict,
    readiness: { ready: readiness.ready, blockers: readiness.blockers, completeness: readiness.completeness },
    facts: {
      electorate_size: readiness.electorate.size,
      accepted_ballot_count: readiness.ballots.accepted_count,
      rejected_ballot_count: readiness.ballots.ineligible.length + readiness.ballots.duplicates.length + readiness.ballots.malformed.length,
      tally: readiness.ballots.tally,
      quorum: readiness.quorum,
      signatures: readiness.signatures,
    },
    stored_snapshot: stored
      ? { id: stored.id, manifest_sha256: stored.manifest_sha256, issued_at: stored.issued_at, completeness_satisfied: stored.completeness_satisfied, completeness_required: stored.completeness_required, assurance_level: stored.assurance_level }
      : null,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));

    // Authority NEVER arrives in the payload. Only these two inputs are read from the request;
    // organization_id, committee_id, role, actor and every other client value are ignored — the
    // principal comes from the authenticated session or a server-issued showcase session, and the
    // committee comes from the record itself.
    const { entity_type, record_id, showcase_token, intent } = body || {};

    if (!entity_type || !record_id) {
      return Response.json({ error: 'entity_type and record_id are required' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(entity_type)) {
      return Response.json({ error: 'Unsupported record type' }, { status: 400 });
    }

    const callerUser = await base44.auth.me().catch(() => null);
    const principal = await resolvePrincipal({
      sr,
      body: { showcase_token },
      callerUser,
    });

    const record = await sr.entities[entity_type].get(record_id).catch(() => null);
    if (!record) return Response.json(refusalBody('not_found'), { status: 404 });

    const decision: any = await authorizeRead({
      base44,
      sr,
      principal,
      record,
      writeIntent: intent === 'write',
    });
    if (!decision.allowed) {
      return Response.json(refusalBody(decision.reason), { status: refusalStatus(decision.reason) });
    }

    const related = await loadRelated(sr, entity_type, record, decision.committee);
    const ctx = { rank: decision.read_rank, actorId: decision.actor?.id, showcase: decision.is_demo_mode === true };
    const gated = gateRelated(related, ctx);
    const projectedRelated = projectBundle(gated.values, ctx);
    const projectedRecord = projectRecord(record, ctx);

    // The organization behind the committee, so a legacy UNSCOPED link can recover its scope from
    // verified records rather than from browser memory (P1-01).
    const organization = decision.committee?.organization_id
      ? await sr.entities.Organization.get(decision.committee.organization_id).catch(() => null)
      : null;
    const issuance = entity_type === 'Decision' && decision.committee
      ? await decisionIntegrity(sr, record, decision.committee)
      : null;

    return Response.json({
      record: projectedRecord.values,
      committee: decision.committee,
      organization: organization ? { id: organization.id, public_id: organization.public_id || null, name_ar: organization.name_ar || null, name_en: organization.name_en || null } : null,
      issuance,
      my_role: decision.role,
      read_rank: decision.read_rank,
      capabilities: decision.capabilities,
      // The role's authority, resolved in ONE place — a surface gates its controls on this list
      // instead of hardcoding which roles may act.
      authority: decision.authority,
      actor: decision.actor,
      is_demo_mode: decision.is_demo_mode,
      data_class: decision.data_class,
      showcase: decision.showcase,
      governed: {
        withheld_keys: gated.withheld_keys,
        withheld_fields: {
          contact: projectedRecord.withheld.contact + projectedRelated.withheld.contact,
          file_refs: projectedRecord.withheld.file_refs + projectedRelated.withheld.file_refs,
          secret: projectedRecord.withheld.secret + projectedRelated.withheld.secret,
        },
      },
      ...projectedRelated.values,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}