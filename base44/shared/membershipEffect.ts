// membershipEffect.ts — the EFFECTIVE-TIME contract (brief §4A material D, rev 5).
//
// CONTRACT VERSION: membership-effect-1.0.0
//
// The failure this contract exists to prevent (defect D-069):
//   • An appointment carries its OWN effective instants — a term end, a bounded acting expiry, an
//     appointment event that ends the seat — while the authority path only asked "is there a row with
//     status active?". A person whose appointment had effectively ENDED therefore kept every seat
//     right: they could still cast a ballot, approve minutes or issue a decision. The seat's own
//     effective date did not exist for the command path.
//   • Nothing governed what a departure DURING an open round means for quorum, pending votes and
//     signatures, and nothing refused the affected official action when the institution's instrument
//     said nothing about it.
//
// The RULES this module states, and the commands consume:
//   1. EFFECTIVE DATE, NOT RECORDED DATE. Standing is decided at an INSTANT from effective facts.
//      A change recorded today and effective next week does not remove today's right; a change
//      effective today removes it from that instant. A retroactively recorded change is legitimate
//      but is FLAGGED (`recorded_after_effect`), never silently backdated.
//   2. STANDING IS HISTORICAL. `standingAt(seat, at)` answers for an instant, so a past act is judged
//      as it stood then — no retrospective rewrite of attribution in either direction.
//   3. NO SILENT RULE. Where the institution's instrument is silent about a change inside an open
//      round, the affected OFFICIAL action stops and shows the choice. Only dependent work stops.
//   4. NO AUTOMATIC CANCELLATION. A universal "a departure cancels the round" rule is not invented;
//      a policy that declares one is refused outright.
//   5. A BALLOT IS NOT INHERITED. A valid vote cast before an effective departure is neither
//      reassigned to the successor nor erased, and a successor cannot recast it as the historical
//      person. Membership changes do not by themselves invalidate otherwise valid past decisions;
//      invalidating a round requires an explicit reasoned supersession.
//   6. FAIL-CLOSED. A standing that cannot be established (the appointment history cannot be read) is
//      never treated as a standing seat.

export const MEMBERSHIP_EFFECT_CONTRACT_VERSION = "membership-effect-1.0.0";

/** The processes the brief names: a change may land during any of them. */
export const PROCESS_STAGES = [
  "agenda_preparation",
  "live_meeting",
  "open_vote",
  "minutes_review",
  "pending_ratification",
];

/** What a change actually touches, shown to the secretary and the chair. */
export const AFFECTED_FACTS = ["attendance", "eligible_seats", "quorum", "pending_votes", "signatures", "next_steps"];

/** The authorized choices the brief lists. The contract never invents a seventh. */
export const AUTHORIZED_CHOICES = [
  "pause_process",
  "replace_prospectively",
  "re_establish_quorum",
  "close_reopen_round",
  "reconstitute_meeting",
  "seek_ratification",
];

/** What each choice does to a round — stated once so no caller invents a consequence. */
export const CHOICE_REMEDIES = {
  pause_process: { supersedes_round: false, requires_reason: true, reopens_round: false, note_en: "the process is held where it stands", note_ar: "يُوقف الإجراء حيث هو" },
  replace_prospectively: { supersedes_round: false, requires_reason: true, reopens_round: false, note_en: "the appointment is replaced from the change onwards; past acts keep their actor", note_ar: "يُستبدل التعيين من وقت التغيير؛ الأفعال السابقة تحفظ فاعلها" },
  re_establish_quorum: { supersedes_round: false, requires_reason: true, reopens_round: false, note_en: "participation is re-measured before the round closes", note_ar: "يُعاد قياس المشاركة قبل إغلاق الدورة" },
  close_reopen_round: { supersedes_round: true, requires_reason: true, reopens_round: true, note_en: "the round is closed and a NEW numbered round is opened; the original is preserved", note_ar: "تُغلق الدورة وتُفتح دورة جديدة مرقّمة؛ والأصل محفوظ" },
  reconstitute_meeting: { supersedes_round: false, requires_reason: true, reopens_round: false, note_en: "the meeting is reconstituted and reconvened", note_ar: "يُعاد تشكيل الاجتماع والدعوة إليه" },
  seek_ratification: { supersedes_round: false, requires_reason: true, reopens_round: false, note_en: "the act is put to the ratifying authority the instrument names", note_ar: "يُعرض الفعل على جهة التصديق التي يسمّيها النظام" },
};

