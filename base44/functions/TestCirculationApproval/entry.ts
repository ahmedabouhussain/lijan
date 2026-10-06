import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  policyRefusal, evaluateResponse, computeOutcome, circulationChain, CIRCULATION_STATES,
  CIRCULATION_TRANSITIONS, CIRCULATION_CONTRACT_VERSION, RESPONSE_STATES, THRESHOLD_RULES, EXCLUDED_MATTERS,
} from '../../shared/circulationApproval.ts';

// TestCirculationApproval — the contract suite for DECISIONS BY CIRCULATION (brief rev 5 §4C).
//
// SCOPE, STATED PLAINLY: this suite asserts the CONTRACT the four circulation commands consume. It
// exercises no handler, opens no round and writes nothing (`writes_performed: 0`). It is NOT evidence
// that a persisted written resolution was executed — that requires a seated authenticated actor.
const COMPLETE_POLICY = {
  enabled: true,
  finalizer_role: 'chair',
  default_rule: 'simple_majority_of_eligible',
  default_deadline_hours: 72,
  time_zone: 'Asia/Qatar',
  permitted_matter_types: ['routine_decision', 'operational_approval', 'delegated_matter'],
  quorum_participation: 2,
  allow_extension: true,
  extension_count_limit: 1,
  policy_version: 'v1',
};

const ROUND = (over = {}) => ({
  id: 'RND-1', state: CIRCULATION_STATES.COLLECTING, rule: 'simple_majority_of_eligible',
  quorum_required: 2, deadline_at: new Date(Date.now() + 3600_000).toISOString(),
  eligible_seat_ids: ['SEAT-A', 'SEAT-B'], eligible_count: 2, ...over,
});
const RESP = (seat, response, over = {}) => ({
  seat_id: seat, user_id: `USR-${seat}`, response, responded_at: new Date().toISOString(), ...over,
});

