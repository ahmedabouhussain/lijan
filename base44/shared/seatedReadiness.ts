// seatedReadiness.ts — S22 · seated-readiness-1.0.0
//
// WHY THIS FILE EXISTS. The blocker "no authorized seated actor exists" (D-064) was a sentence in a
// register: true, but neither measured nor actionable — nothing in the platform could answer, FROM THE
// RECORDS THEMSELVES, which committee can run a positive round today and what exactly is missing.
//
// This module answers that, under three rules that keep the answer honest:
//
//   1. The eligible electorate is the electorate the VOTE command computes — the same module
//      (voteEligibility.ts), same day, same recusals. Never a second opinion. A readiness measure that
//      disagrees with the command it describes is worse than no measure at all.
//   2. A seat counts as able to act only when a person can actually sign in from it: bound to a user
//      account that is not a demonstration identity. An eligible seat nobody holds runs nothing.
//   3. What could not be read is NAMED and makes the verdict 'unreadable' — never zero, never ready.
//      (An unread source is not an empty one: this is the rule of §4.F, applied to measurement.)
//
// The right each run depends on is READ FROM THE SURFACE REGISTER, so this measure cannot describe a
// right the platform does not publish — and a right the register has not re-derived blocks its run
// instead of being assumed to work.

import { computeElectorate } from "./voteEligibility.ts";
import { capabilitiesForRole } from "./authorityKernel.ts";
import { GOVERNANCE_SURFACES } from "./governanceSurfaceRegistry.ts";

export const SEATED_READINESS_VERSION = "seated-readiness-1.0.0";

/** The Committee.quorum_count default, declared once: the assessor never invents a threshold. */
export const DEFAULT_QUORUM = 3;

/** The label used when the account directory itself could not be read. */
export const USER_DIRECTORY_LABEL = "User (دليل حسابات المستخدمين)";

export const READINESS_VERDICTS: Record<string, { ar: string; en: string }> = {
  executable: {
    ar: "قابلة للتشغيل: المقاعد المؤهلة المربوطة بحسابات تبلغ النصاب",
    en: "Executable: the eligible seats bound to accounts meet the quorum",
  },
  insufficient_seated_voters: {
    ar: "غير قابلة للتشغيل: المقاعد المؤهلة المربوطة بحسابات لا تبلغ النصاب",
    en: "Not executable: too few eligible seats are bound to accounts",
  },
  unreadable: {
    ar: "غير قابلة للقياس: مصدر لازم لم يُقرأ ⇒ لا يُعلن صفر ولا جاهزية",
    en: "Unmeasurable: a required source could not be read, so neither zero nor readiness is claimed",
  },
};

/** Every reason a run can be blocked. Each names the exact gap, never a bare refusal. */
export const BLOCKING_CODES: Record<string, { ar: string; en: string }> = {
  zero_electorate: { ar: "لا مقعد تصويتي مؤهل في هذه اللجنة", en: "This committee has no eligible voting seat" },
  quorum_above_electorate: { ar: "عدد المقاعد المؤهلة أقل من النصاب المطلوب", en: "Fewer eligible seats than the quorum requires" },
  binding_below_quorum: { ar: "المقاعد المؤهلة تكفي، لكن المربوط منها بحساب مستخدم أقل من النصاب", en: "Eligible seats suffice, but fewer of them are bound to user accounts than the quorum requires" },
  binding_unverified: { ar: "تعذّر قراءة دليل حسابات المستخدمين ⇒ لا يمكن إثبات أن مقعدًا قابل للعمل", en: "The user directory could not be read, so no seat can be shown to be workable" },
  no_seated_officer: { ar: "لا مقعد مربوط بحساب يحمل الحقّ الذي تتطلبه هذه الرحلة", en: "No seat bound to an account holds the right this run requires" },
  officer_right_unverified: { ar: "حقّ هذه الرحلة لم يُعد اشتقاقه في السجل ⇒ لا تُدَّعى جاهزيتها", en: "This run's right was not re-derived in the register, so its readiness is not claimed" },
  officer_right_undeclared: { ar: "لا حق مُعلن لهذا الأمر في سجل الأسطح", en: "The register declares no right for this command" },
  policy_row_missing: { ar: "سجل سياسة اللجنة الذي تستند إليه هذه الرحلة غير موجود أو غير مُمكن", en: "The committee's own policy record this run rests on is absent or disabled" },
  policy_state_unread: { ar: "تعذّر قراءة سجل سياسة اللجنة", en: "The committee's policy record could not be read" },
  no_open_obligation: { ar: "لا التزام مفتوح ليشمل هذه الرحلة", en: "There is no open obligation for this run to cover" },
  obligation_state_unread: { ar: "تعذّر قراءة التزامات اللجنة", en: "The committee's obligations could not be read" },
  readiness_unverifiable: { ar: "مصدر لازم للقياس لم يُقرأ ⇒ لا يُعلن أن الرحلة جاهزة", en: "A source the measure needs could not be read, so the run is never reported ready" },
};

