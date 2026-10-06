import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { DONE_STATUSES } from '../../shared/actionState.ts';
import {
  INSTITUTIONAL_CHANGE_VERSION, CHANGE_KINDS, INVENTORY_SOURCES, buildInventory,
} from '../../shared/institutionalChange.ts';

// CompileChangeInventory — the MANDATORY enumeration of a committee's open obligations before it is
// changed (material هـ, brief rev 5).
//
// Governed read: `committee.manage` on the committee itself, so only the competent authority may
// enumerate, and the scope is the committee record — never a request field.
//
// TWO RULES KEPT IN THE CODE:
//   • Every source is read behind a wrapper that NAMES a failure. A source that could not be read is
//     returned as unresolved and it makes the inventory INCOMPLETE — it never becomes an empty source,
//     because an empty list would read as "all clear".
//   • A source this build implements no read for (pending signatures) is reported with its reason. It
//     makes the inventory incomplete by design rather than pretending the category is clear.
//
// This function writes nothing: the dispositions are recorded by RecordChangeDisposition, and each of
// them is judged there against the same contract.

const DECISION_OPEN = ['draft', 'in_review', 'proposed', 'voting', 'approved'];
const AGENDA_OPEN = ['pending', 'in_discussion', 'deferred'];
const MEETING_OPEN = ['scheduled', 'in_progress'];
const HANDOVER_OPEN = ['pending_acceptance', 'partially_accepted', 'returned'];
const REVIEW_OPEN = ['pending', 'accepted', 'in_review', 'overdue'];
const MAX_ROWS = 500;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({})) || {};

    const changeKind = typeof body.change_kind === 'string' ? body.change_kind : '';
    if (!changeKind) return Response.json({ error: 'A change kind must be named', error_ar: 'يجب تسمية نوع التغيير', code: 'change_kind_required', supported: Object.keys(CHANGE_KINDS) }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: typeof body.committee_id === 'string' ? body.committee_id : '',
    });
    if (!auth.allowed) return refusalResponse(auth);
    const committeeId = auth.trusted_target.derived_committee_id;

    const unread: any[] = [];
    const read = async (source: string, promise: Promise<any>) => {
      try {
        const rows = await promise;
        return Array.isArray(rows) ? rows : (rows?.items || []);
      } catch (e) {
        unread.push({ source, reason: e?.message || 'read failed' });
        return [];
      }
    };

    const [actions, agendaItems, decisions, meetings, handovers, delegations, reviews, documents] = await Promise.all([
      read('Action (open obligations)', sr.entities.Action.filter({ committee_id: committeeId, status: { $nin: DONE_STATUSES } }, { limit: MAX_ROWS })),
      read('AgendaItem (open items)', sr.entities.AgendaItem.filter({ committee_id: committeeId, status: { $in: AGENDA_OPEN } }, { limit: MAX_ROWS })),
      read('Decision (unfinished)', sr.entities.Decision.filter({ committee_id: committeeId, status: { $in: DECISION_OPEN } }, { limit: MAX_ROWS })),
      read('Meeting (upcoming or running)', sr.entities.Meeting.filter({ committee_id: committeeId, status: { $in: MEETING_OPEN } }, { limit: MAX_ROWS })),
      read('HandoverPack (unaccepted)', sr.entities.HandoverPack.filter({ committee_id: committeeId, status: { $in: HANDOVER_OPEN } }, { limit: MAX_ROWS })),
      read('Delegation (in force)', sr.entities.Delegation.filter({ committee_id: committeeId, status: 'active' }, { limit: MAX_ROWS })),
      read('ReviewRequest (open)', sr.entities.ReviewRequest.filter({ committee_id: committeeId, status: { $in: REVIEW_OPEN } }, { limit: MAX_ROWS })),
      read('Document (custody)', sr.entities.Document.filter({ committee_id: committeeId }, { limit: MAX_ROWS })),
    ]);

    // Sources with no read in this build are named, and they make the inventory incomplete.
    for (const source of INVENTORY_SOURCES.filter((s) => s.read === false)) {
      unread.push({ source: `${source.en} (${source.entity})`, reason: source.not_read_reason });
    }

    const items: any[] = [];
    const push = (obligation_type: string, entity: string, rows: any[], titleOf: (r: any) => string, statusOf: (r: any) => string, dueOf: (r: any) => any) => {
      for (const r of rows) {
        items.push({
          obligation_type, source_entity_type: entity, source_entity_id: r.id,
          title: titleOf(r) || `${entity} ${r.id}`,
          source_status: statusOf(r) || null,
          due_date: dueOf(r) || null,
        });
      }
    };
    push('open_action', 'Action', actions, (r) => r.title_ar || r.title, (r) => r.status, (r) => r.deadline);
    push('agenda_item', 'AgendaItem', agendaItems, (r) => r.title_ar || r.title, (r) => r.status, (r) => r.scheduled_date || r.meeting_date);
    push('open_decision', 'Decision', decisions, (r) => r.title_ar || r.title, (r) => r.status, (r) => r.deadline);
    push('upcoming_meeting', 'Meeting', meetings, (r) => r.title_ar || r.title, (r) => r.status, (r) => r.date || r.scheduled_date);
    push('open_handover', 'HandoverPack', handovers, (r) => `حزمة تسليم — ${r.items_total || 0} التزامًا`, (r) => r.status, (r) => r.effective_date);
    push('active_delegation', 'Delegation', delegations, (r) => `تفويض إلى ${r.to_member_name || r.to_user_id || '—'}`, (r) => r.status, (r) => r.end_date);
    push('review_request', 'ReviewRequest', reviews, (r) => `طلب مراجعة (${r.review_type || 'عام'})`, (r) => r.status, (r) => r.due_date);
    push('document_custody', 'Document', documents, (r) => r.title_ar || r.title, (r) => r.status || 'in_custody', () => null);

    const existing = await read('ChangeDisposition (decided dispositions for this change)',
      sr.entities.ChangeDisposition.filter({ committee_id: committeeId, change_kind: changeKind }, { limit: MAX_ROWS }));

    const inventory = buildInventory({ change_kind: changeKind, items, unread, existing });

    return Response.json({
      status: 'ok',
      generated_at: new Date().toISOString(),
      committee: { id: committeeId, name: committeeId ? (auth.target?.name_ar || auth.target?.name) : null },
      authority: { capability: 'committee.manage', policy_version: auth.policy_version, effective_role: auth.effective_role },
      ...inventory,
      source_catalogue: INVENTORY_SOURCES.map((s) => ({ key: s.key, ar: s.ar, en: s.en, read: s.read !== false })),
    });
  } catch (error) {
    return Response.json({ error: error.message, contract_version: INSTITUTIONAL_CHANGE_VERSION }, { status: 500 });
  }
}