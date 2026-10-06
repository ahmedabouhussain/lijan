import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  INSTITUTIONAL_CHANGE_VERSION, CHANGE_KINDS, CHANGE_KIND_KEYS, INVENTORY_SOURCES,
  INVENTORY_SOURCE_KEYS, CHANGE_DISPOSITIONS, CHANGE_DISPOSITION_KEYS, LEGAL_HOLD_RULES,
  buildInventory, assessChangeDisposition, proposeForChange,
} from '../../shared/institutionalChange.ts';

// TestInstitutionalChange — the frozen CONTRACT suite for institutional-change-1.0.0 (material هـ).
//
// It proves the contract consumed by CompileChangeInventory, RecordChangeDisposition and the closure
// path: a change is never ready over an unaccounted obligation, a source that could not be read is
// never an empty source, and a legal hold is state that stops closure, transfer and expiry until the
// competent authority releases it with a reason. It reads no record and writes nothing
// (`writes_performed: 0`). A persisted inventory, a hold placed on a live obligation and browser
// behaviour are NOT TESTED (no authorized seated actor — D-064).
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases: any[] = [];
  const check = (id: string, label: string, pass: boolean, detail: any = null) => {
    cases.push({ test_id: id, label, verdict: pass ? 'PASS' : 'FAIL', detail });
  };

  const item = (type: string, id: string, extra: any = {}) => ({
    obligation_type: type, source_entity_type: extra.entity || 'Action', source_entity_id: id,
    title: extra.title || `التزام ${id}`, source_status: extra.status || 'in_progress', due_date: extra.due || null,
  });

  check('IC-001', 'the contract declares its own version', INSTITUTIONAL_CHANGE_VERSION === 'institutional-change-1.0.0', INSTITUTIONAL_CHANGE_VERSION);

  check('IC-002', 'every change kind is declared and bilingual',
    CHANGE_KIND_KEYS.length >= 7 && CHANGE_KIND_KEYS.every((k) => !!CHANGE_KINDS[k].ar && !!CHANGE_KINDS[k].en), CHANGE_KIND_KEYS);

  check('IC-003', 'a change that ends the committee says so, and one that does not says so',
    CHANGE_KINDS.merge.ends_committee === true && CHANGE_KINDS.close.ends_committee === true
    && CHANGE_KINDS.rename.ends_committee === false && CHANGE_KINDS.rename.seats_affected === false
    && CHANGE_KINDS.reconstitute.requires_handover === true, null);

  check('IC-004', 'every inventory category is declared, bilingual and names its obligation type',
    INVENTORY_SOURCES.length >= 9
    && INVENTORY_SOURCES.every((s) => !!s.ar && !!s.en && !!s.obligation_type && !!s.entity)
    && new Set(INVENTORY_SOURCE_KEYS).size === INVENTORY_SOURCES.length, INVENTORY_SOURCE_KEYS);

  check('IC-005', 'a category this build cannot read is DECLARED with its reason, never assumed clear',
    INVENTORY_SOURCES.some((s) => s.read === false && !!s.not_read_reason)
    && INVENTORY_SOURCES.filter((s) => s.read !== false).length >= 8, null);

  check('IC-006', 'every category has a proposed disposition before a human decides',
    INVENTORY_SOURCES.every((s) => CHANGE_DISPOSITION_KEYS.includes(proposeForChange(s.obligation_type))),
    INVENTORY_SOURCES.map((s) => proposeForChange(s.obligation_type)));

  const blocked = buildInventory({ change_kind: 'merge', items: [item('open_action', 'A1'), item('review_request', 'R1')], unread: [], existing: [] });
  check('IC-007', 'an obligation with no disposition BLOCKS the change, and is named',
    blocked.readiness.verdict === 'blocked' && blocked.counts.undispositioned === 2
    && blocked.undispositioned.length === 2 && blocked.readiness.code === 'undispositioned_obligations', blocked.counts);

  const partial = buildInventory({
    change_kind: 'merge',
    items: [item('open_action', 'A1'), item('review_request', 'R1')],
    unread: [],
    existing: [{ id: 'CD-1', source_entity_type: 'Action', source_entity_id: 'A1', disposition: 'assign_to_successor', decided_at: '2026-10-06T00:00:00Z', decided_by_name: 'الرئيس' }],
  });
  check('IC-008', 'a recorded disposition is carried onto the row, and the rest still block',
    partial.rows.find((r) => r.source_entity_id === 'A1')?.decided === true
    && partial.readiness.verdict === 'blocked' && partial.counts.decided === 1 && partial.counts.undispositioned === 1, partial.counts);

  const incomplete = buildInventory({
    change_kind: 'close',
    items: [item('open_action', 'A1')],
    unread: [{ source: 'Action (open obligations)', reason: 'read failed' }],
    existing: [],
  });
  check('IC-009', 'a source that could not be read makes the inventory INCOMPLETE, and that beats blocked',
    incomplete.readiness.verdict === 'incomplete' && incomplete.readiness.code === 'source_unreadable'
    && incomplete.inventory_not_read.length === 1 && incomplete.counts.unread_sources === 1, incomplete.readiness);

  const ready = buildInventory({
    change_kind: 'rename',
    items: [item('open_action', 'A1')],
    unread: [],
    existing: [{ id: 'CD-2', source_entity_type: 'Action', source_entity_id: 'A1', disposition: 'retain_with_seat', decided_at: '2026-10-06T00:00:00Z', decided_by_name: 'الأمين' }],
  });
  check('IC-010', 'a complete inventory over fully dispositioned obligations reads READY',
    ready.readiness.verdict === 'ready' && ready.counts.decided === 1 && ready.counts.unread_sources === 0, ready.readiness);

  const held = buildInventory({
    change_kind: 'close',
    items: [item('open_action', 'A1'), item('open_action', 'A2')],
    unread: [],
    existing: [{ id: 'CD-3', source_entity_type: 'Action', source_entity_id: 'A2', disposition: 'legal_hold', legal_hold: true, legal_hold_reason: 'نزاع قضائي', decided_at: '2026-10-06T00:00:00Z', decided_by_name: 'الرئيس' }],
  });
  check('IC-011', 'held obligations are SEPARATED on the inventory instead of mixed with ordinary ones',
    held.counts.held === 1 && held.held[0].legal_hold_reason === 'نزاع قضائي' && held.counts.decided === 1, held.counts);

  const noReason = assessChangeDisposition({ obligation_type: 'open_action', disposition: 'legal_hold' });
  check('IC-012', 'placing a hold without its reason is refused',
    noReason.ok === false && noReason.code === 'hold_reason_required', noReason.code);

  const holdClose = assessChangeDisposition({ obligation_type: 'open_action', disposition: 'expire', legal_hold_active: true });
  check('IC-013', 'a hold refuses any disposition that would close or expire the obligation',
    holdClose.ok === false && holdClose.code === 'hold_active' && holdClose.status === 409, holdClose.code);

  const holdTransfer = assessChangeDisposition({ obligation_type: 'document_custody', disposition: 'assign_to_successor', legal_hold_active: true });
  check('IC-014', 'a hold refuses a TRANSFER as well as a closure',
    holdTransfer.ok === false && holdTransfer.code === 'hold_active', holdTransfer.code);

  const releaseNoReason = assessChangeDisposition({ obligation_type: 'open_action', disposition: 'legal_hold', legal_hold_active: true, release: true, release_reason: '  ' });
  check('IC-015', 'releasing a hold without a reason is refused',
    releaseNoReason.ok === false && releaseNoReason.code === 'hold_release_reason_required', releaseNoReason.code);

  const releaseNothing = assessChangeDisposition({ obligation_type: 'open_action', disposition: 'legal_hold', legal_hold_active: false, release: true, release_reason: 'انتهى النزاع' });
  check('IC-016', 'releasing a hold that is not active is refused',
    releaseNothing.ok === false && releaseNothing.code === 'hold_not_active' && releaseNothing.status === 409, releaseNothing.code);

  const released = assessChangeDisposition({ obligation_type: 'open_action', disposition: 'legal_hold', legal_hold_active: true, release: true, release_reason: 'انتهى النزاع بحكم' });
  check('IC-017', 'releasing a hold returns the obligation to ordinary treatment and does NOT close it',
    released.ok === true && released.effect === 'hold_released' && released.closes_obligation === false, released.effect);

  check('IC-018', 'the hold rules are stated as data: they never lapse, never expire silently, and survive a change',
    LEGAL_HOLD_RULES.blocks_closure === true && LEGAL_HOLD_RULES.blocks_transfer === true
    && LEGAL_HOLD_RULES.blocks_expiry === true && LEGAL_HOLD_RULES.blocks_deletion === true
    && LEGAL_HOLD_RULES.lapses_by_itself === false && LEGAL_HOLD_RULES.expiry_silent === false
    && LEGAL_HOLD_RULES.release_closes_the_obligation === false && LEGAL_HOLD_RULES.survives_committee_change === true,
    LEGAL_HOLD_RULES);

  const unknownType = assessChangeDisposition({ obligation_type: 'not_a_category', disposition: 'expire' });
  check('IC-019', 'an obligation category outside the contract is refused',
    unknownType.ok === false && unknownType.code === 'obligation_type_unknown', unknownType.code);

  const unknownDisposition = assessChangeDisposition({ obligation_type: 'open_action', disposition: 'delete_it' });
  check('IC-020', 'a disposition outside the contract is refused — there is no delete',
    unknownDisposition.ok === false && unknownDisposition.code === 'disposition_unknown', unknownDisposition.code);

  const assign = assessChangeDisposition({ obligation_type: 'open_action', disposition: 'assign_to_successor' });
  check('IC-021', 'assigning to a successor is reported as needing one',
    assign.ok === true && assign.needs_successor === true && assign.effect === 'disposition_recorded', assign.needs_successor);

  check('IC-022', 'no disposition in the contract deletes anything',
    CHANGE_DISPOSITION_KEYS.every((k) => !/delete|remove/.test(k)) && blocked.no_deletion.ar.length > 0, CHANGE_DISPOSITION_KEYS);

  const passed = cases.filter((c) => c.verdict === 'PASS').length;
  const failed = cases.length - passed;
  return Response.json({
    suite: 'TestInstitutionalChange',
    contract_version: INSTITUTIONAL_CHANGE_VERSION,
    total: cases.length,
    passed,
    failed,
    verdict: failed === 0 ? 'PASS' : 'FAIL',
    failures: cases.filter((c) => c.verdict === 'FAIL'),
    writes_performed: 0,
    records_read: 0,
    scope_note: 'Proves the CONTRACT consumed by CompileChangeInventory, RecordChangeDisposition and the closure path of CloseAction. A persisted inventory, a hold placed on a live obligation and browser behaviour are NOT TESTED (no authorized seated actor).',
    results: cases,
  });
}