/** Appointment events that END a seat (as opposed to recording a nomination). */
export const ENDING_EVENT_TYPES = [
  "resignation",
  "removal",
  "death",
  "incapacity",
  "end_of_term",
  "acting_expiry",
  "representation_transfer",
];

/** The standing states an instant can produce. `unknown` is never a pass. */
export const STANDING_STATES = ["standing", "ended", "not_yet_started", "unknown"];

/** How a change sits against a frozen round's window. */
export const CHANGE_POSITIONS = ["before_freeze", "within_round", "after_round"];

/** What the institution may state about a change inside an open round. */
export const MID_ROUND_POLICIES = ["freeze_hold", "retest_participation", "next_round_only"];

/** Fields the policy record must carry. */
export const POLICY_REQUIRED_FIELDS = ["mid_round_change", "resolution_route", "authorized_choices"];

export const EFFECT_REFUSALS = {
  seat_not_standing: {
    en: "This act is refused: at this instant the appointment behind the seat had already ended. A person who has effectively left does not cast a ballot, approve minutes or issue a decision. The institution's route is to appoint or replace (or to take one of the authorized choices if the act belongs to a round already open).",
    ar: "يُرفض هذا الفعل: في هذه اللحظة كان التعيين القائم عليه قد انتهى نفاذًا. من انتهى تعيينه لا يسجّل صوتًا ولا يعتمد محضرًا ولا يصدر قرارًا. ومسار المؤسسة هو التعيين أو الاستبدال (أو أحد الخيارات المعتمدة إن كان الفعل يخصّ دورة مفتوحة).",
  },
  acting_expired: {
    en: "This act is refused: a bounded acting appointment has expired. A bounded appointment ends by its own term; it never becomes permanent by remaining in force.",
    ar: "يُرفض هذا الفعل: انتهى تكليف مؤقت محدود المدة. والتكليف المحدود ينتهي بأجله ولا يصير دائمًا ببقائه.",
  },
  not_yet_seated: {
    en: "This act is refused: the appointment was not yet effective at this instant. An act outside the appointment period is refused in both directions, so no past attendance or signature is fabricated.",
    ar: "يُرفض هذا الفعل: لم يكن التعيين نافذًا في هذه اللحظة. ويُرفض الفعل خارج مدة التعيين في الاتجاهين، فلا يُلفَّق حضور أو توقيع سابق.",
  },
  standing_unverifiable: {
    en: "This act was not performed: the appointment history behind this seat could not be read, so standing could not be established. An unreadable fact is never treated as a standing seat.",
    ar: "لم يُنفَّذ الفعل: تعذّرت قراءة تاريخ التعيين وراء هذا المقعد، فلم يثبت قيام الصفة. والواقعة التي لا تُقرأ لا تُعتبر صفة قائمة.",
  },
  effect_policy_unresolved: {
    en: "A membership change took effect during this round, and the institution's instrument does not state what the running round does about it. No rule is assumed: the institution states the choice (hold the round as frozen, re-measure participation, or apply the change from the next round only), and only this affected official action waits.",
    ar: "نفذ تغيير في العضوية خلال هذه الدورة، ولا ينصّ النظام الداخلي على أثر ذلك في الدورة الجارية. ولا تُفترض قاعدة: تُحدِّد المؤسسة الخيار (إبقاء الدورة كما جُمِّدت، أو إعادة قياس المشاركة، أو سريان التغيير على الدورة التالية فقط)، ويبقى هذا الفعل الرسمي المتأثر وحده معلّقًا.",
  },
  participation_not_met_after_change: {
    en: "Under the institution's policy, participation is re-measured at the closing instant, and the change left the round below the participation it requires. The round does not produce a result on its own; the institution's route is the authorized choice it recorded (re-establish participation, close and reopen a round, or seek ratification).",
    ar: "بموجب سياسة المؤسسة تُقاس المشاركة في لحظة الإغلاق، وقد ترك التغيير الدورة دون المشاركة المطلوبة. ولا تُنتج الدورة نتيجة من تلقاء نفسها؛ ومسار المؤسسة هو الخيار المعتمد الذي سجّلته (إعادة تحقيق المشاركة، أو إغلاق الدورة وفتح أخرى، أو طلب التصديق).",
  },
};

