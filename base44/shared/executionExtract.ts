// executionExtract.ts — THE one declaration of what an EXECUTING PARTY outside the committee may see
// about ONE obligation, and what it may do with what it sees.
//
// CONTRACT VERSION: execution-extract-1.0.0 (6 Oct 2026 — product brief revision 5, stream D).
//
// The rules this contract exists to make enforceable, rather than promised in prose:
//
//   • A recipient outside the committee receives ONE obligation's extract. Never the committee's
//     register, never another seat's row, never the internal record, never the document library.
//   • The extract is DERIVED FROM AN ALLOWLIST. A field this contract does not name cannot travel,
//     whatever the record happens to carry. The boundary is stated as data (EXCLUDED_BY_CONTRACT) so
//     the recipient reads it instead of inferring it.
//   • THE VERIFIER'S IDENTITY IS WITHHELD on purpose: the executing party learns that its evidence was
//     accepted, or returned WITH THE REASON, and by which contract version — never who judged it.
//   • DELIVERY, OPENING, ACKNOWLEDGEMENT and ANSWER are FOUR DIFFERENT FACTS, exactly as dispatch,
//     opening, acknowledgment and response are on a written resolution. Acknowledgement is neither
//     approval nor completion nor acceptance of the obligation, and opening a link is weaker still.
//   • A question is a question: raising one changes no state, no deadline and no obligation.
//
// This module reads no records and writes none. It is pure policy + shaping, so the command and the
// suite consume the SAME object.

export const EXTRACT_VERSION = "execution-extract-1.0.0";

/** A grant is item-scoped, exactly like a guest invitation: the scope never widens. */
export const EXTRACT_SCOPE = "action_extract_only";

export const DEFAULT_EXTRACT_DAYS = 14;
export const MAX_EXTRACT_DAYS = 60;
export const MIN_EXTRACT_DAYS = 1;
export const MAX_OPEN_QUESTIONS = 5;
export const MAX_QUESTION_LENGTH = 1000;
export const MAX_ANSWER_LENGTH = 2000;
export const MAX_NAME_LENGTH = 120;
export const MAX_NOTE_LENGTH = 500;

/** The sections an extract can carry. `obligation` and `questions` are always present. */
export const EXTRACT_SECTIONS: Record<string, { ar: string; en: string }> = {
  obligation: { ar: "الالتزام نفسه", en: "The obligation itself" },
  requirement: { ar: "المطلوب المحدد", en: "The specific requirement" },
  progress: { ar: "حالة الإنجاز وما يعترضه", en: "Progress and anything blocking it" },
  evidence: { ar: "الدليل الذي قدّمته", en: "The evidence you submitted" },
  verdict: { ar: "حكم التحقق وسبب الإعادة", en: "The verification verdict and any return reason" },
  origin: { ar: "مصدر الالتزام: القرار والجهة الحاضنة", en: "Where the obligation comes from" },
  questions: { ar: "التوضيحات المتبادلة", en: "Questions and answers" },
};
export const EXTRACT_SECTION_KEYS = Object.keys(EXTRACT_SECTIONS);
export const ALWAYS_INCLUDED_SECTIONS = ["obligation", "questions"];

/**
 * What this extract never carries. Listed as data because "what the executing party cannot see" is a
 * product promise, not an implementation detail — the recipient reads the boundary on the page.
 */
export const EXCLUDED_BY_CONTRACT = [
  { key: "other_obligations", ar: "بقية إجراءات اللجنة وأي التزام لا يخصّك", en: "The committee's other obligations, and any row that is not yours" },
  { key: "committee_register", ar: "سجل اللجنة وأسماء أعضائها وهوياتهم", en: "The committee register and the identities of its members" },
  { key: "deliberation", ar: "المداولات الداخلية ومحتوى المحاضر", en: "Internal deliberation and minutes content" },
  { key: "private_notes", ar: "الملاحظات الخاصة لأي شخص", en: "Any person's private notes" },
  { key: "verifier_identity", ar: "هوية من تحقّق من دليلك (يصل الحكم وسببه، لا اسم المُحكِّم)", en: "Who verified your evidence: the verdict and its basis travel, the judge's identity does not" },
  { key: "escalation_internals", ar: "تصعيدات اللجنة الداخلية وحالة إشعاراتها وعدد التذكيرات", en: "The committee's internal escalations, notice delivery state and reminder counts" },
  { key: "internal_identifiers", ar: "المعرّفات الداخلية: معرّفات المستخدمين والمقاعد والبصمات الداخلية", en: "Internal identifiers: user ids, seat ids, correlation ids and authority contexts" },
  { key: "document_library", ar: "مكتبة مستندات اللجنة وإصداراتها ومرفقاتها", en: "The committee's document library, versions and attachments" },
  { key: "internal_provenance", ar: "وسوم المصدر الداخلي وبيانات العرض الاصطناعي", en: "Internal provenance tags and demonstration-data markers" },
];