/** What would actually unblock a committee. An enabler, not a complaint. */
export const ENABLERS: Record<string, { ar: string; en: string }> = {
  appoint_voting_seats: {
    ar: "عيّن مقاعد تصويتية حتى بلوغ النصاب المطلوب",
    en: "Appoint voting seats up to the required quorum",
  },
  bind_accounts: {
    ar: "اربط مقاعد النصاب بحسابات مستخدمين حقيقية (دعوة المستخدم أو إسناد المقعد إلى حسابه)",
    en: "Bind the quorum's seats to real user accounts (invite the user, or assign the seat to their account)",
  },
  appoint_officer: {
    ar: "أسنِد المقعد المطلوب إلى حساب يحمل الحقّ اللازم للرحلة",
    en: "Assign the required seat to an account that holds the right the run needs",
  },
  record_policy: {
    ar: "سجّل سياسة اللجنة (بالقرار المتخذ) قبل فتح هذه الرحلة",
    en: "Record the committee's policy (by its own decision) before opening this run",
  },
  assign_obligation: {
    ar: "أنشئ التزامًا مفتوحًا على قرار صادر",
    en: "Create an open obligation on an issued decision",
  },
  read_sources: {
    ar: "أعد المحاولة بعد توفّر المصدر الذي لم يُقرأ",
    en: "Retry once the source that could not be read is available",
  },
};

/**
 * The persisted runs the platform cannot yet prove. Each names the commands it would execute (all of
 * them governed, all of them declared in the surface register) and the precondition it needs.
 */
