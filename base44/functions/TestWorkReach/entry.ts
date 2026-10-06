import {
  measureReach,
  auditReach,
  assemblePersonalWork,
  WORK_REACH_VERSION,
  REACH_MAX_INTERACTIONS,
  REACH_CODES,
} from '../../shared/personalWork.ts';

// TestWorkReach — «تفاعلان للوصول إلى المهمة» (work-reach-1.0.0), Phase 1, stream A.
//
// What it proves: the reach of a work item is MEASURED from the route the item carries and from the
// record id that route must open — never asserted as a number. A route that opens the record itself
// measures two interactions; a route that lands on a committee segment measures three and is NAMED with
// its segment; a row with no route is not measured at all, and is never reported as two.
//
// What it never does: grant authority. The measure carries no capability, and every act the queue names
// is performed afterwards by its own governed command, which re-authorizes.
//
// Scope note (declared, not implied): this suite is pure policy over the assembled object. It reads no
// record and writes none, so it does not prove the reach of a persisted queue in a live session — that
// remains blocked on an authorized seated actor (D-064).

export default async function (req) {
  const results: any[] = [];
  const check = (id: string, label: string, pass: any, detail: any = null) =>
    results.push({ id, label, pass: !!pass, detail });

  const item = (over: any = {}) => ({
    id: over.id || 'action_evidence:a1',
    kind: over.kind || 'action_evidence',
    next: over.next || { capability: 'action.progress', segment: 'actions', label: { ar: '—', en: '—' } },
    source: { entity: over.entity || 'Action', id: over.sourceId === undefined ? 'a1' : over.sourceId, state: null },
    route: over.route === undefined ? '/o/org--org/c/com--com/actions' : over.route,
  });

  const recordItem = item({ route: '/o/org--org/c/com--com/decisions/d77' , sourceId: 'd77', kind: 'decision_issue' });
  const segmentItem = item({ route: '/o/org--org/c/com--com/actions', sourceId: 'a9' });
  const noRouteItem = item({ route: null, sourceId: 'a5' });
  const siblingItem = item({ route: '/o/org--org/c/com--com/actions/a10', sourceId: 'a1' });

  const mRecord = measureReach(recordItem);
  const mSegment = measureReach(segmentItem);
  const mNone = measureReach(noRouteItem);
  const mSibling = measureReach(siblingItem);

  check('WR-001', 'the reach contract declares its own version', WORK_REACH_VERSION === 'work-reach-1.0.0', WORK_REACH_VERSION);
  check('WR-002', 'the limit is declared ONCE and is two interactions (opening the queue, then the record)',
    REACH_MAX_INTERACTIONS === 2, REACH_MAX_INTERACTIONS);

  check('WR-003', 'a route that opens the record itself measures TWO interactions and is within the limit',
    mRecord.interactions === 2 && mRecord.within_max === true && mRecord.code === 'record_route', mRecord);

  check('WR-004', 'a route that lands on a committee segment measures THREE and is beyond the limit, with its segment named',
    mSegment.interactions === 3 && mSegment.within_max === false && mSegment.code === 'segment_route' && mSegment.segment === 'actions',
    mSegment);

  check('WR-005', 'a row with NO route is not measured at all — never reported as two',
    mNone.interactions === null && mNone.within_max === false && mNone.code === 'no_route', mNone);

  check('WR-006', 'the record id is matched as a PATH SEGMENT, not a substring (a1 must not pass on a10)',
    mSibling.within_max === false && mSibling.code === 'segment_route', mSibling);

  check('WR-007', 'EVERY code the measure can emit is declared in both languages, and its sentence says what it means',
    Object.keys(REACH_CODES).length === 3
    && ['record_route', 'segment_route', 'no_route'].every((c) => !!REACH_CODES[c]?.ar && !!REACH_CODES[c]?.en)
    && [mRecord, mSegment, mNone].every((m) => !!m.label?.ar && !!m.label?.en),
    Object.keys(REACH_CODES));

  const clean = auditReach([recordItem]);
  const mixed = auditReach([recordItem, segmentItem, noRouteItem]);

  check('WR-008', 'a queue within the limit reports ok — the check can PASS as well as fail',
    clean.ok === true && clean.beyond_max === 0 && clean.within_max === 1 && clean.measured === 1, clean);

  check('WR-009', 'the audit counts agree with the rows, and EVERY item beyond the limit is named with its reason',
    mixed.measured === 3 && mixed.within_max === 1 && mixed.beyond_max === 2 && mixed.ok === false
    && mixed.items_beyond_max.length === 2
    && mixed.items_beyond_max.every((r: any) => !!r.code && !!r.label?.ar && !!r.label?.en),
    mixed.items_beyond_max);

  check('WR-010', 'the measure carries NO capability: reaching a task is not authority to perform it',
    !('capability' in mRecord) && !('authority' in mRecord) && !('allowed' in mRecord), Object.keys(mRecord));

  check('WR-011', 'the assembly carries the reach of EVERY item, from the same measurement the audit uses',
    (() => {
      const assembled = assemblePersonalWork({
        actorId: 'u-1',
        actions: [{
          id: 'a1', committee_id: 'c1', owner_user_id: 'u-1', status: 'assigned', title: 'T',
          verification_state: 'not_submitted', deadline: null,
        }],
        decisions: [], minutes: [], packs: [], requests: [], seats: [], votedDecisionIds: [],
        can: () => true,
        capacityFor: () => ({ role: 'member', role_label: null, delegation: false }),
        placeFor: () => ({ committee: { id: 'c1', ref: 'com--com', name: { ar: 'ل', en: 'C' } }, organization: { id: 'o1', ref: 'org--org', name: { ar: 'ج', en: 'O' } } }),
        linkFor: () => '/o/org--org/c/com--com/actions',
      });
      const ids = assembled.items.map((i: any) => i.id).sort();
      const audited = assembled.reach.items_beyond_max.map((r: any) => r.item_id).sort();
      return assembled.items.every((i: any) => !!i.reach && i.reach.item_id === i.id)
        && assembled.reach.measured === assembled.items.length
        && ids.length === 1
        && audited.length === 1 && audited[0] === ids[0];
    })(),
    null);

  check('WR-012', 'the queue states the measure as a DECLARED one, in both languages, with its limit',
    !!mixed.note_ar && !!mixed.note_en && mixed.max_interactions === 2 && mixed.contract_version === WORK_REACH_VERSION,
    mixed.note_en);

  const failed = results.filter((r) => !r.pass);
  return Response.json({
    suite: 'TestWorkReach',
    contract_version: WORK_REACH_VERSION,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    verdict: failed.length === 0 ? 'PASS' : 'FAIL',
    failures: failed,
    writes_performed: 0,
    records_read: 0,
    scope_note:
      'Proves the REACH CONTRACT (work-reach-1.0.0) over the assembled queue object: the limit is two interactions, a record route is within it, a segment route and a route-less row are beyond it and named, and the record id is matched as a path segment rather than a substring. It reads no record and writes none, and the measure grants nothing. It does not prove the reach of a persisted queue in a live session (no authorized seated actor — D-064).',
    results,
  });
}