// continuityContract.ts — THE one declaration of seat/person continuity and institutional handover.
//
// The product's continuity rule, stated once so no surface has to guess it:
//   CONTINUITY BELONGS TO THE INSTITUTION AND THE SEAT. HISTORICAL RESPONSIBILITY STAYS WITH THE
//   PERSON WHO ACTED.
//
// Contract continuity-1.0.0:
//   • A seat is not a person. An appointment event is a dated, attributed act with a competent
//     authority and a reason class — and a private personal reason is NEVER exposed through ordinary
//     portfolio reporting.
//   • An ended appointment creates a visible vacancy or an approved successor. A successor receives a
//     NEW assignment under their OWN identity — never the departing person's account, signature, vote
//     or blanket permission set.
//   • A valid vote, signature or approval cast before the effective moment stays attributed to the
//     person who cast it and is never reassigned, erased or recast.
//   • A temporary or acting appointment is bounded in scope AND in time; it never becomes permanent
//     by remaining in force.
//   • No office inherits another's powers automatically (the vice-chair does not become the chair).
//   • Handover moves institutional obligations and the history the successor's mandate needs. It never
//     moves private notes, personal delegations, personal messages, credentials or unrelated
//     memberships, and it never transfers a person's consent or conflict declaration.

export const CONTINUITY_VERSION = "continuity-1.0.0";

const t = (en: string, ar: string) => ({ en, ar });

/** Reason classes. `personal_private` is stored but never rendered in portfolio or register output. */
export const REASON_CLASSES = ["institutional", "public", "personal_private"];
const PRIVATE = ["personal_private"];

/**
 * Every appointment event, with what it does to the seat, the record and the institution.
 * `self_service` marks the acts a seated person performs about THEMSELVES (resignation, an absence
 * they report) — never an act over someone else's seat.
 */