export const SEATED_RUNS = [
  {
    id: "D2",
    ar: "الدورة الموجبة للاجتماع والقرار",
    en: "The positive meeting and decision cycle",
    proves_ar: "أن قرارًا يُنشأ ثم يُصوَّت عليه ثم يُصدَّر ثم يبدأ تنفيذه على سجلات محفوظة",
    proves_en: "That a decision is drafted, voted, issued and put into execution over persisted records",
    steps: ["CreateDecisionDraft", "OpenVote", "CastVote", "CloseVote", "IssueDecision"],
    authority_command: "OpenVote",
    requires: ["seated_voters", "seated_officer"],
    precondition_ar: "مقعد رئيس مربوط بحساب لفتح التصويت، ومقاعد مؤهلة مربوطة بحسابات تبلغ النصاب",
    precondition_en: "A bound chair seat to open the vote, and eligible seats bound to accounts that meet the quorum",
    enabling_ar: "اربط مقعد الرئيس ومقاعد النصاب بحسابات مستخدمين حقيقية",
    enabling_en: "Bind the chair seat and the quorum's seats to real user accounts",
  },
  {
    id: "D3",
    ar: "مسار المحضر: تحرير ثم اعتماد ثم إصدار",
    en: "The minutes route: prepare, approve, issue",
    proves_ar: "أن محضرًا يُحرَّر ويُعتمد من مقعد مخوَّل ثم يُصدَّر ثم يُعدَّل لاحقًا بلا الكتابة فوق المعتمد",
    proves_en: "That minutes are prepared, approved from a competent seat, issued, and later amended without overwriting the approved text",
    steps: ["PrepareMinutes", "ApproveMinutes", "TransitionMinutes"],
    authority_command: "TransitionMinutes",
    requires: ["seated_officer"],
    precondition_ar: "مقعد مربوط بحساب يحمل حق إصدار المحضر",
    precondition_en: "A seat bound to an account holding the right to issue the minutes",
    enabling_ar: "أسنِد مقعد أمين اللجنة إلى حساب مستخدم حقيقي",
    enabling_en: "Assign the committee secretary seat to a real user account",
  },
  {
    id: "D4",
    ar: "القرار بالتمرير: من السياسة إلى الإصدار",
    en: "The written resolution: from policy to issuance",
    proves_ar: "أن قرارًا يُعتمد بالتمرير على سياسة اللجنة، وتُنتج نتيجته من مقعد مخوَّل غير مُرسِل الدورة، ثم يُصدر",
    proves_en: "That a decision is approved by circulation on the committee's own policy, its outcome produced by an authorized seat other than the dispatcher, and then issued",
    steps: ["SetCirculationPolicy", "OpenCirculation", "RecordCirculationResponse", "FinalizeCirculation", "IssueDecision"],
    authority_command: "FinalizeCirculation",
    requires: ["seated_voters", "seated_officer", "policy_row"],
    precondition_ar: "سياسة مكتوبة في سجل اللجنة، ومقعد مربوخ يحمل حق إنتاج النتيجة، ومقاعد مؤهلة مربوطة تشارك",
    precondition_en: "A policy written in the committee's own record, a bound seat holding the right to produce the outcome, and bound eligible seats that participate",
    enabling_ar: "سجّل سياسة اللجنة، ثم اربط مقعد المُصادِق ومقاعد المشاركة بحسابات حقيقية",
    enabling_en: "Record the committee's policy, then bind the finalizer's seat and the participating seats to real accounts",
  },
  {
    id: "D5",
    ar: "التغيير والإغلاق مع الحجز القانوني",
    en: "Change, closure and the legal hold",
    proves_ar: "أن تعداد الالتزامات يُجمَّع خادميًا، ويُسجَّل مصير كل التزام، ويوقف الحجز القانوني الإغلاق فعلًا",
    proves_en: "That the obligation inventory is compiled server-side, every obligation is dispositioned, and a legal hold actually stops closure",
    steps: ["CompileChangeInventory", "RecordChangeDisposition", "CloseCommittee"],
    authority_command: "CloseCommittee",
    requires: ["seated_officer"],
    precondition_ar: "مقعد مربوط بحساب يحمل حق إغلاق اللجنة",
    precondition_en: "A seat bound to an account holding the right to close the committee",
    enabling_ar: "أسنِد مقعد الرئيس إلى حساب مستخدم حقيقي",
    enabling_en: "Assign the chair seat to a real user account",
  },
  {
    id: "D6",
    ar: "مستخلص التنفيذ وإقرار الجهة",
    en: "The execution extract and the recipient's receipt",
    proves_ar: "أن مستخلصًا مقيدًا بالتزام واحد يُصدر لجهة خارجية، فتُقرأ بالإقرار تُسجَّل وتُسأل أسئلتها ويُجاب عليها",
    proves_en: "That an obligation-scoped extract is issued to an outside party, whose read, acknowledgement and questions are recorded and answered",
    steps: ["ShareActionExtract", "RespondToActionExtract"],
    authority_command: "ShareActionExtract",
    requires: ["seated_officer", "open_obligation"],
    precondition_ar: "مقعد مربوط بحساب يحمل حق إدارة الإجراءات، والتزام مفتوح واحد على الأقل",
    precondition_en: "A seat bound to an account holding the action-administration right, and at least one open obligation",
    enabling_ar: "أسنِد مقعدًا إداريًا إلى حساب مستخدم حقيقي على قرار صادر له التزام مفتوح",
    enabling_en: "Assign an administrative seat to a real user account on an issued decision that carries an open obligation",
  },
];

/** The register's own declaration for a command — the right a run's demanding step needs. */
export function declaredRight(command: string) {
  const surface = GOVERNANCE_SURFACES.find((s) => s.command === command) || null;
  if (!surface) return { surface: null, capability: null, source: null };
  return { surface, capability: surface.capability && surface.capability !== "none" ? surface.capability : null, source: surface.capability_source || null };
}

/**
 * Does any seat bound to an account hold the right this run needs? The right comes from the register,
 * the role baseline comes from the kernel (`capabilitiesForRole`) — neither is re-typed here.
 */
