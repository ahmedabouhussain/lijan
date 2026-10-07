// ratificationRoute.ts — ratification-route-1.0.0
//
// التصديق فعل مؤسسي مستقل: يُنفَّذ بمَن سمّته المؤسسة، في مدته، ويُسجَّل باسمه وصفته.
// The ratification route is the institution's OWN statement of: which outputs require ratification,
// by WHICH authority, within WHAT window, and what a LAPSE does.
//
// Two things this contract refuses to do:
//   • It never assumes a rule. With no route recorded an output is UNRESOLVED — not "not required".
//   • It never turns a lapse into approval. A lapse leaves the output NOT effective (or returns it),
//     and a late ratification is recorded as LATE rather than backdated into the window.
//
// The right each class exercises is the class's own approval right — the right follows the act.
// No new capability is named by this contract, so no authority baseline moves.

export const RATIFICATION_ROUTE_VERSION = "ratification-route-1.0.0";

export type OutputClass = "decision" | "minutes" | "committee_relationship";

/**
 * Each class names: the right its ratification is exercised under, the record it acts on, the field
 * that carries its state, and the states in which a ratification is MEANINGFUL (a draft decision is
 * not ratifiable; an issued one is).
 */
export const OUTPUT_CLASSES: Record<string, {
  ar: string; en: string; capability: string; target_type: string;
  state_field: string; ratifiable_states: string[]; entity?: string;
}> = {
  decision: {
    ar: "قرار", en: "Decision",
    capability: "decision.approve", target_type: "Decision",
    state_field: "status", ratifiable_states: ["issued", "executing", "approved"],
  },
  minutes: {
    ar: "محضر", en: "Minutes",
    capability: "minutes.approve", target_type: "MeetingMinutes",
    state_field: "status", ratifiable_states: ["approved", "issued", "amended"],
  },
  committee_relationship: {
    ar: "علاقة هيكلية", en: "Structural relationship",
    capability: "committee.manage", target_type: "CommitteeRelationship",
    state_field: "status", ratifiable_states: ["proposed", "active"],
  },
};

export const OUTPUT_CLASS_KEYS = Object.keys(OUTPUT_CLASSES);

/** What a lapse does — both options leave the output NOT effective, and neither is an approval. */
export const LAPSE_OUTCOMES: Record<string, { ar: string; en: string }> = {
  not_effective: {
    ar: "انقضاء المدة يعني أن الناتج لم يصبح نافذًا، وتبقى الفجوة ظاهرة في سجله ولا تُطوى.",
    en: "A lapse means the output never became effective, and the gap stays visible on its record.",
  },
  returned_for_reconsideration: {
    ar: "انقضاء المدة يعني إعادة الناتج إلى الجهة المُصدِرة لإعادة النظر فيه.",
    en: "A lapse returns the output to the producing body for reconsideration.",
  },
};

/** Ratification dispositions — never a single "approved". */
export const OUTCOMES: Record<string, { ar: string; en: string }> = {
  ratified: { ar: "صُدِّق", en: "Ratified" },
  refused: { ar: "رُفض التصديق", en: "Ratification refused" },
  returned: { ar: "أُعيد لإعادة النظر", en: "Returned for reconsideration" },
};

/**
 * Verdicts of the state read. `unresolved` verdicts are the point of this contract: they say the
 * institution has not decided, and the system will not decide in its place.
 */
export const RATIFICATION_STATES: Record<string, { ar: string; en: string }> = {
  no_route_recorded: {
    ar: "لم تُسجِّل اللجنة مسار تصديق، فحال الناتج غير محسومة — ولا يُفترض أنه غير مطلوب.",
    en: "The committee has recorded no ratification route, so the output's state is unresolved — never assumed to be 'not required'.",
  },
  required_awaiting: { ar: "يقتضي التصديق ولم يُصدَّق بعد.", en: "Ratification is required and has not been given." },
  ratified: { ar: "صُدِّق.", en: "Ratified." },
  refused: { ar: "رُفض التصديق.", en: "Ratification was refused." },
  returned: { ar: "أُعيد لإعادة النظر.", en: "Returned for reconsideration." },
  not_required: { ar: "لا يقتضي التصديق بحسب مسار اللجنة المسجَّل.", en: "Not subject to ratification under the recorded route." },
  window_lapsed: {
    ar: "انقضت مدة التصديق قبل أن يقع، فالناتج لم يصبح نافذًا في تلك الفترة.",
    en: "The ratification window lapsed before the act, so the output was not effective during that period.",
  },
  route_unreadable: { ar: "تعذّرت قراءة مسار التصديق، فالحال غير محسومة.", en: "The route could not be read, so the state is unresolved." },
};

