// circulationApproval.ts — the ONE policy for DECISIONS BY CIRCULATION (written resolutions).
//
// CONTRACT VERSION: circulation-approval-1.0.0 (6 Oct 2026 — S17, brief revision 5 §4C).
//
// Why this module exists: the platform could record a vote in a live meeting and nothing else. A
// committee whose instrument permits a written resolution had no governed route at all: no frozen
// content for the round, no eligible-recipient snapshot, no separation between DELIVERY, OPENING,
// ACKNOWLEDGMENT and the RESPONSE itself, and nothing that could turn a set of responses into an
// APPROVED decision that issuance could then act on. What follows is stated ONCE here and consumed by
// OpenCirculation, SetCirculationPolicy, RecordCirculationResponse, FinalizeCirculation and the guard.
//
// The rules this contract states once (each one is a refusal code, not a convention):
//   1. The route exists only where the institution's own policy allows it. No policy row, an
//      incomplete policy, a matter type the policy does not permit, or an excluded matter: no round.
//   2. SILENCE IS NEVER APPROVAL. Any policy that declares a silence-based rule is refused outright
//      (silence_based_rule_unsupported) rather than honoured — an inferred shortcut is not a rule.
//   3. Delivery, opening, acknowledgment and the response are FOUR different facts. Dispatched does
//      not mean received; received does not mean approved. A click on a link is not a signed vote.
//   4. A response belongs to ONE eligible seat acting under its own identity. The seat that
//      dispatched the round cannot respond for anybody, and cannot finalize it: the secretary
//      prepares, checks, routes and records — they do not approve for the committee.
//   5. A response is admissible only inside the round's window and only from an eligible seat.
//      Late, duplicated (a principal and their proxy for the same seat) and ineligible responses are
//      refused with their reason, never quietly dropped.
//   6. A MATERIAL AMENDMENT to the proposal invalidates the affected approvals. Old responses are
//      preserved as evidence and NEVER carried onto changed wording; a new round is opened explicitly
//      and linked to the one it replaces.
//   7. READY IS NOT A DECISION. A round that has enough participation is 'ready' and still produces
//      nothing until an authorized finalizer acts. Approval produces the decision state 'approved';
//      ISSUANCE is still a separate human-authorized step (IssueDecision).
//
// Reading no records and writing none: this module is pure policy, so a test asserts against exactly
// the object every handler consumes.
import { DECISION_TRANSITIONS } from './decisionLifecycle.ts';

export const CIRCULATION_CONTRACT_VERSION = 'circulation-approval-1.0.0';

export const CIRCULATION_STATES = {
  DRAFT: 'draft',
  DISPATCHED: 'dispatched',
  COLLECTING: 'collecting',
  READY: 'ready',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NOT_CARRIED: 'not_carried',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn',
  CANCELLED: 'cancelled',
  SUPERSEDED: 'superseded',
};

/** The states a round may still receive responses in. */
export const COLLECTING_STATES = [CIRCULATION_STATES.DISPATCHED, CIRCULATION_STATES.COLLECTING];
/** The states a finalizer may act on. */
export const FINALIZABLE_STATES = [...COLLECTING_STATES, CIRCULATION_STATES.READY];

export const CIRCULATION_TRANSITIONS = {
  dispatch: {
    from: [...DECISION_TRANSITIONS.open_vote.from],
    to: [CIRCULATION_STATES.DISPATCHED, CIRCULATION_STATES.COLLECTING],
    capability: 'circulation.open',
    note: 'a written resolution is dispatched on a draft that has not been decided by any other route',
  },
  ready: {
    from: [...COLLECTING_STATES],
    to: CIRCULATION_STATES.READY,
    capability: 'circulation.finalize',
    note: 'enough participation to finalize — and still NOT a decision',
  },
  finalize: {
    from: [...FINALIZABLE_STATES],
    to: [CIRCULATION_STATES.APPROVED, CIRCULATION_STATES.REJECTED, CIRCULATION_STATES.NOT_CARRIED, CIRCULATION_STATES.EXPIRED],
    capability: 'circulation.finalize',
    note: 'the authorized finalizer produces the outcome; approval then allows issuance, and issuance stays its own step',
  },
  administrative: {
    from: [...COLLECTING_STATES, CIRCULATION_STATES.READY],
    to: [CIRCULATION_STATES.WITHDRAWN, CIRCULATION_STATES.CANCELLED, CIRCULATION_STATES.SUPERSEDED],
    capability: 'circulation.open',
    note: 'extension, withdrawal, cancellation and reopening are dispatch-authority acts and produce no outcome',
  },
};