export function assessOfficerRight({ command, bound_seats = [], surface_override = null }: { command: string; bound_seats?: any[]; surface_override?: any }) {
  const declared = declaredRight(command);
  const surface = surface_override || declared.surface;
  const capability = surface_override ? (surface_override.capability || null) : declared.capability;
  const source = surface_override ? (surface_override.capability_source || null) : declared.source;
  if (!surface || !capability) return { ok: false, code: "officer_right_undeclared", capability: null, surface_id: surface ? surface.id : null };
  if (source === "unverified") return { ok: false, code: "officer_right_unverified", capability, surface_id: surface.id };
  const officers = bound_seats.filter((s) => capabilitiesForRole(s.role || "member").includes(capability));
  if (officers.length === 0) return { ok: false, code: "no_seated_officer", capability, surface_id: surface.id };
  return { ok: true, capability, surface_id: surface.id, officer_seat_ids: officers.map((o) => o.id) };
}

/**
 * One committee's readiness, computed from its records.
 *
 *   committee       the committee record (its own quorum_count is the threshold; never invented)
 *   seats           ACTIVE CommitteeMembership rows, as the vote command reads them
 *   recusals        ACTIVE Recusal rows for the committee
 *   users_known     Set of user ids, or null when the directory could not be read
 *   policy_present  whether the committee's own policy row exists and is enabled, or null when unread
 *   open_obligations count of open obligations, or null when unread
 */