export const POLICY_REFUSALS = {
  automatic_cancellation_unsupported: {
    en: "A policy declaring that a membership change automatically cancels or invalidates a round is refused: the choice is institutional, and the brief forbids inventing a universal automatic cancellation rule.",
    ar: "تُرفض سياسة تنصّ على أن تغيير العضوية يُلغي الدورة تلقائيًا: الخيار مؤسسي، والموجز يمنع اختراع قاعدة إلغاء تلقائي عامة.",
  },
  effect_policy_incomplete: {
    en: "The effect policy is incomplete: it must state what a change inside an open round does, who resolves it, and which of the authorized choices the institution permits.",
    ar: "سياسة وقت النفاذ ناقصة: يجب أن تنصّ على أثر التغيير داخل دورة مفتوحة، ومن يحسمه، وأي الخيارات المعتمدة تجيزها المؤسسة.",
  },
  choices_invalid: {
    en: "authorized_choices must name choices the contract recognises; none may be invented.",
    ar: "يجب أن تسمّي الخيارات المعتمدة خيارات يعرفها العقد؛ ولا يُخترع خيار.",
  },
};

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));
const day = (v: any): string | null => (typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : null);
const instant = (v: any): string | null => (typeof v === "string" && v.length >= 10 ? v : null);

/**
 * The standing of ONE seat at ONE instant, from the seat's own effective facts.
 *
 * Evaluated by instant, never by "status today": a seat that ended yesterday was standing the day
 * before, and a seat effective next month is not standing now. Both directions are refused, which is
 * what makes a retrospective signature or a fabricated past attendance impossible rather than merely
 * discouraged.
 */
export function standingAt({ seat, events = [], at }: { seat: any; events?: any[]; at: string }) {
  const seatId = seat?.id || null;
  const facts = arr(events).filter((e) => !seatId || !e.membership_id || e.membership_id === seatId);
  const atDay = day(at) || String(at).slice(0, 10);

  const base = {
    seat_id: seatId,
    at: instant(at) || at,
    appointment_type: seat?.appointment_type || null,
    status_today: seat?.status || null,
  };

  // An ending event that has taken EFFECT at this instant.
  const ended = facts
    .filter((e) => ENDING_EVENT_TYPES.includes(e.event_type) && instant(e.effective_at) && instant(e.effective_at)! <= at)
    .sort((a, b) => String(b.effective_at).localeCompare(String(a.effective_at)))[0] || null;

  const startDay = day(seat?.term_start);
  const endDay = day(seat?.term_end);
  const actingExpiry = instant(seat?.acting_expires_at);

  // Not yet seated at this instant (either direction of the appointment period).
  if (startDay && atDay < startDay) {
    return { ...base, standing: "not_yet_started", ended_by: "term_not_started", effective_at: seat.term_start, recorded_at: null, recorded_after_effect: false, source: "membership_term_dates", refusal: { code: "not_yet_seated", ...EFFECT_REFUSALS.not_yet_seated } };
  }
  if (seat?.status === "pending") {
    return { ...base, standing: "not_yet_started", ended_by: "appointment_pending", effective_at: null, recorded_at: null, recorded_after_effect: false, source: "membership_status", refusal: { code: "not_yet_seated", ...EFFECT_REFUSALS.not_yet_seated } };
  }

  if (actingExpiry && actingExpiry <= at) {
    return { ...base, standing: "ended", ended_by: "acting_expiry", effective_at: actingExpiry, recorded_at: null, recorded_after_effect: false, source: "bounded_appointment", refusal: { code: "acting_expired", ...EFFECT_REFUSALS.acting_expired } };
  }
  if (endDay && atDay > endDay) {
    const retro = ended ? instant(ended.recorded_at) && instant(ended.recorded_at)! > instant(ended.effective_at)! : false;
    return { ...base, standing: "ended", ended_by: "end_of_term", effective_at: seat.term_end, recorded_at: ended?.recorded_at || null, recorded_after_effect: retro, source: "membership_term_dates", refusal: { code: "seat_not_standing", ...EFFECT_REFUSALS.seat_not_standing } };
  }
  if (["resigned", "removed", "inactive"].includes(seat?.status)) {
    const effectiveAt = instant(seat?.ended_at) || instant(ended?.effective_at) || null;
    // A status alone carries no instant: if the record states no effective instant, the standing at a
    // PAST instant cannot be established, and an unreadable fact is not a standing seat.
    if (!effectiveAt) {
      return { ...base, standing: "unknown", ended_by: seat.status, effective_at: null, recorded_at: instant(ended?.recorded_at) || null, recorded_after_effect: false, source: "membership_status", refusal: { code: "standing_unverifiable", ...EFFECT_REFUSALS.standing_unverifiable } };
    }
    if (effectiveAt <= at) {
      const retro = instant(ended?.recorded_at) && instant(ended?.recorded_at)! > effectiveAt;
      return { ...base, standing: "ended", ended_by: seat.status, effective_at: effectiveAt, recorded_at: instant(ended?.recorded_at) || null, recorded_after_effect: !!retro, source: "membership_status", refusal: { code: "seat_not_standing", ...EFFECT_REFUSALS.seat_not_standing } };
    }
    return { ...base, standing: "standing", ended_by: null, effective_at: effectiveAt, recorded_at: instant(ended?.recorded_at) || null, recorded_after_effect: false, source: "membership_status_future", refusal: null };
  }
  if (ended) {
    const effectiveAt = instant(ended.effective_at)!;
    const retro = instant(ended.recorded_at) && instant(ended.recorded_at)! > effectiveAt;
    return {
      ...base, standing: "ended", ended_by: ended.event_type, effective_at: effectiveAt,
      recorded_at: instant(ended.recorded_at) || null, recorded_after_effect: !!retro,
      reason_class: ended.reason_class || "institutional", source: "appointment_event",
      refusal: { code: "seat_not_standing", ...EFFECT_REFUSALS.seat_not_standing },
    };
  }

  return { ...base, standing: "standing", ended_by: null, effective_at: null, recorded_at: null, recorded_after_effect: false, source: "no_ending_fact", refusal: null };
}