export const APPOINTMENT_EVENTS: Record<string, any> = {
  nomination: {
    ar: "ترشيح", en: "Nomination",
    seats_ended: false, creates_vacancy: false, self_service: false,
    competent_authority_required: true, evidence_required: false,
    reason_classes: ["institutional"],
    obligations_remain_with: "seat", quorum_may_break: false, powers_stopped: [],
  },
  acceptance: {
    ar: "قبول التعيين", en: "Acceptance of appointment",
    seats_ended: false, creates_vacancy: false, self_service: true,
    competent_authority_required: false, evidence_required: true,
    reason_classes: ["institutional", "personal_private"],
    obligations_remain_with: "seat", quorum_may_break: false, powers_stopped: [],
  },
  appointment: {
    ar: "تعيين", en: "Appointment",
    seats_ended: false, creates_vacancy: false, self_service: false,
    competent_authority_required: true, evidence_required: true,
    reason_classes: ["institutional", "public"],
    obligations_remain_with: "seat", quorum_may_break: false, powers_stopped: [],
    creates_assignment: true, resolves_vacancy: true,
  },
  acting_appointment: {
    ar: "تكليف مؤقت", en: "Acting appointment",
    seats_ended: false, creates_vacancy: false, self_service: false,
    competent_authority_required: true, evidence_required: true,
    reason_classes: ["institutional", "public"],
    obligations_remain_with: "seat", quorum_may_break: false, powers_stopped: [],
    creates_assignment: true, bounded: true, expiry_required: true, scope_required: true,
  },
  acting_expiry: {
    ar: "انتهاء التكليف المؤقت", en: "Acting appointment expiry",
    seats_ended: true, ends: "acting_term", creates_vacancy: true, self_service: false,
    competent_authority_required: true, evidence_required: false,
    reason_classes: ["institutional"],
    obligations_remain_with: "institution", quorum_may_break: true,
    powers_stopped: ["all_bounded_scope"],
  },
  end_of_term: {
    ar: "انتهاء المدة", en: "End of term",
    seats_ended: true, ends: "seat", creates_vacancy: true, self_service: false,
    competent_authority_required: true, evidence_required: false,
    reason_classes: ["institutional", "public"],
    obligations_remain_with: "institution", quorum_may_break: true,
    powers_stopped: ["office_powers"],
  },
  resignation: {
    ar: "استقالة", en: "Resignation",
    seats_ended: true, ends: "seat", creates_vacancy: true, self_service: true,
    competent_authority_required: false, evidence_required: true,
    reason_classes: ["institutional", "personal_private"],
    obligations_remain_with: "institution", quorum_may_break: true,
    powers_stopped: ["office_powers"],
  },
  removal: {
    ar: "عزل", en: "Removal",
    seats_ended: true, ends: "seat", creates_vacancy: true, self_service: false,
    competent_authority_required: true, evidence_required: true,
    reason_classes: ["institutional", "public"],
    obligations_remain_with: "institution", quorum_may_break: true,
    powers_stopped: ["office_powers"],
  },
  death: {
    ar: "وفاة", en: "Death",
    seats_ended: true, ends: "seat", creates_vacancy: true, self_service: false,
    competent_authority_required: true, evidence_required: true,
    reason_classes: ["institutional"],
    obligations_remain_with: "institution", quorum_may_break: true,
    powers_stopped: ["office_powers"],
  },
  incapacity: {
    ar: "تعذّر", en: "Incapacity",
    seats_ended: true, ends: "seat", creates_vacancy: true, self_service: false,
    competent_authority_required: true, evidence_required: true,
    reason_classes: ["institutional", "personal_private"],
    obligations_remain_with: "institution", quorum_may_break: true,
    powers_stopped: ["office_powers"],
  },
  representation_transfer: {
    ar: "تغيّر الجهة الممثَّلة", en: "Representation transfer",
    seats_ended: true, ends: "seat", creates_vacancy: true, self_service: false,
    competent_authority_required: true, evidence_required: true,
    reason_classes: ["institutional", "public"],
    obligations_remain_with: "institution", quorum_may_break: true,
    powers_stopped: ["representation_powers"],
  },
  temporary_absence: {
    ar: "غياب مؤقت", en: "Temporary absence",
    seats_ended: false, ends: null, creates_vacancy: false, self_service: true,
    competent_authority_required: false, evidence_required: false,
    reason_classes: ["institutional", "personal_private"],
    obligations_remain_with: "seat", quorum_may_break: true, powers_stopped: [],
    bounded: true, expiry_required: true,
  },
  reinstatement: {
    ar: "عودة إلى المقعد", en: "Reinstatement",
    seats_ended: false, ends: null, creates_vacancy: false, self_service: false,
    competent_authority_required: true, evidence_required: true,
    reason_classes: ["institutional"],
    obligations_remain_with: "seat", quorum_may_break: false, powers_stopped: [],
    creates_assignment: true,
  },
};

export const APPOINTMENT_EVENT_KEYS = Object.keys(APPOINTMENT_EVENTS);

/** Roles that may be created by an appointment event. */
export const APPOINTABLE_ROLES = [
  "chair", "vice_chair", "secretary", "committee_administrator", "member", "alternate", "observer", "advisor",
];

/**
 * Acts bound to the actor's OWN identity, for EVERY role — a resignation and a handover acceptance
 * are personal acts, not an office power over someone else's record. Read by the command guard.
 */
export const IDENTITY_BOUND_ACTIONS: Record<string, string> = {
  "seat.resign": "user_id",
  "seat.handover_accept": "successor_user_id",
};

/** A bounded appointment never carries these, whatever scope is requested. */
export const ACTING_RULES = {
  scope_required: true,
  expiry_required: true,
  max_days: 180,
  becomes_permanent_by_remaining: false,
  excluded_capabilities: ["committee.manage", "committee.close", "decision.digital_sign", "committee.activate"],
  inherits_all_office_powers: false,
};

/** No office succeeds another automatically. Stated as data so a surface cannot imply otherwise. */
export const NO_AUTO_SUCCESSION = {
  vice_chair_inherits_chair: false,
  deputy_inherits_secretary: false,
  new_assignment_required: true,
  predecessor_account_reused: false,
  predecessor_grants_reused: false,
};

