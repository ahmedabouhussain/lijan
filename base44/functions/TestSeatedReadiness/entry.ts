import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  SEATED_RUNS, SEATED_READINESS_VERSION, READINESS_VERDICTS, BLOCKING_CODES, ENABLERS,
  DEFAULT_QUORUM, USER_DIRECTORY_LABEL,
  assessSeatedReadiness, assessOfficerRight, declaredRight, summarizeReadiness,
} from '../../shared/seatedReadiness.ts';
import { GOVERNANCE_SURFACES } from '../../shared/governanceSurfaceRegistry.ts';
import { computeElectorate } from '../../shared/voteEligibility.ts';
import { capabilitiesForRole } from '../../shared/authorityKernel.ts';

// TestSeatedReadiness — the contract of the seated-actor measure (S22 · seated-readiness-1.0.0).
//
// It proves the PROPERTY the measure exists for: readiness is computed from records by the same rule the
// vote command uses, a seat counts as workable only when it is bound to a real account, and any source
// that could not be read makes the committee unmeasurable instead of zero. Reads no record and writes
// none (`writes_performed: 0`, `records_read: 0`) — every input is constructed in the test.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases: any[] = [];
  const check = (id: string, label: string, pass: boolean, detail: any = null) => cases.push({ test_id: id, label, verdict: pass ? 'PASS' : 'FAIL', detail });

  const DAY = '2026-10-06';
  const users = new Set(['u1', 'u2', 'u3', 'u4']);
  const seat = (id: string, o: any = {}) => ({
    id, committee_id: 'c1', status: 'active', voting_right: true, role: 'member',
    user_id: `u${id}`, term_start: '2026-01-01', term_end: '2027-01-01', ...o,
  });
  const committee = { id: 'c1', name_ar: 'لجنة الاختبار', quorum_count: 3 };
  const chair = seat('1', { role: 'chair', user_id: 'u1' });
  const m2 = seat('2', { user_id: 'u2' });
  const m3 = seat('3', { user_id: 'u3' });
  const assess = (o: any = {}) => assessSeatedReadiness({ committee, recusals: [], day: DAY, users_known: users, ...o });

  const zero = assess({ seats: [] });
  const below = assess({ seats: [chair, m2] });
  const belowBound = assess({ seats: [chair, m2, m3], users_known: new Set(['u1']) });
  const full = assess({ seats: [chair, m2, m3], policy_present: true, open_obligations: 2 });
  const unreadable = assess({ seats: [chair, m2, m3], sources_unread: ['CommitteeMembership (سجل المقاعد)'] });
  const noOfficer = assess({ seats: [seat('2'), seat('3'), seat('4', { user_id: 'u4' })] });
  const policyMissing = assess({ seats: [chair, m2, m3], policy_present: false });
  const noObligation = assess({ seats: [chair, m2, m3], policy_present: true, open_obligations: 0 });
  const noDirectory = assess({ seats: [chair, m2, m3], users_known: null });

  check('SR-001', 'the contract declares its own version', SEATED_READINESS_VERSION === 'seated-readiness-1.0.0', SEATED_READINESS_VERSION);

  check('SR-002', 'every run states what it proves, the commands it would execute, its precondition and its enabler',
    SEATED_RUNS.every((r: any) => !!r.id && !!r.ar && !!r.en && !!r.proves_ar && !!r.proves_en
      && Array.isArray(r.steps) && r.steps.length >= 2 && !!r.authority_command
      && Array.isArray(r.requires) && r.requires.length > 0
      && !!r.precondition_ar && !!r.precondition_en && !!r.enabling_ar && !!r.enabling_en), SEATED_RUNS.length);

  check('SR-003', 'no two runs share an id',
    new Set(SEATED_RUNS.map((r: any) => r.id)).size === SEATED_RUNS.length, SEATED_RUNS.map((r: any) => r.id));

  check('SR-004', 'every command a run would execute is a governed command the register declares, and none deletes a record',
    SEATED_RUNS.every((r: any) => r.steps.every((c: string) => GOVERNANCE_SURFACES.some((s) => s.command === c)))
    && SEATED_RUNS.every((r: any) => r.steps.every((c: string) => !/Delete|Remove/.test(c))), null);

  check('SR-005', 'the right each run depends on comes from the register and was re-derived from its command',
    SEATED_RUNS.every((r: any) => {
      const d = declaredRight(r.authority_command);
      return !!d.capability && d.source === 'verified' && !!d.surface;
    }), SEATED_RUNS.map((r: any) => `${r.id}:${declaredRight(r.authority_command).capability}/${declaredRight(r.authority_command).source}`));

  check('SR-006', 'a committee with no seat at all reads ZERO ELECTORATE, never a readiness',
    zero.verdict === 'insufficient_seated_voters' && zero.reason_code === 'zero_electorate' && zero.ready_runs.length === 0,
    { verdict: zero.verdict, reason: zero.reason_code });

  check('SR-007', 'an electorate below the quorum names both numbers',
    below.verdict === 'insufficient_seated_voters' && below.reason_code === 'quorum_above_electorate'
    && below.eligible_seats === 2 && below.quorum_required === 3 && below.eligible_seats < below.quorum_required,
    { eligible: below.eligible_seats, quorum: below.quorum_required });

  check('SR-008', 'eligible seats that nobody holds is a DIFFERENT fact from too few seats: eligible, bound and quorum are all named',
    belowBound.verdict === 'insufficient_seated_voters' && belowBound.reason_code === 'binding_below_quorum'
    && belowBound.eligible_seats === 3 && belowBound.bound_seats === 1 && belowBound.quorum_required === 3
    && !!belowBound.enabling_action_text?.ar && !!belowBound.enabling_action_text?.en,
    { eligible: belowBound.eligible_seats, bound: belowBound.bound_seats, quorum: belowBound.quorum_required });

  check('SR-009', 'a committee whose quorum is bound to real accounts holds EVERY run ready (given its policy and one obligation)',
    full.verdict === 'executable' && full.ready_runs.length === SEATED_RUNS.length && full.blocked_runs.length === 0,
    full.ready_runs);

  const votingSeats = [chair, m2, m3, seat('9', { term_end: '2026-01-01' })];
  const outOfTerm = assess({ seats: votingSeats });
  const outOfTermRule = computeElectorate({ seats: votingSeats.filter((s) => s.status === 'active' && s.voting_right !== false), recusals: [], day: DAY });
  check('SR-010', 'a seat outside its term is excluded, and the measure agrees seat-for-seat with the rule the vote command uses',
    outOfTerm.eligible_seats === 3
    && JSON.stringify(outOfTerm.eligible_seat_ids) === JSON.stringify(outOfTermRule.eligible_seat_ids)
    && outOfTerm.excluded.out_of_term === 1, { eligible: outOfTerm.eligible_seats, rule: outOfTermRule.size });

  const recusedInput = { seats: [chair, m2, m3], recusals: [{ id: 'r1', committee_id: 'c1', status: 'active', membership_id: '2' }] };
  const recused = assess(recusedInput);
  const recusedRule = computeElectorate({ seats: recusedInput.seats, recusals: recusedInput.recusals, day: DAY });
  check('SR-011', 'a recused seat is excluded by IDENTIFIER, and again the measure equals the vote rule',
    recused.eligible_seats === 2 && recused.excluded.recused_by_identifier === 1
    && JSON.stringify(recused.eligible_seat_ids) === JSON.stringify(recusedRule.eligible_seat_ids), recused.eligible_seat_ids);

  check('SR-012', 'a source that could not be read makes the committee UNMEASURABLE: the source is named and no run is reported ready',
    unreadable.verdict === 'unreadable' && unreadable.readable === false
    && unreadable.unread_sources.length === 1 && unreadable.ready_runs.length === 0
    && unreadable.runs.every((r: any) => r.blocking_code === 'readiness_unverifiable'),
    { verdict: unreadable.verdict, sources: unreadable.unread_sources });

  const demo = assess({ seats: [chair, seat('2', { user_id: 'u2', is_demonstration_role: true }), m3] });
  check('SR-013', 'a demonstration seat is never counted as workable, even when its user id exists',
    demo.bound_seats === 2 && demo.demonstration_seats === 1 && demo.verdict === 'insufficient_seated_voters',
    { bound: demo.bound_seats, demonstration: demo.demonstration_seats });

  const noQuorumField = assess({ committee: { id: 'c1' }, seats: [chair, m2, m3] });
  check('SR-014', 'the threshold is the committee\'s own, and when absent the declared default is used and NAMED',
    noQuorumField.quorum_required === DEFAULT_QUORUM && noQuorumField.quorum_source === 'readiness_default'
    && full.quorum_source === 'committee.quorum_count',
    { required: noQuorumField.quorum_required, source: noQuorumField.quorum_source });

  check('SR-015', 'seats bound but nobody holding the right blocks the officer runs, while the seat verdict stays executable',
    noOfficer.verdict === 'executable'
    && noOfficer.runs.filter((r: any) => r.blocking_code === 'no_seated_officer').length >= 3
    && noOfficer.ready_runs.length === 0,
    noOfficer.runs.map((r: any) => `${r.id}:${r.blocking_code}`));

  check('SR-016', 'the officer test reads the KERNEL\'s own role baseline, not a second copy of it',
    assessOfficerRight({ command: 'CloseCommittee', bound_seats: [{ id: 's1', role: 'chair' }] }).ok === true
    && assessOfficerRight({ command: 'CloseCommittee', bound_seats: [{ id: 's2', role: 'observer' }] }).code === 'no_seated_officer'
    && capabilitiesForRole('chair').includes('committee.close') === true,
    { chair_has_close: capabilitiesForRole('chair').includes('committee.close'), observer_has_close: capabilitiesForRole('observer').includes('committee.close') });

  const chairOnly = assess({ seats: [chair] });
  check('SR-017', 'runs differ in what they need: with one bound chair the minutes run is ready while the voting run is not',
    chairOnly.runs.find((r: any) => r.id === 'D3').status === 'ready'
    && chairOnly.runs.find((r: any) => r.id === 'D2').status === 'blocked'
    && chairOnly.runs.find((r: any) => r.id === 'D2').blocking_code === 'quorum_above_electorate',
    chairOnly.runs.map((r: any) => `${r.id}:${r.status}`));

  const policyUnread = assess({ seats: [chair, m2, m3], policy_unread: true });
  check('SR-018', 'the circulation run rests on the institution\'s OWN policy: absent, unreadable and present are three different answers',
    policyMissing.runs.find((r: any) => r.id === 'D4').blocking_code === 'policy_row_missing'
    && policyUnread.runs.find((r: any) => r.id === 'D4').blocking_code === 'policy_state_unread'
    && full.runs.find((r: any) => r.id === 'D4').status === 'ready'
    && policyMissing.runs.find((r: any) => r.id === 'D2').status === 'ready',
    { missing: policyMissing.runs.find((r: any) => r.id === 'D4').blocking_code, unread: policyUnread.runs.find((r: any) => r.id === 'D4').blocking_code });

  const obligationsUnread = assess({ seats: [chair, m2, m3], policy_present: true, obligations_unread: true });
  const oneObligation = assess({ seats: [chair, m2, m3], policy_present: true, open_obligations: 1 });
  check('SR-019', 'the extract run needs a real open obligation: none, unreadable and one are three different answers',
    noObligation.runs.find((r: any) => r.id === 'D6').blocking_code === 'no_open_obligation'
    && obligationsUnread.runs.find((r: any) => r.id === 'D6').blocking_code === 'obligation_state_unread'
    && oneObligation.runs.find((r: any) => r.id === 'D6').status === 'ready',
    { none: noObligation.runs.find((r: any) => r.id === 'D6').blocking_code, one: oneObligation.runs.find((r: any) => r.id === 'D6').status });

  check('SR-020', 'a right the register has not re-derived blocks its run, and an undeclared right is refused outright',
    assessOfficerRight({ command: 'CloseCommittee', bound_seats: [{ id: 's1', role: 'chair' }], surface_override: { capability: 'committee.close', capability_source: 'unverified' } }).code === 'officer_right_unverified'
    && assessOfficerRight({ command: 'NoSuchCommandAtAll', bound_seats: [{ id: 's1', role: 'chair' }] }).code === 'officer_right_undeclared', null);

  check('SR-021', 'the measure is pure: the same records give the same answer',
    JSON.stringify(assess({ seats: [chair, m2, m3], policy_present: true, open_obligations: 2 })) === JSON.stringify(full), null);

  const produced = new Set<string>();
  for (const s of [zero, below, belowBound, unreadable, noOfficer, policyMissing, noObligation, noDirectory, demo]) {
    if (s.reason_code) produced.add(s.reason_code);
    for (const r of s.runs) if (r.blocking_code) produced.add(r.blocking_code);
  }
  produced.add('officer_right_unverified');
  produced.add('officer_right_undeclared');
  check('SR-022', 'every blocking code the measure can produce is declared, with its bilingual sentence',
    [...produced].every((c) => !!BLOCKING_CODES[c]?.ar && !!BLOCKING_CODES[c]?.en), [...produced]);

  check('SR-023', 'an unread account directory is a fact about the ACCOUNTS, never a zero: the bound count is null and the source is named',
    noDirectory.bound_seats === null && noDirectory.binding_state === 'unverified' && noDirectory.verdict === 'unreadable'
    && noDirectory.unread_sources.includes(USER_DIRECTORY_LABEL), { bound: noDirectory.bound_seats, sources: noDirectory.unread_sources });

  check('SR-024', 'a verdict is never returned without its numbers, and every verdict is declared bilingually',
    [zero, below, belowBound, full, unreadable, noOfficer].every((s) => typeof s.eligible_seats === 'number' && typeof s.quorum_required === 'number'
      && !!READINESS_VERDICTS[s.verdict]?.ar && !!READINESS_VERDICTS[s.verdict]?.en)
    && Object.keys(READINESS_VERDICTS).length === 3, Object.keys(READINESS_VERDICTS));

  const summary = summarizeReadiness([full, { committee_id: 'c2', readable: false, measured: false, code: 'target_not_found' }]);
  check('SR-025', 'a committee that could not be measured is counted as unread, and the totals carry their parts',
    summary.committees === 2 && summary.not_readable === 1 && summary.executable === 1
    && summary.eligible_seats === full.eligible_seats && summary.bound_seats === full.bound_seats,
    summary);

  check('SR-026', 'every enabler is declared bilingually',
    Object.values(ENABLERS).every((e: any) => !!e.ar && !!e.en), Object.keys(ENABLERS));

  const passed = cases.filter((c) => c.verdict === 'PASS').length;
  const failed = cases.length - passed;
  return Response.json({
    suite: 'TestSeatedReadiness',
    contract_version: SEATED_READINESS_VERSION,
    total: cases.length, passed, failed, verdict: failed === 0 ? 'PASS' : 'FAIL',
    failures: cases.filter((c) => c.verdict === 'FAIL'),
    writes_performed: 0, records_read: 0,
    runs: SEATED_RUNS.map((r: any) => r.id),
    scope_note: 'Proves the MEASURE: the electorate comes from the vote rule, a seat is workable only when bound to a real account, and an unread source makes a committee unmeasurable instead of zero. It does not prove that any run was executed over a persisted record (no authorized seated actor — D-064).',
    results: cases,
  });
}