/**
 * The appointment history behind a set of seats, read once. A read that fails is reported as
 * UNREADABLE, never as an empty history.
 */
export async function loadAppointmentEvents(sr: any, membership_ids: string[]) {
  const ids = [...new Set((membership_ids || []).filter(Boolean))];
  if (ids.length === 0) return { events: [], unreadable: false };
  try {
    const rows = await sr.entities.SeatAppointmentEvent.filter({ membership_id: { $in: ids } }, { limit: 500 });
    return { events: arr(rows), unreadable: false };
  } catch (_e) {
    return { events: null, unreadable: true };
  }
}

/** The window a frozen round covers: from the instant its electorate was frozen onwards. */
export function effectWindow({ round }: { round: any }) {
  const from = instant(round?.frozen_at) || (day(round?.frozen_on) ? `${day(round?.frozen_on)}T00:00:00.000Z` : null);
  return { from, to: null, source: from ? (round?.frozen_at ? "frozen_at" : "frozen_on") : "no_freeze_instant" };
}

/** Where a seat's change sits against the round's window. */
export function classifyChange({ standing, window }: { standing: any; window: any }) {
  if (!window?.from) return "unknown";
  const at = instant(standing?.effective_at);
  if (!at) return "unknown";
  return at < window.from ? "before_freeze" : "within_round";
}

/**
 * The mid-round change report: what the change does to the OPEN round, given the institution's own
 * policy. With no change inside the round there is nothing to decide (`proceed_frozen`), whatever the
 * policy — which is what keeps every existing, unaffected issuance working exactly as before.
 *
 * `ballots`: the ballots already bound to this round; `quorum_required`: the round's participation
 * requirement. With `retest_participation` the participation is re-measured against the seats still
 * standing at the closing instant, and whether that leaves the round below its requirement is
 * reported rather than assumed.
 */
