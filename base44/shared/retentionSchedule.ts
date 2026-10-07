// retentionSchedule.ts — retention-1.0.0
//
// مدة الاحتفاظ قرار المؤسسة لا قرار النظام: يُسجَّل لكل صنف من المواد، ويُقاس عليه ما صار
// قابلًا لإجراء المؤسسة — ولا يُتلف النظام شيئًا في أي حال.
//
// Retention is the institution's own decision, recorded per class of material. This contract does two
// things and refuses a third:
//   • it records what the institution decided (period, or permanence, and who decides disposal);
//   • it measures what that means TODAY per class — and reports an unreadable source as unreadable
//     rather than as an empty class;
//   • it never disposes of anything. In a governance system a record is not erased: disposal, where
//     the institution permits it at all, is an institutional review that keeps the record.

export const RETENTION_VERSION = "retention-1.0.0";

/**
 * The classes this build can actually count — each names the record that carries it, the field that
 * dates it, and the filter that identifies it. A class that cannot be counted is not declared: a
 * schedule over material nothing can count would be a statement, not a measurement.
 */
export const RECORD_CLASSES: Record<string, {
  ar: string; en: string; entity: string; date_field: string; query: any; count_scope: string;
}> = {
  decision_package: {
    ar: "حزم إصدار القرارات", en: "Decision issuance packages",
    entity: "IssueSnapshot", date_field: "created_date", query: {},
    count_scope: "كل حزمة إصدار محفوظة على اللجنة",
  },
  minutes: {
    ar: "المحاضر", en: "Minutes",
    entity: "MeetingMinutes", date_field: "created_date", query: {},
    count_scope: "كل محضر على اللجنة، بأي حالة",
  },
  action_evidence: {
    ar: "أدلة الإجراءات", en: "Action evidence",
    entity: "Action", date_field: "evidence_submitted_at", query: { evidence_submitted_at: { $exists: true } },
    count_scope: "الإجراءات التي قُدِّم لها دليل (تقديم واقعة محفوظة)",
  },
  documents: {
    ar: "المستندات", en: "Documents",
    entity: "Document", date_field: "created_date", query: {},
    count_scope: "كل مستند على اللجنة",
  },
  annotations: {
    ar: "الملاحظات غير الخاصة", en: "Non-private annotations",
    entity: "Annotation", date_field: "created_at", query: { is_private: false },
    count_scope: "الملاحظات غير الخاصة وحدها — الخاصة تبقى لصاحبها ولا تُحصى في سجل اللجنة",
  },
};

export const RECORD_CLASS_KEYS = Object.keys(RECORD_CLASSES);

/** The one disposal route this build admits, stated once. */
export const DISPOSAL_ROUTES: Record<string, { ar: string; en: string }> = {
  institutional_review_only: {
    ar: "إجراء المؤسسة وحده: مراجعة تقرّر ما يُحال إلى الحفظ، والسجل يبقى في كل الأحوال.",
    en: "An institutional review alone: it decides what moves to archival, and the record stays in every case.",
  },
};

export const NO_DELETION = {
  ar: "لا يُتلف هذا البناء سجلًا ولا يحذفه: الإتلاف قرار مؤسسي لا يُنفَّذ آليًا، والسجل يبقى قابلًا للتدقيق.",
  en: "This build erases and deletes no record: disposal is an institutional decision that is never executed automatically, and the record stays auditable.",
};

export const RETENTION_REFUSALS: Record<string, { ar: string; en: string }> = {
  rule_incomplete: {
    ar: "قاعدة الاحتفاظ تستلزم: الصنف، والمدة أو الدوام، وجهة الإجراء، ونص السند النظامي.",
    en: "A retention rule requires the class, the period or permanence, the disposing authority, and the instrument clause it rests on.",
  },
  unknown_class: { ar: "صنف مواد غير معرَّف في هذا العقد.", en: "The material class is not declared by this contract." },
  rule_not_readable: { ar: "تعذّرت قراءة قواعد الاحتفاظ، فالحال غير محسومة.", en: "The retention rules could not be read, so the state is unresolved." },
  hold_state_unverifiable: {
    ar: "تعذّر إثبات حال الحجز القانوني على مواد هذا الصنف؛ وما لا يُقرأ ليس غيابًا، فلا تُثبت أهلية الإجراء.",
    en: "The legal-hold state over this class' material could not be established; what cannot be read is not absent, so no disposition eligibility is granted.",
  },
};