/** Every state, with the command that writes it — a state nothing writes is a dead end. */
export function circulationChain() {
  return [
    { state: CIRCULATION_STATES.COLLECTING, writable_by: 'OpenCirculation', reachable: true },
    { state: CIRCULATION_STATES.DISPATCHED, writable_by: 'OpenCirculation', reachable: true },
    { state: CIRCULATION_STATES.READY, writable_by: 'FinalizeCirculation', reachable: true },
    { state: CIRCULATION_STATES.APPROVED, writable_by: 'FinalizeCirculation', reachable: true },
    { state: CIRCULATION_STATES.REJECTED, writable_by: 'FinalizeCirculation', reachable: true },
    { state: CIRCULATION_STATES.NOT_CARRIED, writable_by: 'FinalizeCirculation', reachable: true },
    { state: CIRCULATION_STATES.EXPIRED, writable_by: 'FinalizeCirculation', reachable: true },
    { state: CIRCULATION_STATES.WITHDRAWN, writable_by: 'FinalizeCirculation', reachable: true },
    { state: CIRCULATION_STATES.CANCELLED, writable_by: 'FinalizeCirculation', reachable: true },
    { state: CIRCULATION_STATES.SUPERSEDED, writable_by: 'FinalizeCirculation', reachable: true },
  ];
}

/**
 * Acts bound to the actor's OWN identity, read by the command guard so it can never disagree with the
 * command: a response exists only on the row of the seat it belongs to, and only that person answers.
 */
export const CIRCULATION_IDENTITY_BOUND = { 'circulation.respond': 'user_id' };

/** What a seat may answer. `recuse` removes the seat from the threshold, it is not a vote. */
export const RESPONSE_STATES = ['approve', 'reject', 'abstain', 'recuse'];
export const THRESHOLD_RULES = ['unanimous', 'simple_majority_of_eligible', 'two_thirds_of_eligible', 'majority_of_responses'];

/** Matters a written resolution may never decide, whatever the policy says (safety floor). */
export const EXCLUDED_MATTERS = [
  'committee_closure', 'constitutional_amendment', 'office_holder_appointment', 'member_removal', 'budget_above_limit',
];
/** Matter types a policy may permit. */
export const PERMITTED_MATTER_TYPES = ['routine_decision', 'operational_approval', 'delegated_matter', 'minutes_approval'];

/** Everything the institution's policy must state before a round may be dispatched. */
export const REQUIRED_POLICY_FIELDS = [
  'enabled', 'finalizer_role', 'default_rule', 'default_deadline_hours', 'time_zone',
  'permitted_matter_types', 'quorum_participation', 'allow_extension', 'extension_count_limit',
];