/** Grant lifecycle. `sent` and `opened` are delivery facts; `acknowledged` is the recipient's act. */
export const GRANT_STATES = ["sent", "opened", "acknowledged", "expired", "revoked"];

/**
 * Stated once so no surface can imply more: an acknowledgement is a receipt, nothing else.
 */
export const ACKNOWLEDGEMENT_SEMANTICS = {
  is_receipt: true,
  is_approval: false,
  is_completion: false,
  is_verification: false,
  moves_obligation: false,
  changes_deadline: false,
  ar: "الإقرار ثبوت استلام فقط: لا يُعدّ اعتمادًا ولا إنجازًا ولا تحققًا، ولا ينقل التزامًا ولا يمدّد مهلة.",
  en: "Acknowledgement is a receipt only: it is not approval, not completion, not verification, and it moves no obligation and extends no deadline.",
};

export const QUESTION_CATEGORIES: Record<string, { ar: string; en: string }> = {
  scope: { ar: "نطاق الالتزام", en: "Scope of the obligation" },
  requirement: { ar: "المطلوب أو الدليل", en: "Requirement or evidence" },
  deadline: { ar: "المهلة", en: "Deadline" },
  authority: { ar: "الجهة المختصة بالإقرار", en: "Who accepts the deliverable" },
  other: { ar: "أمر آخر", en: "Something else" },
};
export const QUESTION_CATEGORY_KEYS = Object.keys(QUESTION_CATEGORIES);

export const EXTRACT_REFUSALS: Record<string, { ar: string; en: string }> = {
  token_required: { ar: "رابط المستخلص مطلوب", en: "An extract link is required" },
  token_unknown: { ar: "هذا الرابط غير معروف", en: "This link is not known" },
  revoked: { ar: "أُلغي هذا الرابط ولم يعد صالحًا", en: "This link was revoked and no longer works" },
  expired: { ar: "انتهت صلاحية هذا الرابط", en: "This link has expired" },
  not_yet_valid: { ar: "لم يبدأ سريان هذا الرابط بعد", en: "This link is not valid yet" },
  obligation_unavailable: { ar: "الالتزام المُسمّى غير متاح الآن", en: "The named obligation is not available now" },
  section_unknown: { ar: "القسم المطلوب غير معرّف في العقد", en: "The requested section is not in the contract" },
  section_not_permitted: { ar: "هذا القسم لا يجوز أن يخرج إلى جهة خارج اللجنة", en: "This section may not travel outside the committee" },
  recipient_required: { ar: "اسم الجهة المستلمة مطلوب", en: "The receiving party must be named" },
  recipient_too_long: { ar: "اسم الجهة أطول من الحد المسموح", en: "The receiving party's name exceeds the permitted length" },
  window_too_long: { ar: "مدة الصلاحية تتجاوز الحد المسموح", en: "The validity window exceeds the permitted maximum" },
  window_invalid: { ar: "مدة الصلاحية غير صحيحة", en: "The validity window is not a valid number of days" },
  grant_not_open: { ar: "هذا الرابط لا يقبل إجراءً الآن", en: "This link accepts no act now" },
  acknowledgement_name_required: { ar: "الإقرار يستلزم ذكر من أقرّ وصفته", en: "An acknowledgement states who acknowledges and in what capacity" },
  question_required: { ar: "نصّ السؤال مطلوب", en: "The question text is required" },
  question_too_long: { ar: "نصّ السؤال أطول من الحد المسموح", en: "The question exceeds the permitted length" },
  question_category_unknown: { ar: "تصنيف السؤال غير معرّف", en: "The question category is not in the contract" },
  question_limit_reached: { ar: "بلغتَ الحد الأقصى من الأسئلة المفتوحة على هذا الالتزام", en: "You have reached the maximum number of open questions on this obligation" },
  answer_required: { ar: "نصّ الردّ مطلوب", en: "The answer text is required" },
  answer_too_long: { ar: "نصّ الردّ أطول من الحد المسموح", en: "The answer exceeds the permitted length" },
  question_already_answered: { ar: "هذا السؤال مُجاب عليه بالفعل", en: "This question has already been answered" },
  clarification_not_found: { ar: "السؤال غير موجود", en: "The question was not found" },
};

export function refusal(code: string, extra: Record<string, any> = {}, status = 400) {
  const text = EXTRACT_REFUSALS[code] || { ar: null, en: code };
  return { ok: false, code, status, reason: text.en, reason_ar: text.ar, contract_version: EXTRACT_VERSION, ...extra };
}