export const RATIFICATION_REFUSALS: Record<string, { ar: string; en: string }> = {
  no_route_recorded: {
    ar: "لا يُسجَّل تصديق قبل أن تُسجِّل اللجنة مسارها: من يُصدِّق، وأي ناتج، وفي أي مدة.",
    en: "No ratification is recorded before the committee records its route: by whom, for which outputs, and within what window.",
  },
  class_not_required: {
    ar: "مسار اللجنة المسجَّل لا يقتضي تصديق هذا النوع من النواتج.",
    en: "The committee's recorded route does not require ratification for this class of output.",
  },
  authority_not_named: {
    ar: "المسار لم يسمِّ جهة التصديق (مقعدًا أو صفة)، فلا يجوز أن يُصدِّق أحد بالنيابة.",
    en: "The route names no ratifying authority (a seat or a role), so nobody may ratify on its behalf.",
  },
  authority_outside_platform: {
    ar: "جهة التصديق المُسمّاة خارج المنصة؛ لا يُسجَّل التصديق من داخل هذا البناء بالنيابة عنها.",
    en: "The named ratifying authority is outside the platform; ratification is never recorded here on its behalf.",
  },
  not_the_named_authority: {
    ar: "التصديق فعله لمَن سمّته اللجنة وحده: لا يصح أن يُصدِّق غير الجهة المسمّاة.",
    en: "Ratification belongs to the authority the committee named alone: no other party ratifies in its place.",
  },
  output_state_not_ratifiable: {
    ar: "حالة الناتج الحالية لا يقع عليها تصديق.",
    en: "Ratification does not fall on the output's current state.",
  },
  output_not_readable: { ar: "تعذّرت قراءة الناتج.", en: "The output record could not be read." },
  route_not_readable: { ar: "تعذّرت قراءة مسار التصديق.", en: "The ratification route could not be read." },
};

const ROLES = ["chair", "vice_chair", "secretary", "committee_administrator", "member", "alternate", "observer", "advisor"];

/** The route the institution records: it is REJECTED if it cannot be acted on, rather than stored broken. */
export function validateRoute(input: any) {
  const body = input || {};
  const missing: string[] = [];
  const unknown: string[] = [];

  const requiredFor = Array.isArray(body.required_for) ? body.required_for : null;
  if (!requiredFor) missing.push("required_for");
  for (const cls of requiredFor || []) if (!OUTPUT_CLASSES[cls]) unknown.push(cls);

  const hasSeat = typeof body.authority_seat_id === "string" && body.authority_seat_id.trim().length > 0;
  const hasRole = typeof body.authority_role === "string" && body.authority_role.trim().length > 0;
  const isExternal = typeof body.authority_external === "string" && body.authority_external.trim().length > 0;

  // An external ratifier is a LAWFUL institution choice — the route records it and the act simply
  // cannot be performed here. It is not refused as invalid; it is declared.
  if (!hasSeat && !hasRole && !isExternal) missing.push("authority_seat_id | authority_role | authority_external");
  if (hasRole && !ROLES.includes(body.authority_role)) unknown.push(body.authority_role);
  if (!body.on_lapse || !LAPSE_OUTCOMES[body.on_lapse]) missing.push("on_lapse");
  if (!body.instrument_basis || String(body.instrument_basis).trim().length < 5) missing.push("instrument_basis");

  if (missing.length || unknown.length) {
    return {
      ok: false,
      code: "route_incomplete",
      missing, unknown,
      message: {
        en: "The ratification route must name the outputs it covers, the ratifying authority, what a lapse does, and the instrument clause it rests on.",
        ar: "يجب أن يسمّي مسار التصديق النواتج التي يغطيها، وجهة التصديق، وأثر انقضاء المدة، ونصّ السند النظامي الذي يستند إليه.",
      },
    };
  }
  return { ok: true, required_for: requiredFor, external: isExternal };
}