/** How a change during a live meeting or an open vote is handled. */
export const EFFECTIVE_TIME_POLICY = {
  effective_date_is_not_recorded_date: true,
  cast_vote_is_immutable: true,
  cast_vote_reassigned_to_successor: false,
  membership_change_invalidates_past_decisions: false,
  supersession_requires_reason: true,
  retroactive_signature_permitted: false,
  backdated_attendance_permitted: false,
  round_freeze_required_for_official_action: true,
};

/** What may be done with each open obligation during a handover. */
export const HANDOVER_DISPOSITIONS: Record<string, any> = {
  assign_to_successor: { ar: "يُسند إلى الخلف", en: "Assign to successor", moves_future_responsibility: true, requires_successor_acceptance: true },
  return_to_institution: { ar: "يُعاد إلى الجهة", en: "Return to the institution", moves_future_responsibility: false, requires_successor_acceptance: false },
  interim_custodian: { ar: "حافظ مؤقت", en: "Interim accountable custodian", moves_future_responsibility: true, requires_successor_acceptance: false },
  retain_with_seat: { ar: "يبقى مع المقعد", en: "Retained with the seat", moves_future_responsibility: false, requires_successor_acceptance: false },
  revoke_not_transferred: { ar: "يُلغى ولا يُنقل", en: "Revoked, never transferred", moves_future_responsibility: false, requires_successor_acceptance: false, personal: true },
  expire: { ar: "ينتهي", en: "Allowed to expire", moves_future_responsibility: false, requires_successor_acceptance: false },
};

export const HANDOVER_DISPOSITION_KEYS = Object.keys(HANDOVER_DISPOSITIONS);

/**
 * Never transferred by an automatic handover. Listed as data because "which history may move" is a
 * product promise, not an implementation detail.
 */
export const HANDOVER_EXCLUDED = [
  { key: "private_notes", ar: "الملاحظات الخاصة", en: "Private notes" },
  { key: "personal_delegations", ar: "التفويضات الشخصية", en: "Personal delegations" },
  { key: "personal_credentials", ar: "بيانات الدخول", en: "Credentials" },
  { key: "personal_messages", ar: "المراسلات الشخصية", en: "Personal messages" },
  { key: "unrelated_memberships", ar: "العضويات غير المتصلة", en: "Unrelated memberships" },
  { key: "own_consents", ar: "الإقرارات والموافقات الشخصية", en: "The predecessor's own consents and declarations" },
];

export const CONTINUITY_REFUSALS: Record<string, any> = {
  unknown_event_type: t("The appointment event is not in the continuity contract", "حدث التعيين غير معرّف في عقد الاستمرارية"),
  seat_not_active: t("This seat is not active, so this event does not apply to it", "المقعد غير نشط، فلا ينطبق عليه هذا الحدث"),
  identity_mismatch: t("A personal act may be performed only by the person it concerns", "الفعل الشخصي لا يمارسه إلا صاحبه"),
  authority_required: t("This event requires a competent authority, not the seat holder", "يستلزم هذا الحدث سلطة مختصة لا شاغل المقعد"),
  reason_class_not_permitted: t("This reason class is not permitted for this event", "فئة السبب غير مسموحة لهذا الحدث"),
  evidence_required: t("This event requires supporting evidence", "يستلزم هذا الحدث دليلًا مساندًا"),
  acting_scope_required: t("An acting appointment states the powers it carries", "التكليف المؤقت يحدد الصلاحيات التي يحملها"),
  acting_expiry_required: t("An acting appointment states when it ends", "التكليف المؤقت يحدد موعد انتهائه"),
  acting_scope_illegal: t("A bounded appointment cannot carry this power", "التكليف المؤقت لا يحمل هذه الصلاحية"),
  acting_expiry_past: t("The acting expiry must be in the future", "يجب أن يكون انتهاء التكليف في المستقبل"),
  acting_too_long: t("The acting period exceeds the lawful maximum", "مدة التكليف تتجاوز الحد النظامي"),
  successor_identity_required: t("A successor is a named person with their own identity", "الخلف شخص مُسمّى بهويته الخاصة"),
  successor_already_seated: t("This person already holds an active seat in this committee", "هذا الشخص يشغل مقعدًا نشطًا في هذه اللجنة بالفعل"),
  handover_not_open: t("This handover is not open for acceptance", "حزمة التسليم ليست مفتوحة للقبول"),
  handover_not_successor: t("Only the named successor accepts this handover", "لا يقبل التسليم إلا الخلف المُسمّى في الحزمة"),
  handover_return_reason_required: t("A returned handover states what is missing", "التسليم المُعاد يبيّن الناقص"),
  handover_has_no_items: t("There is nothing to hand over for this seat", "لا يوجد ما يُسلَّم لهذا المقعد"),
  disposition_unknown: t("The disposition is not in the handover contract", "المصير المقترح غير معرّف في عقد التسليم"),
  disposition_needs_successor: t("Assigning an obligation to the successor requires a successor", "إسناد التزام إلى الخلف يستلزم وجود خلف"),
  handover_not_effective_yet: t("The handover effective date has not arrived", "لم يحلّ تاريخ نفاذ التسليم"),
};