/** The validity window a caller asked for, clamped to the contract's maximum. */
export function deriveWindow(days: any, now = new Date()) {
  const raw = days === undefined || days === null || days === "" ? DEFAULT_EXTRACT_DAYS : Number(days);
  if (!Number.isFinite(raw) || raw <= 0) return refusal("window_invalid");
  const capped = Math.min(Math.round(raw), MAX_EXTRACT_DAYS);
  return {
    ok: true,
    contract_version: EXTRACT_VERSION,
    days: capped,
    clamped: capped !== Math.round(raw),
    expires_at: new Date(now.getTime() + capped * 86400000).toISOString(),
  };
}

/** The sections a caller asked for: unknown or non-permitted keys are REFUSED, never dropped quietly. */
export function resolveSections(requested: any) {
  if (requested === undefined || requested === null) {
    return { ok: true, contract_version: EXTRACT_VERSION, sections: [...EXTRACT_SECTION_KEYS], dropped: [] };
  }
  if (!Array.isArray(requested)) return refusal("section_unknown");
  const asked = [...new Set(requested.map((s) => String(s)))];
  for (const key of asked) if (!EXTRACT_SECTION_KEYS.includes(key)) return refusal("section_unknown", { section: key });
  const sections = [...new Set([...asked, ...ALWAYS_INCLUDED_SECTIONS])];
  return { ok: true, contract_version: EXTRACT_VERSION, sections, dropped: [] };
}

/**
 * The token's own verdict. Four distinct answers, because the holder of a link deserves to know which
 * one applies: unknown, revoked, expired, not yet valid.
 */
export function assessGrant({ grant, at = new Date().toISOString() }: Record<string, any>) {
  if (!grant) return refusal("token_unknown", {}, 404);
  const now = new Date(at).getTime();
  if (grant.status === "revoked") return refusal("revoked", { state: "revoked" }, 410);
  if (grant.valid_from && now < new Date(grant.valid_from).getTime()) return refusal("not_yet_valid", { state: "not_yet_valid" }, 409);
  if (grant.expires_at && now >= new Date(grant.expires_at).getTime()) return refusal("expired", { state: "expired" }, 410);
  // A stored status may lag the clock; the clock decides.
  const state = ["acknowledged", "opened", "sent"].includes(grant.status) ? grant.status : "sent";
  return {
    ok: true,
    contract_version: EXTRACT_VERSION,
    state,
    acknowledged: !!grant.acknowledged_at || grant.status === "acknowledged",
    opened: !!grant.opened_at || ["acknowledged", "opened"].includes(grant.status),
    accepts_acts: true,
    access_scope: grant.access_scope || EXTRACT_SCOPE,
  };
}

/** Opening a link moves `sent` to `opened` — and nothing else. A later state is never moved back. */
export function stateAfterOpen(grant: any) {
  if (!grant) return null;
  return grant.status === "sent" ? "opened" : grant.status;
}

/** Acknowledging. Idempotent on purpose: a second acknowledgement is an answer, not an error. */
export function assessAcknowledgement({ grant, name, note }: Record<string, any>) {
  const access = assessGrant({ grant });
  if (!access.ok) return access;
  const clean = String(name || "").trim();
  if (!clean) return refusal("acknowledgement_name_required", {}, 400);
  if (clean.length > MAX_NAME_LENGTH) return refusal("recipient_too_long", {}, 400);
  if (note && String(note).length > MAX_NOTE_LENGTH) return refusal("recipient_too_long", { field: "note" }, 400);
  if (access.acknowledged) {
    return {
      ok: true, contract_version: EXTRACT_VERSION, idempotent: true,
      effect: "already_recorded", semantics: ACKNOWLEDGEMENT_SEMANTICS,
    };
  }
  return {
    ok: true, contract_version: EXTRACT_VERSION, idempotent: false,
    effect: "receipt_recorded", acknowledged_by_name: clean, note: note ? String(note) : null,
    semantics: ACKNOWLEDGEMENT_SEMANTICS,
  };
}

/** Raising a question: bounded in length, in category and in number. It changes no state. */
export function assessQuestion({ grant, category, question, open_count = 0 }: Record<string, any>) {
  const access = assessGrant({ grant });
  if (!access.ok) return access;
  const text = String(question || "").trim();
  if (!text) return refusal("question_required", {}, 400);
  if (text.length > MAX_QUESTION_LENGTH) return refusal("question_too_long", { max: MAX_QUESTION_LENGTH }, 400);
  if (category && !QUESTION_CATEGORY_KEYS.includes(String(category))) return refusal("question_category_unknown", { category }, 400);
  if (open_count >= MAX_OPEN_QUESTIONS) return refusal("question_limit_reached", { max: MAX_OPEN_QUESTIONS }, 429);
  return {
    ok: true, contract_version: EXTRACT_VERSION,
    category: category ? String(category) : "other",
    question: text,
    changes_state: false,
    changes_deadline: false,
  };
}