export function midRoundChangeReport({
  round, seats = [], events = [], policy = null, ballots = [], quorum_required = null, unreadable = false, now = null,
}: any) {
  const window = effectWindow({ round });
  const at = instant(now) || new Date().toISOString();

  if (unreadable) {
    return {
      contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
      window, at, changes: [], within_round: 0,
      policy_source: policy ? "committee_policy" : "instrument_silent",
      policy: policy || null,
      action: "unresolved_policy",
      refusal: { code: "standing_unverifiable", ...EFFECT_REFUSALS.standing_unverifiable },
      affected_facts: AFFECTED_FACTS,
      authorized_choices: AUTHORIZED_CHOICES,
      next_freeze_must_use_current_register: false,
      retest: null,
      ballot_inheritance: ballotInheritance(),
    };
  }

  const changes = arr(seats).map((seat: any) => {
    const standing = standingAt({ seat, events, at });
    const position = standing.standing === "standing" ? "none" : classifyChange({ standing, window });
    return {
      seat_id: seat.id,
      person_user_id: seat.user_id || null,
      person_name: seat.full_name || seat.full_name_ar || null,
      seat_role: seat.role || null,
      standing: standing.standing,
      ended_by: standing.ended_by,
      effective_at: standing.effective_at,
      recorded_at: standing.recorded_at,
      recorded_after_effect: standing.recorded_after_effect === true,
      position,
      // The frozen seat stays in the frozen electorate (the round's freeze is a historical fact); the
      // change bites on what may still be DONE and on what the participation is measured against.
      still_in_frozen_electorate: true,
      may_act_after_effect: false,
    };
  }).filter((c: any) => c.standing !== "standing");

  const within = changes.filter((c: any) => c.position === "within_round");

  if (within.length === 0) {
    return {
      contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
      window, at, changes, within_round: 0,
      policy_source: policy ? "committee_policy" : "instrument_silent",
      policy: policy || null,
      action: "proceed_frozen",
      refusal: null,
      affected_facts: [],
      authorized_choices: AUTHORIZED_CHOICES,
      next_freeze_must_use_current_register: false,
      retest: null,
      ballot_inheritance: ballotInheritance(),
    };
  }

  if (!policy || !policy.mid_round_change) {
    // Ambiguity is shown, never resolved by assumption — and only this affected act waits.
    return {
      contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
      window, at, changes, within_round: within.length,
      policy_source: "instrument_silent",
      policy: null,
      action: "unresolved_policy",
      refusal: { code: "effect_policy_unresolved", ...EFFECT_REFUSALS.effect_policy_unresolved },
      affected_facts: affectedFactsFor({ changes: within, quorum_required }),
      authorized_choices: AUTHORIZED_CHOICES,
      next_freeze_must_use_current_register: false,
      retest: null,
      ballot_inheritance: ballotInheritance(),
    };
  }

  const mode = policy.mid_round_change;

  if (mode === "retest_participation") {
    const standingSeats = arr(seats).filter((s: any) => standingAt({ seat: s, events, at }).standing === "standing");
    const standingIds = new Set(standingSeats.map((s: any) => s.id));
    const participationAfter = arr(ballots).filter((b: any) => standingIds.has(b.voter_membership_id)).length;
    const required = quorum_required == null ? null : Number(quorum_required);
    const metAfter = required == null ? null : participationAfter >= required;
    return {
      contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
      window, at, changes, within_round: within.length,
      policy_source: "committee_policy", policy,
      action: metAfter === false ? "participation_not_met_after_change" : "proceed_frozen",
      refusal: metAfter === false ? { code: "participation_not_met_after_change", ...EFFECT_REFUSALS.participation_not_met_after_change } : null,
      affected_facts: ["quorum", "pending_votes", "signatures", "next_steps"],
      authorized_choices: policy.authorized_choices?.length ? policy.authorized_choices : AUTHORIZED_CHOICES,
      next_freeze_must_use_current_register: false,
      retest: { participation_required: required, participation_after: participationAfter, quorum_met_after: metAfter, seats_removed_from_count: within.length },
      ballot_inheritance: ballotInheritance(),
    };
  }

  // freeze_hold and next_round_only both leave the running round exactly as frozen: the difference is
  // that next_round_only states explicitly that any LATER round is frozen on the register as it
  // stands, never on the superseded snapshot.
  return {
    contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
    window, at, changes, within_round: within.length,
    policy_source: "committee_policy", policy,
    action: "proceed_frozen",
    refusal: null,
    affected_facts: affectedFactsFor({ changes: within, quorum_required }),
    authorized_choices: policy.authorized_choices?.length ? policy.authorized_choices : AUTHORIZED_CHOICES,
    next_freeze_must_use_current_register: mode === "next_round_only",
    retest: null,
    ballot_inheritance: ballotInheritance(),
  };
}

function affectedFactsFor({ changes, quorum_required }: any) {
  const facts = new Set(["eligible_seats", "pending_votes", "signatures", "next_steps"]);
  if (quorum_required != null) facts.add("quorum");
  if (arr(changes).some((c: any) => c.seat_role === "member" || c.seat_role === "vice_chair" || c.seat_role === "chair")) facts.add("attendance");
  return [...facts];
}

/**
 * What a change does NOT do to a ballot. Declared as a fact so no caller can implement the opposite
 * by accident: a valid vote cast before an effective departure is neither reassigned nor erased.
 */