/** Verdicts per class. `unresolved_no_rule` is the honest one: the institution has not decided yet. */
export const RETENTION_STATES: Record<string, { ar: string; en: string }> = {
  unresolved_no_rule: {
    ar: "لا قاعدة احتفاظ مسجَّلة لهذا الصنف — قرار المؤسسة قائم، ولا يُفترض أن الاحتفاظ دائم ولا أن الإتلاف جائز.",
    en: "No retention rule is recorded for this class — the institution's decision stands open, and neither permanence nor disposability is assumed.",
  },
  permanent: { ar: "الاحتفاظ دائم بحسب قرار المؤسسة المسجَّل.", en: "Retention is permanent by the institution's recorded decision." },
  within_period: { ar: "أقدم مادة في الصنف داخل المدة المسجَّلة.", en: "The oldest material in the class is inside the recorded period." },
  eligible_for_review: {
    ar: "انقضت المدة المسجَّلة على أقدم مادة، فالصنف معروض على قرار المؤسسة — ولا يقع إتلاف تلقائي.",
    en: "The recorded period has run on the class' oldest material, so the class is presented to the institution's decision — and nothing is disposed of automatically.",
  },
  held: {
    ar: "حجز قانوني قائم على مواد هذا الصنف: الحجز حالة تمنع الإجراء ولا يُرفع من تلقاء نفسه.",
    en: "A legal hold stands over this class' material: the hold is state that stops the disposition and never lapses by itself.",
  },
};

export function validateRule(input: any) {
  const body = input || {};
  const missing: string[] = [];
  const unknown: string[] = [];

  if (!body.record_class || !RECORD_CLASSES[body.record_class]) missing.push("record_class");
  const basis = body.basis;
  if (basis !== "years" && basis !== "permanent") missing.push("basis");
  if (basis === "years") {
    const years = Number(body.retention_years);
    if (!Number.isFinite(years) || years <= 0) missing.push("retention_years");
  }
  if (!body.disposal_authority || String(body.disposal_authority).trim().length < 3) missing.push("disposal_authority");
  if (!body.instrument_basis || String(body.instrument_basis).trim().length < 5) missing.push("instrument_basis");
  if (body.disposal_route && !DISPOSAL_ROUTES[body.disposal_route]) unknown.push(body.disposal_route);

  if (missing.length || unknown.length) {
    return {
      ok: false, code: "rule_incomplete", missing, unknown,
      message: {
        en: "A retention rule requires the class, the period or permanence, the disposing authority, and the instrument clause it rests on.",
        ar: RETENTION_REFUSALS.rule_incomplete.ar,
      },
    };
  }
  return { ok: true };
}

/**
 * What the rule means today for ONE class, from the oldest material actually found.
 * `oldest_at` is null when the class is empty — which is NOT the same as "no rule".
 */
export function classState({ rule, oldest_at, hold_count = 0, hold_readable = true, now, material_readable = true }) {
  const nowMs = (now ? new Date(now) : new Date()).getTime();

  if (!rule) {
    return {
      state: "unresolved_no_rule",
      eligible_since: null,
      note_ar: RETENTION_STATES.unresolved_no_rule.ar, note_en: RETENTION_STATES.unresolved_no_rule.en,
    };
  }
  if (!material_readable) {
    return {
      state: "unresolved_no_rule",
      eligible_since: null,
      note_ar: "مواد هذا الصنف لم تُقرأ، فلا يُدَّعى انقضاء مدة ولا بقاؤها.",
      note_en: "This class' material could not be read, so neither an elapsed nor a running period may be claimed.",
    };
  }
  if (!hold_readable) {
    return { state: "held", eligible_since: null, note_ar: RETENTION_REFUSALS.hold_state_unverifiable.ar, note_en: RETENTION_REFUSALS.hold_state_unverifiable.en, fail_closed: true };
  }
  if (hold_count > 0) {
    return {
      state: "held", eligible_since: null, holds: hold_count,
      note_ar: RETENTION_STATES.held.ar, note_en: RETENTION_STATES.held.en,
    };
  }
  if (rule.basis === "permanent") {
    return {
      state: "permanent", eligible_since: null,
      note_ar: RETENTION_STATES.permanent.ar, note_en: RETENTION_STATES.permanent.en,
    };
  }

  const years = Number(rule.retention_years);
  if (!oldest_at || !Number.isFinite(years)) {
    return {
      state: "within_period", eligible_since: null, empty: !oldest_at,
      note_ar: RETENTION_STATES.within_period.ar, note_en: RETENTION_STATES.within_period.en,
    };
  }
  const from = new Date(oldest_at);
  if (Number.isNaN(from.getTime())) {
    return { state: "within_period", eligible_since: null, note_ar: "تاريخ أقدم مادة لم يُقرأ بوصفه تاريخًا، فلا يُدَّعى انقضاء.", note_en: "The oldest material's date could not be read as a date, so no elapsed period is claimed." };
  }
  const end = new Date(from);
  end.setFullYear(end.getFullYear() + years);
  const eligible = nowMs >= end.getTime();
  return {
    state: eligible ? "eligible_for_review" : "within_period",
    eligible_since: end.toISOString(),
    oldest_at,
    note_ar: eligible ? RETENTION_STATES.eligible_for_review.ar : RETENTION_STATES.within_period.ar,
    note_en: eligible ? RETENTION_STATES.eligible_for_review.en : RETENTION_STATES.within_period.en,
  };
}