export const CIRCULATION_REFUSALS = {
  policy_missing: {
    ar: 'لا يوجد قرار سياسة معتمد للجنة يسمح بالقرار بالتمرير؛ لا تُفتح دورة بغير سند نظامي.',
    en: 'No approved policy for this committee permits decisions by circulation; no round is opened without a basis.',
  },
  policy_incomplete: {
    ar: 'سياسة القرار بالتمرير ناقصة؛ يلزم استيفاء عناصرها قبل أي دورة.',
    en: 'The circulation policy is incomplete; its required elements must be stated before any round.',
  },
  silence_based_rule_unsupported: {
    ar: 'قاعدة تعتبر السكوت موافقة غير مدعومة؛ لا تُفتح دورة على أساسها.',
    en: 'A rule treating silence as approval is not supported; no round is opened on that basis.',
  },
  matter_not_permitted: {
    ar: 'نوع الموضوع غير مذكور في سياسة اللجنة كموضوع يجوز قراره بالتمرير.',
    en: 'This matter type is not among those the committee policy permits by circulation.',
  },
  matter_excluded: {
    ar: 'هذا الموضوع مستثنى من القرار بالتمرير ولو أجازته السياسة.',
    en: 'This matter is excluded from decision by circulation even where a policy permits it.',
  },
  deadline_invalid: {
    ar: 'مهلة الدورة يجب أن تكون زمنًا مستقبليًا صريحًا.',
    en: 'A round deadline must be an explicit future time.',
  },
  no_electorate: {
    ar: 'لا يوجد مقعد تصويت مؤهل في اللجنة؛ لا تُفتح دورة بلا مستحقين.',
    en: 'No eligible voting seat exists in this committee; a round is not opened without recipients.',
  },
  round_not_open: {
    ar: 'الدورة ليست في حالة تسمح بالرد.',
    en: 'The round is not in a state that accepts a response.',
  },
  after_deadline: {
    ar: 'انقضت مهلة الدورة؛ لا يُقبل رد بعدها.',
    en: 'The round deadline has passed; a response is not accepted after it.',
  },
  not_eligible_seat: {
    ar: 'هذا المقعد ليس من مستحقي هذه الدورة.',
    en: 'This seat is not among the round’s eligible recipients.',
  },
  already_responded: {
    ar: 'سُجّل ردّ هذا المقعد في هذه الدورة؛ لا يُكرَّر.',
    en: 'This seat has already responded in this round; a second response is refused.',
  },
  duplicate_principal: {
    ar: 'لا يُحسب للشخص الواحد أكثر من رد واحد.',
    en: 'One person never carries more than one response.',
  },
  stale_content: {
    ar: 'تغيّر نص المقترح بعد بدء التمرير؛ لا تُحمل الموافقات القديمة على نص جديد.',
    en: 'The proposal text changed after circulation began; earlier approvals are never carried onto new wording.',
  },
  awaiting_responses: {
    ar: 'المستحقون لم يستكملوا ردودهم والمهلة لم تنقضِ؛ لا يُقفل التمرير.',
    en: 'Eligible recipients have not all responded and the deadline has not passed; the round is not closed.',
  },
  not_authorized_finalizer: {
    ar: 'المصادقة على نتيجة التمرير ليست من صلاحية هذا المقعد وفق السياسة.',
    en: 'Finalizing this round is not this seat’s authority under the policy.',
  },
  invalidator_is_dispatcher: {
    ar: 'فاتح الدورة لا يصادق على نتيجتها؛ التحضير والإرسال ليسا اعتمادًا.',
    en: 'The seat that dispatched the round does not finalize it; preparing and routing is not approving.',
  },
  ready_is_not_a_decision: {
    ar: 'بلوغ المشاركة المطلوبة يعني «جاهزة للمصادقة» ولا يعني قرارًا.',
    en: 'Reaching the required participation means ready for authorized finalization, not a decision.',
  },
};

const refuse = (code) => ({ ok: false, code, ...CIRCULATION_REFUSALS[code] });

/**
 * Is the route permitted at all, and for this matter? Read by OpenCirculation before anything is
 * written. Returns null when the round may be dispatched.
 */
export function policyRefusal(policy, matterType) {
  if (!policy || typeof policy !== 'object') return refuse('policy_missing');
  const missing = REQUIRED_POLICY_FIELDS.filter((f) => policy[f] === undefined || policy[f] === null || policy[f] === '');
  if (missing.length > 0) return { ...refuse('policy_incomplete'), missing_fields: missing };
  if (policy.enabled !== true) return refuse('policy_missing');
  if (policy.silence_is_approval === true || policy.silence_counts_as_approval === true) return refuse('silence_based_rule_unsupported');
  const permitted = Array.isArray(policy.permitted_matter_types) ? policy.permitted_matter_types : [];
  if (!permitted.includes(matterType)) return refuse('matter_not_permitted');
  if (EXCLUDED_MATTERS.includes(matterType)) return refuse('matter_excluded');
  return null;
}

const at = (v) => (v ? new Date(v).getTime() : null);