export function ballotInheritance() {
  return { reassignable_to_successor: false, erasable: false, successor_may_recast_as_historical_person: false, membership_change_invalidates_past_decisions: false };
}

/** The remedy an authorized choice produces, with the reason it must carry. */
export function remedyFor({ choice, reason }: { choice: string; reason?: string | null }) {
  if (!AUTHORIZED_CHOICES.includes(choice)) {
    return { allowed: false, code: "choice_unknown", recognised: AUTHORIZED_CHOICES, message: POLICY_REFUSALS.choices_invalid };
  }
  const remedy = CHOICE_REMEDIES[choice];
  if (remedy.requires_reason && !(typeof reason === "string" && reason.trim().length >= 8)) {
    return { allowed: false, code: "reason_required", choice, message: { en: "An authorized choice must carry a stated reason; the supersession or pause is never silent.", ar: "يجب أن يحمل الخيار المعتمد سببًا مذكورًا؛ فلا إغلاق ولا إيقاف صامت." } };
  }
  return { allowed: true, choice, ...remedy };
}

/**
 * Policy validation, applied by the writer (and by the test suite). Two rules matter: the policy must
 * be complete, and a policy that declares an AUTOMATIC invalidation of the round is refused.
 */
export function validateEffectPolicy(policy: any) {
  const p = policy || {};
  const missing = POLICY_REQUIRED_FIELDS.filter((f) => p[f] === undefined || p[f] === null || p[f] === "");
  if (missing.length > 0) return { ok: false, code: "effect_policy_incomplete", missing, message: POLICY_REFUSALS.effect_policy_incomplete };
  if (!MID_ROUND_POLICIES.includes(p.mid_round_change)) {
    return { ok: false, code: "mid_round_change_invalid", recognised: MID_ROUND_POLICIES, message: POLICY_REFUSALS.effect_policy_incomplete };
  }
  if (p.automatic_cancellation === true || p.auto_cancel_round === true || p.departure_invalidates_round === true) {
    return { ok: false, code: "automatic_cancellation_unsupported", message: POLICY_REFUSALS.automatic_cancellation_unsupported };
  }
  const choices = Array.isArray(p.authorized_choices) ? p.authorized_choices : [];
  const unknown = choices.filter((c) => !AUTHORIZED_CHOICES.includes(c));
  if (choices.length === 0 || unknown.length > 0) {
    return { ok: false, code: "choices_invalid", unknown, recognised: AUTHORIZED_CHOICES, message: POLICY_REFUSALS.choices_invalid };
  }
  return { ok: true, policy: p };
}

/** The authorized choices as a list a read can hand to a surface. */
export function authorizedChoicesForRead() {
  return [...AUTHORIZED_CHOICES];
}

/**
 * A stored policy row as the contract reads it. A row that no longer validates is NOT treated as a
 * policy (fail-closed): the affected action stops and shows the choice, exactly as when nothing was
 * recorded. A policy is never half-applied.
 */
export function readEffectPolicy(row: any) {
  if (!row) return null;
  const valid = validateEffectPolicy(row);
  if (!valid.ok) return null;
  return {
    policy_id: row.id,
    mid_round_change: row.mid_round_change,
    resolution_route: row.resolution_route || null,
    authorized_choices: Array.isArray(row.authorized_choices) && row.authorized_choices.length > 0
      ? row.authorized_choices : [...AUTHORIZED_CHOICES],
    delegation_expiry_handling: row.delegation_expiry_handling || 'act_stops_immediately',
    policy_version: row.policy_version || null,
    contract_version: row.contract_version || null,
    policy_source: row.policy_source || 'committee_instrument',
  };
}

/** The stages a given capability touches, so a surface can say which process is affected. */
export function stagesForCapability(capability: string) {
  const map = {
    "vote.cast": ["open_vote"],
    "vote.call": ["open_vote"],
    "vote.certify": ["open_vote"],
    "decision.issue": ["open_vote", "pending_ratification"],
    "decision.approve": ["open_vote", "pending_ratification"],
    "decision.submit": ["agenda_preparation"],
    "minutes.approve": ["minutes_review"],
    "minutes.issue": ["minutes_review"],
    "circulation.open": ["pending_ratification"],
    "circulation.finalize": ["pending_ratification"],
    "circulation.respond": ["pending_ratification"],
  };
  return map[capability] || [];
}