export function assessSeatedReadiness({
  committee = {}, seats = [], recusals = [], users_known = null, users_unread = null,
  policy_present = null, policy_unread = false, open_obligations = null, obligations_unread = false,
  sources_unread = [],
  day = new Date().toISOString().slice(0, 10),
}: any = {}) {
  const unread_sources = [...new Set([
    ...(Array.isArray(sources_unread) ? sources_unread : []),
    ...(users_unread ? [users_unread] : []),
  ])];

  const all_seats = Array.isArray(seats) ? seats : [];
  const voting_candidates = all_seats.filter((s) => s && s.status === "active" && s.voting_right !== false);

  // The electorate is the vote command's electorate; the officer pool is the same in-term, non-recused
  // rule applied to every active seat, so a secretary without a voting right can still be an officer.
  const electorate = computeElectorate({ seats: voting_candidates, recusals, day });
  const officer_pool = computeElectorate({ seats: all_seats.filter((s) => s && s.status === "active"), recusals, day }).eligible;

  const eligible = electorate.eligible;
  const quorum_count = Number(committee.quorum_count);
  const quorum_required = Number.isFinite(quorum_count) && quorum_count > 0 ? quorum_count : DEFAULT_QUORUM;
  const quorum_source = Number.isFinite(quorum_count) && quorum_count > 0 ? "committee.quorum_count" : "readiness_default";

  const bound = (rows: any[]) => (users_known ? rows.filter((s) => s.user_id && users_known.has(s.user_id) && s.is_demonstration_role !== true) : []);
  const bound_seats = users_known ? bound(eligible).length : null;
  const bound_officer_pool = users_known ? bound(officer_pool) : [];
  const binding_state = !users_known ? "unverified" : (bound_seats >= quorum_required ? "quorum_met" : "below_quorum");

  const with_user_id = eligible.filter((s) => !!s.user_id).length;
  const demonstration_seats = eligible.filter((s) => s.is_demonstration_role === true).length;

  let verdict = "executable";
  let reason = null;
  let enabler = null;
  let reason_code = null;
  // A source that failed to load is NEVER zero (rule 3): the committee reads unmeasurable and no run is
  // reported ready. Only what was actually read may produce a number.
  if (unread_sources.length > 0) {
    verdict = "unreadable";
    reason_code = "readiness_unverifiable";
    reason = BLOCKING_CODES.readiness_unverifiable;
    enabler = ENABLERS.read_sources;
  } else if (eligible.length === 0) {
    verdict = "insufficient_seated_voters";
    reason_code = "zero_electorate";
    reason = BLOCKING_CODES.zero_electorate;
    enabler = ENABLERS.appoint_voting_seats;
  } else if (eligible.length < quorum_required) {
    verdict = "insufficient_seated_voters";
    reason_code = "quorum_above_electorate";
    reason = BLOCKING_CODES.quorum_above_electorate;
    enabler = ENABLERS.appoint_voting_seats;
  } else if (!users_known) {
    // The seats were read; the ACCOUNTS were not. That is a different fact from "nobody holds a seat",
    // and it is reported as such — the directory is named as the source that was not read.
    if (!unread_sources.includes(USER_DIRECTORY_LABEL)) unread_sources.push(USER_DIRECTORY_LABEL);
    verdict = "unreadable";
    reason_code = "binding_unverified";
    reason = BLOCKING_CODES.binding_unverified;
    enabler = ENABLERS.read_sources;
  } else if (bound_seats < quorum_required) {
    verdict = "insufficient_seated_voters";
    reason_code = "binding_below_quorum";
    reason = BLOCKING_CODES.binding_below_quorum;
    enabler = ENABLERS.bind_accounts;
  }

  const seatsBlockingCode = () => {
    if (!users_known) return "binding_unverified";
    if (eligible.length === 0) return "zero_electorate";
    if (eligible.length < quorum_required) return "quorum_above_electorate";
    if (bound_seats < quorum_required) return "binding_below_quorum";
    return null;
  };

  const runs = SEATED_RUNS.map((run: any) => {
    let code = null;
    if (verdict === "unreadable") {
      code = "readiness_unverifiable";
    } else {
      for (const req of run.requires) {
        if (req === "seated_voters") {
          const c = seatsBlockingCode();
          if (c) { code = c; break; }
        } else if (req === "seated_officer") {
          const officer = assessOfficerRight({ command: run.authority_command, bound_seats: bound_officer_pool });
          if (!officer.ok) { code = officer.code; break; }
        } else if (req === "policy_row") {
          if (policy_unread) { code = "policy_state_unread"; break; }
          if (policy_present !== true) { code = "policy_row_missing"; break; }
        } else if (req === "open_obligation") {
          if (obligations_unread) { code = "obligation_state_unread"; break; }
          if (!(open_obligations > 0)) { code = "no_open_obligation"; break; }
        }
      }
    }
    return {
      id: run.id,
      ar: run.ar,
      en: run.en,
      status: code ? "blocked" : "ready",
      blocking_code: code,
      blocking_text: code ? BLOCKING_CODES[code] || null : null,
      precondition_ar: run.precondition_ar,
      precondition_en: run.precondition_en,
      enabling_ar: run.enabling_ar,
      enabling_en: run.enabling_en,
    };
  });

  return {
    contract_version: SEATED_READINESS_VERSION,
    day,
    readable: unread_sources.length === 0,
    eligible_seats: eligible.length,
    eligible_seat_ids: electorate.eligible_seat_ids,
    excluded: electorate.excluded,
    bound_seats,
    seats_with_user_id: with_user_id,
    demonstration_seats,
    quorum_required,
    quorum_source,
    binding_state,
    electorate_policy_version: electorate.policy_version,
    verdict,
    verdict_text: READINESS_VERDICTS[verdict],
    reason_code: verdict === "executable" ? null : reason_code,
    reason_text: reason,
    enabling_action_text: enabler,
    unread_sources,
    runs,
    ready_runs: runs.filter((r: any) => r.status === "ready").map((r: any) => r.id),
    blocked_runs: runs.filter((r: any) => r.status !== "ready").map((r: any) => r.id),
  };
}

/** Counts for the surface: never a total without its parts. */
export function summarizeReadiness(rows: any[] = []) {
  const out: any = { committees: rows.length, executable: 0, insufficient_seated_voters: 0, unreadable: 0, not_readable: 0, eligible_seats: 0, bound_seats: 0, ready_runs: [] };
  for (const r of rows) {
    if (r.readable === false && r.verdict === undefined) { out.not_readable += 1; continue; }
    out[r.verdict] = (out[r.verdict] || 0) + 1;
    out.eligible_seats += r.eligible_seats || 0;
    out.bound_seats += typeof r.bound_seats === "number" ? r.bound_seats : 0;
    for (const id of r.ready_runs || []) if (!out.ready_runs.includes(id)) out.ready_runs.push(id);
    if ((r.unread_sources || []).length > 0) out.unread_sources = (out.unread_sources || []).concat(r.unread_sources);
  }
  if (out.unread_sources) out.unread_sources = [...new Set(out.unread_sources)];
  return out;
}