export default async function(req) {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases = [];
  const check = (id, note, ok, detail = null) => cases.push({ id, note, result: ok ? 'PASS' : 'FAIL', detail });

  const future = new Date(Date.now() + 3600_000).toISOString();
  const past = new Date(Date.now() - 3600_000).toISOString();
  const NOW = new Date();

  // ── CA-001…007 · the route exists only where the institution's policy allows it ──────────────
  check('CA-001', 'no policy row at all → the route is not open', policyRefusal(null, 'routine_decision')?.code === 'policy_missing');
  check('CA-002', 'an incomplete policy names what is missing',
    policyRefusal({ enabled: true, finalizer_role: 'chair' }, 'routine_decision')?.code === 'policy_incomplete'
    && policyRefusal({ enabled: true, finalizer_role: 'chair' }, 'routine_decision')?.missing_fields?.length > 0);
  check('CA-003', 'a disabled policy opens nothing', policyRefusal({ ...COMPLETE_POLICY, enabled: false }, 'routine_decision')?.code === 'policy_missing');
  check('CA-004', 'a silence-based rule is refused, never honoured',
    policyRefusal({ ...COMPLETE_POLICY, silence_is_approval: true }, 'routine_decision')?.code === 'silence_based_rule_unsupported');
  check('CA-005', 'a matter type the policy does not permit is refused',
    policyRefusal(COMPLETE_POLICY, 'budget_approval')?.code === 'matter_not_permitted');
  check('CA-006', 'an excluded matter is refused even where the policy lists it (safety floor)',
    policyRefusal({ ...COMPLETE_POLICY, permitted_matter_types: [...COMPLETE_POLICY.permitted_matter_types, 'member_removal'] }, 'member_removal')?.code === 'matter_excluded'
    && EXCLUDED_MATTERS.includes('member_removal'));
  check('CA-007', 'a complete policy permits a permitted matter', policyRefusal(COMPLETE_POLICY, 'routine_decision') === null);

  // ── CA-008…013 · the four facts stay separate, and a response is the recipient's own ─────────
  const row = RESP('SEAT-A', 'pending');
  check('CA-008', 'a response after the deadline is refused',
    evaluateResponse({ round: ROUND({ deadline_at: past }), response: row, actorUserId: 'USR-SEAT-A' })?.code === 'after_deadline');
  check('CA-009', 'another person cannot answer this row',
    evaluateResponse({ round: ROUND(), response: row, actorUserId: 'USR-SEAT-B' })?.code === 'not_eligible_seat');
  check('CA-010', 'a seat outside the frozen eligibility is refused',
    evaluateResponse({ round: ROUND(), response: { ...row, seat_id: 'SEAT-Z' }, actorUserId: 'USR-SEAT-A' })?.code === 'not_eligible_seat');
  check('CA-011', 'a second response on the same row is refused',
    evaluateResponse({ round: ROUND(), response: RESP('SEAT-A', 'approve'), actorUserId: 'USR-SEAT-A' })?.code === 'already_responded');
  check('CA-012', 'a concluded round accepts no response',
    evaluateResponse({ round: ROUND({ state: CIRCULATION_STATES.APPROVED }), response: RESP('SEAT-A', 'approve'), actorUserId: 'USR-SEAT-A' })?.code === 'round_not_open');
  check('CA-013', 'opening and acknowledging are allowed without recording a response',
    evaluateResponse({ round: ROUND(), response: row, actorUserId: 'USR-SEAT-A', action: 'open' })?.ok === true
    && evaluateResponse({ round: ROUND(), response: row, actorUserId: 'USR-SEAT-A', action: 'acknowledge' })?.ok === true);

  // ── CA-014…019 · silence, thresholds, recusal and the meaning of "ready" ─────────────────────
  const silent = computeOutcome({ round: ROUND({ quorum_required: 1 }), responses: [RESP('SEAT-A', 'approve'), RESP('SEAT-B', 'pending')], now: NOW });
  check('CA-014', 'silence is never counted as approval',
    silent.tally.approve === 1 && silent.tally.pending === 1 && silent.outcome !== CIRCULATION_STATES.APPROVED);

  const unanimous = computeOutcome({ round: ROUND({ rule: 'unanimous', quorum_required: 2 }), responses: [RESP('SEAT-A', 'approve'), RESP('SEAT-B', 'pending')], now: NOW });
  const unanimousAll = computeOutcome({ round: ROUND({ rule: 'unanimous', quorum_required: 2 }), responses: [RESP('SEAT-A', 'approve'), RESP('SEAT-B', 'approve')], now: NOW });
  check('CA-015', 'unanimous requires every eligible seat',
    unanimous.threshold_met === false && unanimousAll.threshold_met === true && unanimousAll.outcome === CIRCULATION_STATES.APPROVED);

  const twoThirds = computeOutcome({
    round: ROUND({ rule: 'two_thirds_of_eligible', quorum_required: 2, eligible_seat_ids: ['SEAT-A', 'SEAT-B', 'SEAT-C'] }),
    responses: [RESP('SEAT-A', 'approve'), RESP('SEAT-B', 'approve'), RESP('SEAT-C', 'pending')], now: NOW,
  });
  check('CA-016', 'two thirds of the eligible seats approves at 2 of 3', twoThirds.threshold_met === true);

  const quorumFail = computeOutcome({
    round: ROUND({ rule: 'majority_of_responses', quorum_required: 3, eligible_seat_ids: ['SEAT-A', 'SEAT-B', 'SEAT-C'] }),
    responses: [RESP('SEAT-A', 'approve'), RESP('SEAT-B', 'pending'), RESP('SEAT-C', 'pending')], now: NOW,
  });
  check('CA-017', 'a majority of responses still fails without participation', quorumFail.quorum_met === false && quorumFail.outcome !== CIRCULATION_STATES.APPROVED);

  const recused = computeOutcome({
    round: ROUND({ rule: 'unanimous', quorum_required: 2, eligible_seat_ids: ['SEAT-A', 'SEAT-B', 'SEAT-C'] }),
    responses: [RESP('SEAT-A', 'approve'), RESP('SEAT-B', 'approve'), RESP('SEAT-C', 'recuse')], now: NOW,
  });
  check('CA-018', 'a recused seat leaves the threshold and is not a vote',
    recused.threshold_seats === 2 && recused.outcome === CIRCULATION_STATES.APPROVED && recused.tally.recuse === 1);

  const notYet = computeOutcome({ round: ROUND({ rule: 'unanimous', quorum_required: 1 }), responses: [RESP('SEAT-A', 'approve'), RESP('SEAT-B', 'reject')], now: NOW });
  check('CA-019', 'READY is not a decision: full participation can still produce no outcome', notYet.ready === true && notYet.outcome === null);

  // ── CA-020…024 · invalidation, reachability and the boundary with issuance ───────────────────
  const invalidated = computeOutcome({
    round: ROUND({ rule: 'unanimous', quorum_required: 2 }),
    responses: [RESP('SEAT-A', 'approve'), RESP('SEAT-B', 'approve', { invalidated_at: new Date().toISOString(), invalidated_reason: 'text changed' })],
    now: NOW,
  });
  check('CA-020', 'an approval invalidated by a material change never counts again',
    invalidated.tally.approve === 1 && invalidated.outcome !== CIRCULATION_STATES.APPROVED);

  check('CA-021', 'every circulation state is written by a named command (no dead end)',
    circulationChain().every((s) => s.reachable === true && !!s.writable_by) && circulationChain().length === Object.keys(CIRCULATION_STATES).length - 1);

  check('CA-022', 'dispatch and finalize read the decision lifecycle and the contract, not a second list',
    CIRCULATION_TRANSITIONS.dispatch.from.length === 3 && CIRCULATION_TRANSITIONS.dispatch.from.includes('draft')
    && CIRCULATION_TRANSITIONS.dispatch.capability === 'circulation.open'
    && CIRCULATION_TRANSITIONS.finalize.capability === 'circulation.finalize');

  check('CA-023', 'ISSUED is not an outcome of a round: approval and issuance stay separate acts',
    !Object.values(CIRCULATION_STATES).includes('issued' as any)
    && !CIRCULATION_TRANSITIONS.finalize.to.includes('issued' as any));

  check('CA-024', 'administrative acts (extend/cancel/withdraw) can never produce an outcome',
    CIRCULATION_TRANSITIONS.administrative.to.every((s) => [CIRCULATION_STATES.WITHDRAWN, CIRCULATION_STATES.CANCELLED, CIRCULATION_STATES.SUPERSEDED].includes(s))
    && CIRCULATION_TRANSITIONS.administrative.capability === 'circulation.open'
    && RESPONSE_STATES.length === 4 && THRESHOLD_RULES.length === 4);

  const failures = cases.filter((c) => c.result === 'FAIL');
  return Response.json({
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    suite: 'TestCirculationApproval',
    contract_version: CIRCULATION_CONTRACT_VERSION,
    totals: { cases: cases.length, passed: cases.length - failures.length, failed: failures.length },
    failures,
    cases,
    writes_performed: 0,
    records_read: 0,
    scope_note: 'contract only: no handler was exercised, no round persisted, no response recorded',
  });
}