/**
 * May this seat, as this user, answer this round now? Four facts stay separate: the row may be
 * dispatched (delivery), opened (opening) and acknowledged without any response being recorded.
 */
export function evaluateResponse({ round, response, actorUserId, action = 'approve', now = new Date() } = {}) {
  if (!round || !response) return refuse('round_not_open');
  if (!COLLECTING_STATES.includes(round.state)) return refuse('round_not_open');
  if (round.deadline_at && at(now) > at(round.deadline_at)) return refuse('after_deadline');
  if (!actorUserId || response.user_id !== actorUserId) return refuse('not_eligible_seat');
  const eligible = Array.isArray(round.eligible_seat_ids) ? round.eligible_seat_ids : [];
  if (!eligible.includes(response.seat_id)) return refuse('not_eligible_seat');
  if (!['open', 'acknowledge'].includes(action) && RESPONSE_STATES.includes(action) && response.response && response.response !== 'pending') {
    return refuse('already_responded');
  }
  return { ok: true, code: null };
}

/**
 * The outcome, computed from what was actually recorded. Silence contributes nothing; a recused seat
 * leaves the eligible set for this matter; participation is counted from responses, not from dispatch.
 */
export function computeOutcome({ round, responses = [], now = new Date() } = {}) {
  const eligible = Array.isArray(round?.eligible_seat_ids) ? round.eligible_seat_ids : [];
  const rows = (responses || []).filter((r) => eligible.includes(r.seat_id));
  const answered = rows.filter((r) => RESPONSE_STATES.includes(r.response) && !r.invalidated_at);
  const tally = { approve: 0, reject: 0, abstain: 0, recuse: 0, pending: 0 };
  for (const r of answered) tally[r.response] += 1;
  const recusedSeats = answered.filter((r) => r.response === 'recuse').map((r) => r.seat_id);
  const thresholdSeats = eligible.filter((id) => !recusedSeats.includes(id));
  const silent = thresholdSeats.length - answered.filter((r) => r.response !== 'recuse').length;
  tally.pending = Math.max(silent, 0);

  const participating = tally.approve + tally.reject + tally.abstain;
  const quorumRequired = Number(round?.quorum_required || 0);
  const quorumMet = participating >= quorumRequired;
  const rule = round?.rule || 'simple_majority_of_eligible';
  const size = thresholdSeats.length;

  let thresholdMet = false;
  let basis = '';
  if (rule === 'unanimous') {
    thresholdMet = size > 0 && tally.approve === size;
    basis = `${tally.approve} of ${size} eligible approvals required (unanimous)`;
  } else if (rule === 'two_thirds_of_eligible') {
    const needed = Math.ceil((size * 2) / 3);
    thresholdMet = tally.approve >= needed;
    basis = `${tally.approve} of ${needed} required (two thirds of eligible)`;
  } else if (rule === 'majority_of_responses') {
    const cast = tally.approve + tally.reject;
    thresholdMet = cast > 0 && tally.approve > cast / 2 && quorumMet;
    basis = `${tally.approve} of ${cast} cast (majority of responses, quorum ${participating}/${quorumRequired})`;
  } else {
    const needed = Math.floor(size / 2) + 1;
    thresholdMet = tally.approve >= needed;
    basis = `${tally.approve} of ${needed} required (simple majority of eligible)`;
  }

  const deadlinePassed = round?.deadline_at ? at(now) > at(round.deadline_at) : false;
  const allAnswered = rows.filter((r) => !r.invalidated_at).every((r) => RESPONSE_STATES.includes(r.response));
  const ready = quorumMet && (allAnswered || deadlinePassed);

  return {
    outcome: thresholdMet && quorumMet ? CIRCULATION_STATES.APPROVED : (deadlinePassed && allAnswered ? CIRCULATION_STATES.NOT_CARRIED : null),
    ready,
    quorum_met: quorumMet,
    quorum_required: quorumRequired,
    threshold_met: thresholdMet,
    threshold_basis: basis,
    threshold_seats: size,
    participation: participating,
    all_answered: allAnswered,
    deadline_passed: deadlinePassed,
    tally,
  };
}