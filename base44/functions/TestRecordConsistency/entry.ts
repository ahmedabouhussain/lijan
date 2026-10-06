import {
  evaluateConsistency, auditConsistencyContract, CONSISTENCY_RULES, CONSISTENCY_SEVERITIES,
  RECORD_CONSISTENCY_VERSION,
} from '../../shared/recordConsistency.ts';

// TestRecordConsistency — المادة و: هل تكشف قواعد الاتساق الانحراف، وهل تصمت حين لا تعرف؟
//
// Fixtures only: the evaluator is a pure function over records that were already read, so each rule is
// exercised with the exact record that violates it, each rule is shown to PASS a clean committee, and —
// the hardest property — a rule whose source could not be read is reported NOT EVALUATED with the source
// named, never as "no violation".
//
// Scope note (declared): pure contract policy. No record is read here and none is written, so this does
// not prove the check against a persisted committee — that is the governed command's read, and it stays
// bounded and declared (seated-actor blocker D-064 does not apply to reading, only to proving journeys).

export default async function (req) {
  const results: any[] = [];
  const check = (id: string, label: string, pass: any, detail: any = null) =>
    results.push({ id, label, pass: !!pass, detail });

  const CLEAN: any = {
    actions: [{ id: 'a-ok', status: 'closed', verification_state: 'accepted', verified_by_user_id: 'u-2', evidence_submitted_by_user_id: 'u-1' }],
    decisions: [{ id: 'd-ok', issuance_state: 'complete', issue_snapshot_id: 's-1', issue_manifest_sha256: 'sha', round_snapshot_id: 'e-1', issued_at: '2026-10-01T00:00:00Z' }],
    snapshots: [{ id: 's-1', manifest_sha256: 'sha', accepted_ballot_count: 3, electorate_size: 5 }],
    votes: [{ id: 'v-ok', eligible_voter_snapshot_id: 'e-1', voter_membership_id: 'm-1', voter_user_id: 'u-1' }],
    attendance: [{ id: 'att-ok', member_id: 'm-1', attendance_status: 'present' }],
    rounds: [{ id: 'r-ok', state: 'approved', eligible_seat_ids: ['m-1'], eligible_count: 1, finalized_by_user_id: 'u-9', dispatch_authorized_by_user_id: 'u-8' }],
    electorates: [{ id: 'e-ok', eligible_seat_ids: ['m-1', 'm-2'], non_voting_seat_ids: ['m-2'], eligible_count: 1 }],
    handovers: [{ id: 'h-ok', status: 'accepted', items_total: 3, items_assigned: 3, items_unresolved: 0 }],
    dispositions: [],
    memberships: [{ id: 'mem-ok', status: 'active', appointment_type: 'acting', acting_expires_at: '2026-12-31T00:00:00Z' }],
  };

  const clean = evaluateConsistency(CLEAN);

  check('RC-001', 'the consistency contract declares its own version', clean.contract_version === 'record-consistency-1.0.0', clean.contract_version);

  check('RC-002', 'a committee whose records agree reports CONSISTENT — the check can pass, not only fail',
    clean.verdict === 'consistent' && clean.violations.length === 0 && clean.not_evaluated.length === 0,
    { verdict: clean.verdict, evaluated: clean.rules_evaluated.length });

  check('RC-003', 'every declared rule is exercised by at least one fixture and every rule is executable, bilingual and source-named',
    auditConsistencyContract().ok === true && auditConsistencyContract().rules === CONSISTENCY_RULES.length
    && CONSISTENCY_RULES.every((r: any) => r.ar && r.en && (r.reads || []).length)
    && Object.keys(CONSISTENCY_SEVERITIES).length === 2,
    auditConsistencyContract());

  check('RC-004', 'a closed action WITHOUT an accepted verdict is caught (RC-01)',
    evaluateConsistency({ ...CLEAN, actions: [{ id: 'a-1', status: 'closed', verification_state: 'submitted' }] }).violations.some((x: any) => x.rule_id === 'RC-01'),
    evaluateConsistency({ ...CLEAN, actions: [{ id: 'a-1', status: 'closed', verification_state: 'submitted' }] }).violations);

  check('RC-005', 'the submitter appearing as the verifier is caught (RC-02)',
    evaluateConsistency({ ...CLEAN, actions: [{ id: 'a-2', status: 'under_review', verification_state: 'accepted', verified_by_user_id: 'u-1', evidence_submitted_by_user_id: 'u-1' }] })
      .violations.some((x: any) => x.rule_id === 'RC-02'),
    null);

  check('RC-006', 'an action closed under a STANDING legal hold is caught, and a released hold is not (RC-03)',
    evaluateConsistency({ ...CLEAN, actions: [{ id: 'a-3', status: 'closed', verification_state: 'accepted' }], dispositions: [{ source_entity_type: 'Action', source_entity_id: 'a-3', legal_hold: true }] })
      .violations.some((x: any) => x.rule_id === 'RC-03')
    && !evaluateConsistency({ ...CLEAN, actions: [{ id: 'a-3', status: 'closed', verification_state: 'accepted' }], dispositions: [{ source_entity_type: 'Action', source_entity_id: 'a-3', legal_hold: true, hold_released_at: '2026-09-01T00:00:00Z' }] })
      .violations.some((x: any) => x.rule_id === 'RC-03'),
    null);

  check('RC-007', 'a "complete" issuance with no package id, no fingerprint, or no matching package record is caught (RC-04)',
    evaluateConsistency({ ...CLEAN, decisions: [{ id: 'd-1', issuance_state: 'complete' }] }).violations.some((x: any) => x.rule_id === 'RC-04')
    && evaluateConsistency({ ...CLEAN, decisions: [{ id: 'd-2', issuance_state: 'complete', issue_snapshot_id: 's-missing', issue_manifest_sha256: 'sha' }] }).violations.some((x: any) => x.rule_id === 'RC-04'),
    null);

  check('RC-008', 'an issued decision with no bound round is ADVISORY, not a blocking verdict (RC-05 — a legacy package may be unbound)',
    (() => {
      const rep = evaluateConsistency({ ...CLEAN, decisions: [{ id: 'd-3', issued_at: '2026-08-01T00:00:00Z' }] });
      const hit = rep.violations.find((x: any) => x.rule_id === 'RC-05');
      return !!hit && hit.severity === 'advisory' && rep.blocking_count === 0;
    })(), null);

  check('RC-009', 'a package with no manifest fingerprint, or with accepted ballots beyond the electorate, is caught (RC-06)',
    evaluateConsistency({ ...CLEAN, snapshots: [{ id: 's-2' }] }).violations.some((x: any) => x.rule_id === 'RC-06')
    && evaluateConsistency({ ...CLEAN, snapshots: [{ id: 's-3', manifest_sha256: 'sha', accepted_ballot_count: 9, electorate_size: 5 }] }).violations.some((x: any) => x.rule_id === 'RC-06'),
    null);

  check('RC-010', 'a ballot with no frozen round, no seat or no person is caught, and the detail names exactly what is missing (RC-07)',
    (() => {
      const rep = evaluateConsistency({ ...CLEAN, votes: [{ id: 'v-1', voter_user_id: 'u-1' }] });
      const hit = rep.violations.find((x: any) => x.rule_id === 'RC-07');
      return !!hit && /دورة مجمّدة/.test(hit.detail_ar) && /مقعد/.test(hit.detail_ar) && !/شخص/.test(hit.detail_ar);
    })(), null);

  check('RC-011', 'an attendance row with no seat is caught — presence without a seat cannot carry a quorum (RC-08)',
    evaluateConsistency({ ...CLEAN, attendance: [{ id: 'att-1', attendance_status: 'present' }] }).violations.some((x: any) => x.rule_id === 'RC-08'), null);

  check('RC-012', 'a non-voting seat lying OUTSIDE the eligible set is caught — an electorate is never reduced silently (RC-09)',
    evaluateConsistency({ ...CLEAN, electorates: [{ id: 'e-2', eligible_seat_ids: ['m-1'], non_voting_seat_ids: ['m-9'] }] }).violations.some((x: any) => x.rule_id === 'RC-09'), null);

  check('RC-013', 'a dispatched circulation round on an empty electorate or a zero voting count is caught (RC-10)',
    evaluateConsistency({ ...CLEAN, rounds: [{ id: 'r-2', state: 'dispatched', eligible_seat_ids: [], eligible_count: 0 }] }).violations.some((x: any) => x.rule_id === 'RC-10'), null);

  check('RC-014', 'an approved round finalized by its own dispatcher is ADVISORY — the policy may authorize it, so no automated verdict is passed (RC-11)',
    (() => {
      const rep = evaluateConsistency({ ...CLEAN, rounds: [{ id: 'r-3', state: 'approved', eligible_seat_ids: ['m-1'], eligible_count: 1, finalized_by_user_id: 'u-8', dispatch_authorized_by_user_id: 'u-8' }] });
      const hit = rep.violations.find((x: any) => x.rule_id === 'RC-11');
      return !!hit && hit.severity === 'advisory';
    })(), null);

  check('RC-015', 'an accepted handover holding unresolved items, or whose arithmetic does not add up, is caught (RC-12)',
    evaluateConsistency({ ...CLEAN, handovers: [{ id: 'h-2', status: 'accepted', items_total: 3, items_assigned: 3, items_unresolved: 1 }] }).violations.filter((x: any) => x.rule_id === 'RC-12').length >= 2, null);

  check('RC-016', 'a bounded (acting) appointment with no expiry is caught (RC-13)',
    evaluateConsistency({ ...CLEAN, memberships: [{ id: 'mem-2', appointment_type: 'acting' }] }).violations.some((x: any) => x.rule_id === 'RC-13'), null);

  check('RC-017', 'A FAILED READ IS NOT AN ABSENCE: a rule whose source could not be read is reported NOT EVALUATED with the source named',
    (() => {
      const rep = evaluateConsistency({ ...CLEAN, actions: [{ id: 'a-1', status: 'closed', verification_state: 'submitted' }], unreadable: [{ source: 'actions', reason: 'read failed' }] });
      return rep.verdict === 'partial'
        && rep.violations.some((x: any) => x.rule_id === 'RC-01') === false
        && rep.not_evaluated.some((r: any) => r.rule_id === 'RC-01' && r.missing_sources.includes('actions'))
        && !rep.rules_evaluated.includes('RC-01');
    })(), null);

  check('RC-018', 'the report states that it is a CHECK and writes nothing — prevention lives in the commands',
    !!clean.note_ar && !!clean.note_en && /لا يكتب|writes nothing/.test(`${clean.note_ar} ${clean.note_en}`)
    && !('write' in clean) && clean.violations.every((x: any) => !('write' in x)),
    clean.note_en);

  const failed = results.filter((r) => !r.pass);
  return Response.json({
    suite: 'TestRecordConsistency',
    contract_version: RECORD_CONSISTENCY_VERSION,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    verdict: failed.length === 0 ? 'PASS' : 'FAIL',
    failures: failed,
    writes_performed: 0,
    records_read: 0,
    scope_note:
      'Proves the consistency contract (record-consistency-1.0.0) over fixtures: each rule catches the record that violates it, each rule passes a clean committee, advisory rules stay advisory (a legacy package and a policy-authorized finalizer), and a rule whose source could not be read is NOT EVALUATED with the source named. It reads no record and writes none, so it does not prove the check against a persisted committee — that read is the governed command\'s, bounded and declared.',
    results,
  });
}