/**
 * Who may ratify. The authority is resolved BY IDENTIFIER (a seat id) or by the RECORDED ROLE of the
 * actor's own active seat — never by a name. An external ratifier is declared, never impersonated.
 */
export function authorityForActor(route: any, seats: any[], actorUserId: string) {
  if (route?.authority_external) {
    return { ok: false, code: "authority_outside_platform", named: route.authority_external };
  }
  const mine = (seats || []).filter((s) => s && s.user_id === actorUserId && s.status === "active");
  if (route?.authority_seat_id) {
    const seat = mine.find((s) => s.id === route.authority_seat_id);
    return seat ? { ok: true, seat } : { ok: false, code: "not_the_named_authority", named: route.authority_name || route.authority_seat_id };
  }
  if (route?.authority_role) {
    const seat = mine.find((s) => s.role === route.authority_role);
    return seat ? { ok: true, seat } : { ok: false, code: "not_the_named_authority", named: route.authority_role };
  }
  return { ok: false, code: "authority_not_named", named: null };
}

/** The window is measured from the ROUTE's own recorded instant — the rule in force when it applies. */
export function windowState({ route, recorded_at, now }) {
  const days = Number(route?.window_days || 0);
  if (!days || days <= 0 || !recorded_at) return { state: "none", lapsed_at: null, within: null };
  const from = new Date(recorded_at);
  if (Number.isNaN(from.getTime())) return { state: "unknown", lapsed_at: null, within: null };
  const end = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
  const at = now ? new Date(now) : new Date();
  const lapsed = at.getTime() > end.getTime();
  return { state: lapsed ? "lapsed" : "open", lapsed_at: end.toISOString(), within: !lapsed, days };
}

/**
 * The verdict for ONE output. Facts are taken as they are found: a refusal is a disposition, and a
 * late ratification stays late — `within_window` is written at the moment of the act, never rewritten.
 */
export function ratificationVerdict({ route, route_readable = true, required_classes = null, records = [], output_state = null, now }) {
  const cls = required_classes;
  if (!route_readable) return { state: "route_unreadable", refusal: "route_not_readable" };
  if (!route) return { state: "no_route_recorded", refusal: null };

  const requiredFor = Array.isArray(route.required_for) ? route.required_for : [];
  if (cls && !requiredFor.includes(cls)) return { state: "not_required", refusal: null };

  const klass = cls ? OUTPUT_CLASSES[cls] : null;
  if (klass && output_state && !klass.ratifiable_states.includes(output_state)) {
    return { state: "output_state_not_ratifiable", refusal: "output_state_not_ratifiable", ratifiable_states: klass.ratifiable_states };
  }

  const ordered = [...(records || [])].sort((a, b) => String(b.decided_at || "").localeCompare(String(a.decided_at || "")));
  const latest = ordered[0] || null;
  if (latest) {
    return {
      state: latest.outcome === "ratified" ? "ratified" : latest.outcome,
      outcome: latest.outcome,
      recorded_at: latest.decided_at || null,
      within_window: latest.within_window === undefined ? null : latest.within_window,
      authority_name: latest.authority_name || null,
      authority_capacity: latest.authority_capacity || null,
      record_id: latest.id || null,
    };
  }

  const win = windowState({ route, recorded_at: route.recorded_at, now });
  return {
    state: win.state === "lapsed" ? "window_lapsed" : "required_awaiting",
    window: win,
    on_lapse: route.on_lapse || null,
    authority_name: route.authority_name || route.authority_role || route.authority_external || null,
    external_authority: route.authority_external || null,
  };
}