function refuse(code: string, extra: Record<string, any> = {}, status = 409) {
  const text = CONTINUITY_REFUSALS[code] || { en: code, ar: null };
  return { ok: false, code, status, reason: text.en, reason_ar: text.ar, contract_version: CONTINUITY_VERSION, ...extra };
}

export function refusal(code: string, extra: Record<string, any> = {}) {
  return refuse(code, extra);
}

export function eventContract(event_type: string) {
  return APPOINTMENT_EVENTS[event_type] || null;
}

function daysBetween(fromIso: string, toIso: string) {
  const a = Date.parse(fromIso), b = Date.parse(toIso);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

/**
 * The ONE evaluation of an appointment event. Pure: it decides whether the event applies, who may
 * record it, what it stops, what it leaves with the institution and whether a vacancy appears.
 */
export function evaluateAppointmentEvent({
  event_type, seat, actor_user_id, actor_is_competent_authority = false,
  acting_scope = [], acting_expires_at = null, reason_class = "institutional",
  evidence_url = null, today = new Date().toISOString(),
}: Record<string, any>) {
  const contract = APPOINTMENT_EVENTS[event_type];
  if (!contract) return refuse("unknown_event_type", {}, 400);
  if (!seat) return { ok: false, code: "seat_not_found", status: 404, reason: "Seat not found", contract_version: CONTINUITY_VERSION };

  const isHolder = !!seat.user_id && seat.user_id === actor_user_id;
  if (contract.self_service && !isHolder && !actor_is_competent_authority) {
    return refuse("identity_mismatch", { seat_id: seat.id }, 403);
  }
  if (!contract.self_service && !actor_is_competent_authority) {
    return refuse("authority_required", { seat_id: seat.id }, 403);
  }
  if (!REASON_CLASSES.includes(reason_class)) return refuse("reason_class_not_permitted", {}, 400);
  if (!(contract.reason_classes || []).includes(reason_class)) return refuse("reason_class_not_permitted", {}, 400);
  if (contract.evidence_required && !evidence_url) return refuse("evidence_required", {}, 400);

  // Ending an appointment only applies to a seat that is still active.
  if (contract.seats_ended && seat.status !== "active") return refuse("seat_not_active", { seat_status: seat.status });

  if (contract.bounded) {
    const scope = Array.isArray(acting_scope) ? acting_scope.filter(Boolean) : [];
    if (contract.scope_required && scope.length === 0) return refuse("acting_scope_required", {}, 400);
    for (const cap of scope) {
      if (ACTING_RULES.excluded_capabilities.includes(cap)) return refuse("acting_scope_illegal", { capability: cap }, 400);
    }
    if (contract.expiry_required && !acting_expires_at) return refuse("acting_expiry_required", {}, 400);
    if (acting_expires_at) {
      if (Date.parse(acting_expires_at) <= Date.parse(today)) return refuse("acting_expiry_past", {}, 400);
      const days = daysBetween(today, acting_expires_at);
      if (days !== null && days > ACTING_RULES.max_days) return refuse("acting_too_long", { days, max_days: ACTING_RULES.max_days }, 400);
    }
  }

  return {
    ok: true,
    contract_version: CONTINUITY_VERSION,
    event: event_type,
    seats_ended: !!contract.seats_ended,
    ends: contract.ends || null,
    creates_vacancy: !!contract.creates_vacancy,
    creates_assignment: !!contract.creates_assignment === true,
    resolves_vacancy: !!contract.resolves_vacancy === true,
    bounded: !!contract.bounded === true,
    obligations_remain_with: contract.obligations_remain_with,
    quorum_may_break: !!contract.quorum_may_break,
    powers_stopped: [...(contract.powers_stopped || [])],
    reason_visible_in_registers: !PRIVATE.includes(reason_class),
    requires_handover_when_ending: !!contract.seats_ended,
    auto_succession: NO_AUTO_SUCCESSION,
  };
}

/** A later acting appointment, or an appointment over an occupied seat, is refused. */
export function assertSeatFreeForAssignment({ existing_seats = [], user_id, role = "member", event_type = "appointment" }: Record<string, any>) {
  if (!user_id) return refuse("successor_identity_required", {}, 400);
  const active = (existing_seats || []).filter((s) => s.status === "active");
  const samePersonSameRole = active.find((s) => s.user_id === user_id && s.role === role);
  if (samePersonSameRole) return refuse("successor_already_seated", { seat_id: samePersonSameRole.id });
  if (["appointment", "reinstatement"].includes(event_type)) {
    const occupied = active.find((s) => s.role === role && ["chair", "vice_chair", "secretary"].includes(role));
    if (occupied && occupied.user_id !== user_id) {
      // One office is held by one seat: the caller must end or bound the incumbent first.
      return refuse("successor_already_seated", { seat_id: occupied.id, role });
    }
  }
  return null;
}

/** Who may accept a handover, and when. */
export function assessHandoverAcceptance({ pack, actor_user_id, decision = "accept", return_reason = null, today = new Date().toISOString() }: Record<string, any>) {
  if (!pack) return { ok: false, code: "handover_not_found", status: 404, reason: "Handover not found", contract_version: CONTINUITY_VERSION };
  if (!["pending_acceptance", "partially_accepted", "returned"].includes(pack.status)) {
    return refuse("handover_not_open", { pack_status: pack.status });
  }
  if (!pack.successor_user_id || pack.successor_user_id !== actor_user_id) return refuse("handover_not_successor", {}, 403);
  if (decision === "return" && !String(return_reason || "").trim()) return refuse("handover_return_reason_required", {}, 400);
  if (pack.effective_date && Date.parse(pack.effective_date) > Date.parse(today) && decision === "accept") {
    return refuse("handover_not_effective_yet", { effective_date: pack.effective_date });
  }
  return { ok: true, contract_version: CONTINUITY_VERSION, decision, effect: decision === "accept" ? "obligations_move_to_successor" : "returned_for_completion" };
}

/** Which disposition is lawful for an obligation — and whether it needs the successor at all. */
export function assessDisposition(disposition: string, { has_successor = true }: Record<string, any> = {}) {
  const contract = HANDOVER_DISPOSITIONS[disposition];
  if (!contract) return refuse("disposition_unknown", {}, 400);
  if (contract.requires_successor_acceptance && !has_successor) return refuse("disposition_needs_successor", {}, 400);
  return { ok: true, contract_version: CONTINUITY_VERSION, disposition, ...contract };
}

/** The default disposition the server proposes for an obligation, before a human decides. */
export function proposeDisposition(obligation_type: string) {
  switch (obligation_type) {
    case "personal_delegation": return "revoke_not_transferred";
    case "pending_signature": return "return_to_institution";
    case "upcoming_meeting":
    case "document_custody": return "assign_to_successor";
    case "open_action":
    case "agenda_item":
    case "group_membership":
    case "review_request":
    case "official_correspondence": return "assign_to_successor";
    default: return "return_to_institution";
  }
}