/** Answering, from the committee's side. */
export function assessAnswer({ clarification, answer }: Record<string, any>) {
  if (!clarification) return refusal("clarification_not_found", {}, 404);
  if (clarification.status !== "raised") return refusal("question_already_answered", { status: clarification.status }, 409);
  const text = String(answer || "").trim();
  if (!text) return refusal("answer_required", {}, 400);
  if (text.length > MAX_ANSWER_LENGTH) return refusal("answer_too_long", { max: MAX_ANSWER_LENGTH }, 400);
  return { ok: true, contract_version: EXTRACT_VERSION, answer: text, status: "answered" };
}

const clean = (v: any) => (v === undefined || v === null || v === "" ? null : v);
const day = (v: any) => (v ? String(v).slice(0, 10) : null);
const stamp = (v: any) => (v ? String(v) : null);

/**
 * The extract itself. Every value here is copied from the record ON PURPOSE, one field at a time:
 * a new field added to `Action` tomorrow cannot leak through this function, because it is not named.
 */
export function buildActionExtract({ action, decision = null, committee = null, organization = null, grant = null }: Record<string, any>) {
  const included: string[] = Array.isArray(grant?.permitted_sections) && grant.permitted_sections.length
    ? grant.permitted_sections.filter((s: string) => EXTRACT_SECTION_KEYS.includes(s))
    : [...EXTRACT_SECTION_KEYS];
  const with_ = (section: string) => included.includes(section);

  const extract: Record<string, any> = {};
  if (with_("obligation")) {
    extract.obligation = {
      reference: action.id,
      title: clean(action.title_ar || action.title),
      title_en: clean(action.title_en || action.title),
      status: clean(action.status),
      deadline: day(action.deadline),
      priority: clean(action.priority),
      owner_name: clean(action.owner_name),
      owner_name_en: clean(action.owner_name_en),
      responsible_department: clean(action.responsible_department),
      responsible_department_en: clean(action.responsible_department_en),
    };
  }
  if (with_("requirement")) {
    extract.requirement = {
      required_evidence: clean(action.required_evidence),
      required_evidence_en: clean(action.required_evidence_en),
    };
  }
  if (with_("progress")) {
    extract.progress = {
      progress_percent: typeof action.progress_percent === "number" ? action.progress_percent : 0,
      blocker: clean(action.blocker),
    };
  }
  if (with_("evidence")) {
    extract.evidence = {
      revision: Number(action.evidence_revision || 0),
      submitted_at: stamp(action.evidence_submitted_at),
      reference: clean(action.evidence_url),
      submitted_notes: clean(action.evidence_notes),
    };
  }
  if (with_("verdict")) {
    extract.verdict = {
      state: clean(action.verification_state) || "not_submitted",
      return_reason: clean(action.return_reason),
      returned_at: stamp(action.evidence_returned_at),
      accepted_at: stamp(action.verified_at),
      closed_at: stamp(action.closed_at),
      // The judge's identity is deliberately NOT here — see EXCLUDED_BY_CONTRACT.verifier_identity.
    };
  }
  if (with_("origin")) {
    extract.origin = {
      committee: committee ? { name: clean(committee.name_ar || committee.name), name_en: clean(committee.name_en || committee.name) } : null,
      organization: organization ? { name: clean(organization.name_ar || organization.name), name_en: clean(organization.name_en || organization.name) } : null,
      decision: decision ? { number: clean(decision.decision_number), title: clean(decision.title_ar || decision.title), title_en: clean(decision.title_en || decision.title), issued_at: stamp(decision.issued_at) } : null,
    };
  }

  const present = Object.keys(extract);
  return {
    contract_version: EXTRACT_VERSION,
    extract,
    sections_included: included,
    sections_withheld: EXTRACT_SECTION_KEYS.filter((s) => !included.includes(s)),
    excluded_by_contract: EXCLUDED_BY_CONTRACT,
    semantics: ACKNOWLEDGEMENT_SEMANTICS,
    scope: { access_scope: EXTRACT_SCOPE, valid_from: stamp(grant?.valid_from), expires_at: stamp(grant?.expires_at) },
    recipient: grant
      ? { name: clean(grant.recipient_name), name_en: clean(grant.recipient_name_en), organization: clean(grant.recipient_organization), organization_en: clean(grant.recipient_organization_en), purpose: clean(grant.purpose) }
      : null,
    withheld_field_count: EXCLUDED_BY_CONTRACT.length,
    sections_present_count: present.length,
  };
}