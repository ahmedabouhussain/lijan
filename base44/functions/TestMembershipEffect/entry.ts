import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  standingAt, midRoundChangeReport, remedyFor, validateEffectPolicy, readEffectPolicy,
  ballotInheritance, stagesForCapability, effectWindow, classifyChange,
  MEMBERSHIP_EFFECT_CONTRACT_VERSION, PROCESS_STAGES, AFFECTED_FACTS, AUTHORIZED_CHOICES,
  MID_ROUND_POLICIES, ENDING_EVENT_TYPES, CHOICE_REMEDIES,
} from '../../shared/membershipEffect.ts';

// TestMembershipEffect — the contract suite for EFFECTIVE TIME (brief §4A material D, rev 5).
//
// SCOPE, STATED PLAINLY: this suite asserts the CONTRACT the commands and the governed read consume.
// It exercises no handler, opens no round and writes nothing (`writes_performed: 0`). It is NOT
// evidence that a persisted departure mid-round was executed — that needs a seated authenticated actor.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases: any[] = [];
  const check = (id: string, label: string, pass: boolean, detail: any = null) => cases.push({ test_id: id, label, verdict: pass ? 'PASS' : 'FAIL', detail });

  const NOW = '2026-10-06T12:00:00.000Z';
  const SEAT = (over = {}) => ({ id: 'SEAT-1', user_id: 'USR-1', full_name: 'Member One', role: 'member', status: 'active', voting_right: true, term_start: '2026-01-01', term_end: '2026-12-31', ...over });
  const EV = (event_type, effective_at, over = {}) => ({ membership_id: 'SEAT-1', event_type, effective_at, recorded_at: effective_at, ...over });
  const ROUND = (over = {}) => ({ id: 'RND-1', round: 1, status: 'active', frozen_at: '2026-10-05T08:00:00.000Z', frozen_on: '2026-10-05', quorum_required: 3, eligible_seat_ids: ['SEAT-1', 'SEAT-2', 'SEAT-3'], ...over });
  const POLICY = (over = {}) => ({ mid_round_change: 'freeze_hold', resolution_route: 'chair', authorized_choices: ['pause_process', 'replace_prospectively'], policy_version: 'v1', ...over });

  // ── 1. Standing is decided by instant, in both directions ─────────────────────────────────────
  const activeSeat = standingAt({ seat: SEAT(), events: [], at: NOW });
  check('ME-001', 'a seat inside its term is standing at this instant', activeSeat.standing === 'standing', { standing: activeSeat.standing });

  const endedTerm = standingAt({ seat: SEAT({ term_end: '2026-09-30' }), events: [], at: NOW });
  check('ME-002', 'a seat whose term ENDED is not standing, from the day after the end date', endedTerm.standing === 'ended' && endedTerm.ended_by === 'end_of_term', { standing: endedTerm.standing, ended_by: endedTerm.ended_by });

  const stillInTermDay = standingAt({ seat: SEAT({ term_end: '2026-10-06' }), events: [], at: NOW });
  check('ME-003', 'the end date itself is still within the appointment', stillInTermDay.standing === 'standing', { standing: stillInTermDay.standing });

  const beforeStart = standingAt({ seat: SEAT({ term_start: '2026-11-01' }), events: [], at: NOW });
  check('ME-004', 'a seat whose appointment has not begun is NOT standing (the other direction)', beforeStart.standing === 'not_yet_started', { standing: beforeStart.standing, code: beforeStart.refusal?.code });

  const actingExpired = standingAt({ seat: SEAT({ appointment_type: 'acting', acting_expires_at: '2026-10-05T00:00:00.000Z' }), events: [], at: NOW });
  check('ME-005', 'an expired bounded acting appointment has ended, and says so as its own reason', actingExpired.standing === 'ended' && actingExpired.ended_by === 'acting_expiry', { ended_by: actingExpired.ended_by });

  const actingLive = standingAt({ seat: SEAT({ appointment_type: 'acting', acting_expires_at: '2026-11-01T00:00:00.000Z' }), events: [], at: NOW });
  check('ME-006', 'a bounded appointment still inside its term is standing', actingLive.standing === 'standing', { standing: actingLive.standing });

  // ── 2. Effective date vs recorded date ────────────────────────────────────────────────────────
  const eventFuture = standingAt({ seat: SEAT(), events: [EV('resignation', '2026-11-01T00:00:00.000Z')], at: NOW });
  check('ME-007', 'a change effective NEXT WEEK does not remove today’s standing', eventFuture.standing === 'standing', { standing: eventFuture.standing });

  const eventEffective = standingAt({ seat: SEAT(), events: [EV('resignation', '2026-10-06T09:00:00.000Z')], at: NOW });
  check('ME-008', 'a change effective this morning ends the standing from its instant', eventEffective.standing === 'ended' && eventEffective.effective_at === '2026-10-06T09:00:00.000Z', { standing: eventEffective.standing });

  const retro = standingAt({ seat: SEAT(), events: [EV('removal', '2026-10-01T09:00:00.000Z', { recorded_at: '2026-10-06T10:00:00.000Z' })], at: NOW });
  check('ME-009', 'a retroactively RECORDED change is honoured but FLAGGED, never silently backdated', retro.standing === 'ended' && retro.recorded_after_effect === true, { recorded_after_effect: retro.recorded_after_effect });

  const historical = standingAt({ seat: SEAT({ term_end: '2026-09-30' }), events: [], at: '2026-09-01T12:00:00.000Z' });
  check('ME-010', 'a past act is judged as standing stood THEN (no retrospective rewrite)', historical.standing === 'standing', { standing: historical.standing });

  // ── 3. Fail-closed ───────────────────────────────────────────────────────────────────────────
  const noInstant = standingAt({ seat: SEAT({ status: 'resigned' }), events: [], at: NOW });
  check('ME-011', 'a status with NO effective instant cannot establish standing at a past instant — it is UNKNOWN, not standing', noInstant.standing === 'unknown' && noInstant.refusal?.code === 'standing_unverifiable', { standing: noInstant.standing });

  const pendingSeat = standingAt({ seat: SEAT({ status: 'pending' }), events: [], at: NOW });
  check('ME-012', 'an appointment still pending is not seated', pendingSeat.standing === 'not_yet_started', { standing: pendingSeat.standing });

  const endedByStatusWithInstant = standingAt({ seat: SEAT({ status: 'resigned', ended_at: '2026-10-04T00:00:00.000Z' }), events: [], at: NOW });
  check('ME-013', 'a resignation WITH its effective instant ends the standing from that instant', endedByStatusWithInstant.standing === 'ended' && endedByStatusWithInstant.effective_at === '2026-10-04T00:00:00.000Z', { effective_at: endedByStatusWithInstant.effective_at });

  // ── 4. A ballot is not inherited, and past decisions are not auto-invalidated ────────────────
  const inheritance = ballotInheritance();
  check('ME-014', 'a ballot is never reassigned to a successor, never erased, and a successor cannot recast it', inheritance.reassignable_to_successor === false && inheritance.erasable === false && inheritance.successor_may_recast_as_historical_person === false, inheritance);
  check('ME-015', 'a membership change does not by itself invalidate otherwise valid past decisions', inheritance.membership_change_invalidates_past_decisions === false, { declared: inheritance.membership_change_invalidates_past_decisions });

  // ── 5. The mid-round question, and the silence that must stop only the affected act ──────────
  const noChangeRound = midRoundChangeReport({ round: ROUND(), seats: [SEAT()], events: [], policy: null, ballots: [], quorum_required: 3, now: NOW });
  check('ME-016', 'with NO change inside the round, nothing is decided — and issuance is unaffected whatever the policy', noChangeRound.action === 'proceed_frozen' && noChangeRound.within_round === 0, { action: noChangeRound.action });

  const silentPolicy = midRoundChangeReport({
    round: ROUND(), seats: [SEAT()], events: [EV('resignation', '2026-10-06T09:00:00.000Z')],
    policy: null, ballots: [{ voter_membership_id: 'SEAT-1' }, { voter_membership_id: 'SEAT-2' }], quorum_required: 3, now: NOW,
  });
  check('ME-017', 'a change inside an open round with a SILENT instrument stops the affected act and shows the choice', silentPolicy.action === 'unresolved_policy' && silentPolicy.refusal?.code === 'effect_policy_unresolved', { action: silentPolicy.action, code: silentPolicy.refusal?.code });
  check('ME-018', 'the unresolved case names what is affected and which choices settle it — never a fabricated rule', (silentPolicy.affected_facts || []).includes('quorum') && (silentPolicy.authorized_choices || []).length === AUTHORIZED_CHOICES.length, { affected: silentPolicy.affected_facts, choices: silentPolicy.authorized_choices });

  const beforeFreeze = midRoundChangeReport({
    round: ROUND(), seats: [SEAT()], events: [EV('end_of_term', '2026-10-01T09:00:00.000Z')],
    policy: null, ballots: [], quorum_required: 3, now: NOW,
  });
  check('ME-019', 'a change BEFORE the freeze is already reflected in the frozen electorate — it is not a mid-round question', beforeFreeze.action === 'proceed_frozen' && (beforeFreeze.changes[0]?.position === 'before_freeze'), { position: beforeFreeze.changes[0]?.position, action: beforeFreeze.action });

  const hold = midRoundChangeReport({
    round: ROUND(), seats: [SEAT()], events: [EV('resignation', '2026-10-06T09:00:00.000Z')],
    policy: POLICY({ mid_round_change: 'freeze_hold' }), ballots: [], quorum_required: 3, now: NOW,
  });
  check('ME-020', 'freeze_hold completes the round on its own frozen participation', hold.action === 'proceed_frozen' && hold.next_freeze_must_use_current_register === false, { action: hold.action });

  const nextRound = midRoundChangeReport({
    round: ROUND(), seats: [SEAT()], events: [EV('resignation', '2026-10-06T09:00:00.000Z')],
    policy: POLICY({ mid_round_change: 'next_round_only' }), ballots: [], quorum_required: 3, now: NOW,
  });
  check('ME-021', 'next_round_only leaves this round untouched AND requires the next freeze to use the register as it stands', nextRound.action === 'proceed_frozen' && nextRound.next_freeze_must_use_current_register === true, { next_freeze: nextRound.next_freeze_must_use_current_register });

  // FIXTURE DEFECT, recorded rather than hidden (the same class as D-004/D-016): this case was first
  // written with BOTH a term_end of 30 Sep and a later ending event, and it expected the change to sit
  // inside the round. The evaluator was right and the fixture was wrong: the seat stopped standing on
  // 30 Sep, so the change belongs BEFORE the freeze. ME-039 asserts that rule on purpose; this case now
  // states a seat ended only by the event.
  const retestMet = midRoundChangeReport({
    round: ROUND(), seats: [SEAT({ term_end: null }), SEAT({ id: 'SEAT-2' }), SEAT({ id: 'SEAT-3' })],
    events: [EV('end_of_term', '2026-10-06T09:00:00.000Z')],
    policy: POLICY({ mid_round_change: 'retest_participation' }),
    ballots: [{ voter_membership_id: 'SEAT-2' }, { voter_membership_id: 'SEAT-3' }, { voter_membership_id: 'SEAT-1' }],
    quorum_required: 2, now: NOW,
  });
  check('ME-022', 'retest_participation re-measures participation against the seats still standing, and reports the numbers', retestMet.retest?.participation_after === 2 && retestMet.retest?.quorum_met_after === true && retestMet.action === 'proceed_frozen', { retest: retestMet.retest });

  const earliestEnding = midRoundChangeReport({
    round: ROUND(), seats: [SEAT({ term_end: '2026-09-30' })],
    events: [EV('removal', '2026-10-06T09:00:00.000Z')],
    policy: POLICY(), ballots: [], quorum_required: 3, now: NOW,
  });
  check('ME-039', 'when the seat ended on an earlier fact, THAT is the ending instant — a later event does not move the change into the round', earliestEnding.within_round === 0 && earliestEnding.changes[0]?.ended_by === 'end_of_term' && earliestEnding.changes[0]?.position === 'before_freeze', { changes: earliestEnding.changes });

  const retestFailed = midRoundChangeReport({
    round: ROUND(), seats: [SEAT(), SEAT({ id: 'SEAT-2' })],
    events: [EV('resignation', '2026-10-06T09:00:00.000Z')],
    policy: POLICY({ mid_round_change: 'retest_participation' }),
    ballots: [{ voter_membership_id: 'SEAT-1' }, { voter_membership_id: 'SEAT-2' }],
    quorum_required: 2, now: NOW,
  });
  check('ME-023', 'when re-measurement leaves the round below its participation, the round produces no result and the refusal says so', retestFailed.action === 'participation_not_met_after_change' && retestFailed.refusal?.code === 'participation_not_met_after_change', { action: retestFailed.action, retest: retestFailed.retest });

  const unreadable = midRoundChangeReport({ round: ROUND(), seats: [SEAT()], events: [], policy: POLICY(), unreadable: true, now: NOW });
  check('ME-024', 'an appointment history that cannot be read stops the affected act — never treated as “no change”', unreadable.action === 'unresolved_policy' && unreadable.refusal?.code === 'standing_unverifiable', { action: unreadable.action });

  // ── 6. Policy validation and the forbidden automatic rule ───────────────────────────────────
  check('ME-025', 'a policy that declares an AUTOMATIC cancellation/invalidation of a round is refused', validateEffectPolicy({ ...POLICY(), automatic_cancellation: true }).code === 'automatic_cancellation_unsupported', validateEffectPolicy({ ...POLICY(), automatic_cancellation: true }).code);
  check('ME-026', 'an incomplete policy is refused with its missing fields', (() => { const r = validateEffectPolicy({ mid_round_change: 'freeze_hold' }); return r.ok === false && r.missing.includes('resolution_route'); })(), null);
  check('ME-027', 'an invented choice is refused; every authorized choice is one the contract names', validateEffectPolicy({ ...POLICY(), authorized_choices: ['cancel_everything'] }).code === 'choices_invalid' && AUTHORIZED_CHOICES.length === 6, { recognized: AUTHORIZED_CHOICES });
  check('ME-028', 'an unknown mid-round mode is refused', validateEffectPolicy({ ...POLICY(), mid_round_change: 'auto_void' }).code === 'mid_round_change_invalid', MID_ROUND_POLICIES);

  // ── 7. Remedies: every authorized choice, and the reason each must carry ────────────────────
  const remedies = AUTHORIZED_CHOICES.map((c) => remedyFor({ choice: c, reason: 'a stated institutional reason' }));
  check('ME-029', 'every authorized choice maps to a defined remedy, and only the round-closing one supersedes the round', remedies.every((r: any) => r.allowed === true) && remedies.filter((r: any) => r.supersedes_round).length === 1, { superseding: CHOICE_REMEDIES.close_reopen_round.supersedes_round });
  check('ME-030', 'a supersession or pause without a stated reason is refused — no silent invalidation', remedyFor({ choice: 'close_reopen_round', reason: '' }).code === 'reason_required' && remedyFor({ choice: 'made_up' }).code === 'choice_unknown', null);
  check('ME-031', 'a superseding remedy REOPENS and preserves: the contract states both facts together', CHOICE_REMEDIES.close_reopen_round.supersedes_round === true && CHOICE_REMEDIES.close_reopen_round.reopens_round === true && CHOICE_REMEDIES.pause_process.supersedes_round === false, null);

  // ── 8. Coverage declarations ───────────────────────────────────────────────────────────────
  check('ME-032', 'the contract covers the five processes the brief names', PROCESS_STAGES.length === 5 && PROCESS_STAGES.includes('open_vote') && PROCESS_STAGES.includes('minutes_review'), PROCESS_STAGES);
  check('ME-033', 'every process fact the brief lists is one the contract can report', AFFECTED_FACTS.length === 6 && AFFECTED_FACTS.includes('pending_votes') && AFFECTED_FACTS.includes('signatures'), AFFECTED_FACTS);
  check('ME-034', 'every ending event type is one the appointment contract records', ENDING_EVENT_TYPES.every((e) => ['resignation', 'removal', 'death', 'incapacity', 'end_of_term', 'acting_expiry', 'representation_transfer'].includes(e)), ENDING_EVENT_TYPES);
  check('ME-035', 'a read policy row that no longer validates is NOT applied (fail-closed, same as no policy)', readEffectPolicy({ id: 'P1', mid_round_change: 'auto_void' }) === null && readEffectPolicy(POLICY()).mid_round_change === 'freeze_hold', null);
  check('ME-036', 'the acts the brief names declare which process they touch', stagesForCapability('vote.cast').includes('open_vote') && stagesForCapability('minutes.approve').includes('minutes_review') && stagesForCapability('decision.issue').includes('pending_ratification'), { cast: stagesForCapability('vote.cast'), minutes: stagesForCapability('minutes.approve'), issue: stagesForCapability('decision.issue') });

  const window = effectWindow({ round: ROUND() });
  check('ME-037', 'the round window comes from the freeze INSTANT when it exists', window.from === '2026-10-05T08:00:00.000Z' && window.source === 'frozen_at', window);
  check('ME-038', 'a change with no effective instant cannot be placed against the window — it is unknown, not “inside”', classifyChange({ standing: { effective_at: null }, window }) === 'unknown', null);

  const passed = cases.filter((c) => c.verdict === 'PASS').length;
  const failed = cases.length - passed;
  return Response.json({
    contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
    suites: { membership_effect: { total: cases.length, passed, failed, verdict: failed === 0 ? 'PASS' : 'FAIL' } },
    failures: cases.filter((c) => c.verdict === 'FAIL'),
    writes_performed: 0,
    records_read: 0,
    scope_note: 'Proves the effective-time CONTRACT consumed by the authority guard, CastVote, ApproveMinutes, IssueDecision and GetDecisionEffectState. A persisted departure mid-round, a refused ballot on a real round and browser behaviour are NOT TESTED (no authorized seated actor).',
    results: cases,
  });
}