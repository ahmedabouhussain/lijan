// LIJAN shared utilities — bilingual labels, status maps, helpers
import { getActiveLang } from "@/lib/l10n";

// ── Semantic state palette ────────────────────────────────────────────────────
// Every status colour in the platform resolves through these five families, which
// come from the semantic tokens in index.css / tailwind.config.js. No blue, cyan,
// purple or violet is part of the institutional identity: state is carried by a
// quiet plate plus the status word, never by a decorative colour.
const S = {
  neutral: "text-state-neutral-ink bg-state-neutral-surface",
  info: "text-state-info-ink bg-state-info-surface",
  progress: "text-state-progress-ink bg-state-progress-surface",
  success: "text-state-success-ink bg-state-success-surface",
  warning: "text-state-warning-ink bg-state-warning-surface",
  danger: "text-state-danger-ink bg-state-danger-surface",
  ceremonial: "text-state-ceremonial-ink bg-state-ceremonial-surface",
  // Ink-only variants — for rows where a plate would add noise.
  infoInk: "text-state-info-ink",
  warningInk: "text-state-warning-ink",
  dangerInk: "text-state-danger-ink",
  mutedInk: "text-muted-foreground",
};

export const COMMITTEE_TYPES = {
  permanent_council: { ar: "مجلس دائم", en: "Permanent Council" },
  permanent_committee: { ar: "لجنة دائمة", en: "Permanent Committee" },
  temporary_committee: { ar: "لجنة مؤقتة", en: "Temporary Committee" },
  ministerial_committee: { ar: "لجنة وزارية", en: "Ministerial Committee" },
  national_committee: { ar: "لجنة وطنية", en: "National Committee" },
  task_force: { ar: "فريق عمل", en: "Task Force" },
  working_group: { ar: "مجموعة عمل", en: "Working Group" },
  advisory_committee: { ar: "لجنة استشارية", en: "Advisory Committee" },
  special_committee: { ar: "لجنة خاصة", en: "Special Committee" },
  joint_committee: { ar: "لجنة مشتركة", en: "Joint Committee" },
  cross_institutional: { ar: "لجنة عبر المؤسسات", en: "Cross-Institutional" },
};

export const COMMITTEE_STATUS = {
  draft: { ar: "مسودة", en: "Draft", color: S.neutral },
  pending_activation: { ar: "بانتظار التفعيل", en: "Pending Activation", color: S.warning },
  active: { ar: "نشطة", en: "Active", color: S.success },
  closing: { ar: "قيد الإغلاق", en: "Closing", color: S.progress },
  closed: { ar: "مغلقة", en: "Closed", color: S.neutral },
  archived: { ar: "مؤرشفة", en: "Archived", color: S.neutral },
};

export const MEETING_STATUS = {
  scheduled: { ar: "مجدول", en: "Scheduled", color: S.info },
  in_progress: { ar: "جارٍ", en: "In Progress", color: S.progress },
  adjourned: { ar: "مؤجلة", en: "Adjourned", color: S.warning },
  completed: { ar: "مكتملة", en: "Completed", color: S.neutral },
  cancelled: { ar: "ملغاة", en: "Cancelled", color: S.danger },
};

export const DECISION_STATUS = {
  draft: { ar: "مسودة", en: "Draft", color: S.neutral },
  in_review: { ar: "قيد المراجعة", en: "In Review", color: S.info },
  proposed: { ar: "مقترح", en: "Proposed", color: S.warning },
  voting: { ar: "قيد التصويت", en: "Voting", color: S.ceremonial },
  approved: { ar: "معتمد", en: "Approved", color: S.success },
  rejected: { ar: "مرفوض", en: "Rejected", color: S.danger },
  deferred: { ar: "مؤجل", en: "Deferred", color: S.warning },
  issued: { ar: "صادر", en: "Issued", color: S.ceremonial },
  executing: { ar: "قيد التنفيذ", en: "Executing", color: S.progress },
  completed: { ar: "مكتمل", en: "Completed", color: S.success },
  superseded: { ar: "ملغى بقرار لاحق", en: "Superseded", color: S.neutral },
  closed: { ar: "مغلق", en: "Closed", color: S.neutral },
};

export const ACTION_STATUS = {
  assigned: { ar: "مُسند", en: "Assigned", color: S.info },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress", color: S.progress },
  blocked: { ar: "متعثر", en: "Blocked", color: S.danger },
  evidence_pending: { ar: "بانتظار الأدلة", en: "Evidence Pending", color: S.warning },
  under_review: { ar: "قيد المراجعة", en: "Under Review", color: S.ceremonial },
  verified: { ar: "تم التحقق", en: "Verified", color: S.success },
  closed: { ar: "مغلق", en: "Closed", color: S.neutral },
  overdue: { ar: "متأخر", en: "Overdue", color: S.danger },
};

export const PRIORITY = {
  low: { ar: "منخفضة", en: "Low", color: S.mutedInk },
  medium: { ar: "متوسطة", en: "Medium", color: S.infoInk },
  high: { ar: "عالية", en: "High", color: S.warningInk },
  critical: { ar: "حرجة", en: "Critical", color: S.dangerInk },
};

export const READINESS = {
  ready: { ar: "جاهز", en: "Ready", color: S.success },
  needs_attention: { ar: "يحتاج انتباه", en: "Needs Attention", color: S.warning },
  not_ready: { ar: "غير جاهز", en: "Not Ready", color: S.danger },
};

export const AGENDA_ITEM_STATUS = {
  pending: { ar: "بانتظار", en: "Pending", color: S.neutral },
  in_discussion: { ar: "قيد المناقشة", en: "In Discussion", color: S.info },
  decided: { ar: "تم القرار", en: "Decided", color: S.success },
  deferred: { ar: "مؤجل", en: "Deferred", color: S.warning },
  withdrawn: { ar: "مسحوب", en: "Withdrawn", color: S.danger },
};

export const ESCALATION_LEVEL = {
  none: { ar: "بدون", en: "None" },
  reminder: { ar: "تذكير", en: "Reminder" },
  priority_reminder: { ar: "تذكير أولوية", en: "Priority Reminder" },
  owner_secretary: { ar: "الأمين", en: "Owner Secretary" },
  chair: { ar: "الرئيس", en: "Chair" },
  escalation_authority: { ar: "جهة التصعيد", en: "Escalation Authority" },
};

export const CLASSIFICATION = {
  public: { ar: "عام", en: "Public" },
  internal: { ar: "داخلي", en: "Internal" },
  confidential: { ar: "سري", en: "Confidential" },
  restricted: { ar: "مقيد", en: "Restricted" },
  highly_restricted: { ar: "سري للغاية", en: "Highly Restricted" },
};

export const MINUTES_STATUS = {
  draft: { ar: "مسودة", en: "Draft", color: S.neutral },
  in_review: { ar: "قيد المراجعة", en: "In Review", color: S.info },
  approved: { ar: "معتمد", en: "Approved", color: S.success },
  issued: { ar: "صادر", en: "Issued", color: S.ceremonial },
  amended: { ar: "معدل", en: "Amended", color: S.warning },
};

export const ATTENDANCE_STATUS = {
  present: { ar: "حاضر", en: "Present", color: S.success },
  absent: { ar: "غائب", en: "Absent", color: S.danger },
  apologies: { ar: "اعتذر", en: "Apologies", color: S.warning },
  proxy: { ar: "بالنيابة", en: "Proxy", color: S.info },
  late: { ar: "متأخر", en: "Late", color: S.warning },
};

export const MEMBER_ROLE = {
  chair: { ar: "الرئيس", en: "Chair" },
  vice_chair: { ar: "نائب الرئيس", en: "Vice Chair" },
  secretary: { ar: "الأمين", en: "Secretary" },
  committee_administrator: { ar: "مدير اللجنة", en: "Committee Administrator" },
  member: { ar: "عضو", en: "Member" },
  alternate: { ar: "بديل", en: "Alternate" },
  observer: { ar: "مراقب", en: "Observer" },
  advisor: { ar: "مستشار", en: "Advisor" },
};

export const INITIATIVE_STATUS = {
  proposed: { ar: "مقترحة", en: "Proposed", color: S.neutral },
  under_review: { ar: "قيد الدراسة", en: "Under Review", color: S.warning },
  prioritized: { ar: "ذات أولوية", en: "Prioritized", color: S.info },
  approved: { ar: "معتمدة", en: "Approved", color: S.success },
  in_delivery: { ar: "قيد التنفيذ", en: "In Delivery", color: S.progress },
  blocked: { ar: "متعثرة", en: "Blocked", color: S.danger },
  measuring_impact: { ar: "قياس الأثر", en: "Measuring Impact", color: S.ceremonial },
  closed: { ar: "مغلقة", en: "Closed", color: S.neutral },
};

export const WORKSTREAM_STATUS = {
  active: { ar: "نشط", en: "Active", color: S.success },
  in_preparation: { ar: "قيد التحضير", en: "In Preparation", color: S.warning },
  on_hold: { ar: "متوقف مؤقتًا", en: "On Hold", color: S.danger },
  closed: { ar: "مغلق", en: "Closed", color: S.neutral },
};

export const FIRST_MEETING_STATUS = {
  not_yet_scheduled: { ar: "لم يُحدَّد بعد", en: "Not yet scheduled", color: S.neutral },
  scheduled: { ar: "مجدول", en: "Scheduled", color: S.info },
  held: { ar: "منعقد", en: "Held", color: S.success },
  status_pending_confirmation: { ar: "قيد تأكيد الحالة", en: "Status pending confirmation", color: S.warning },
};

export const WORKSTREAM_ROLE = {
  lead: { ar: "قائد مجموعة العمل", en: "Work Group Lead" },
  deputy_lead: { ar: "نائب قائد مجموعة العمل", en: "Deputy Work Group Lead" },
  member: { ar: "عضو", en: "Member" },
  contributor: { ar: "مساهم", en: "Contributor" },
  observer: { ar: "مراقب", en: "Observer" },
};

export const AUTHORITY_LEVELS = {
  decision: { ar: "سلطة القرار", en: "Decision Authority" },
  approval: { ar: "سلطة الاعتماد", en: "Approval Authority" },
  execution: { ar: "سلطة التنفيذ", en: "Execution Authority" },
  oversight: { ar: "سلطة الرقابة", en: "Oversight Authority" },
  escalation: { ar: "سلطة التصعيد", en: "Escalation Authority" },
  advisory: { ar: "سلطة الاستشارة", en: "Advisory Authority" },
};

export const DEPENDENCY_TYPE = {
  requires: { ar: "يتطلب", en: "Requires", color: S.info },
  blocks: { ar: "يعيق", en: "Blocks", color: S.danger },
  informs: { ar: "يبلغ", en: "Informs", color: S.warning },
  supersedes: { ar: "يحل محل", en: "Supersedes", color: S.ceremonial },
  aligns_with: { ar: "متوافق مع", en: "Aligns With", color: S.success },
};

export const DEPENDENCY_STATUS = {
  pending: { ar: "بانتظار", en: "Pending", color: S.warning },
  active: { ar: "نشطة", en: "Active", color: S.info },
  resolved: { ar: "محلولة", en: "Resolved", color: S.success },
  broken: { ar: "مكسورة", en: "Broken", color: S.danger },
};

export const SCENARIO_TYPE = {
  baseline: { ar: "الأساسي", en: "Baseline", color: S.neutral },
  alternative: { ar: "بديل", en: "Alternative", color: S.info },
  preferred: { ar: "مفضل", en: "Preferred", color: S.success },
  rejected: { ar: "مرفوض", en: "Rejected", color: S.danger },
};

export const SCENARIO_STATUS = {
  draft: { ar: "مسودة", en: "Draft", color: S.neutral },
  evaluating: { ar: "قيد التقييم", en: "Evaluating", color: S.info },
  selected: { ar: "مختار", en: "Selected", color: S.success },
  rejected: { ar: "مرفوض", en: "Rejected", color: S.danger },
  archived: { ar: "مؤرشف", en: "Archived", color: S.neutral },
};

export const AI_OUTPUT_TYPE = {
  meeting_minutes: { ar: "محضر اجتماع", en: "Meeting Minutes", color: S.info },
  governance_doc: { ar: "وثيقة حوكمة", en: "Governance Doc", color: S.ceremonial },
  decision_draft: { ar: "مسودة قرار", en: "Decision Draft", color: S.ceremonial },
  policy_scenario: { ar: "سيناريو سياسي", en: "Policy Scenario", color: S.warning },
  summary: { ar: "ملخص", en: "Summary", color: S.neutral },
  other: { ar: "أخرى", en: "Other", color: S.neutral },
};

export const AI_OUTPUT_STATUS = {
  generated: { ar: "مولّد", en: "Generated", color: S.warning },
  under_review: { ar: "قيد المراجعة", en: "Under Review", color: S.info },
  approved: { ar: "معتمد", en: "Approved", color: S.success },
  rejected: { ar: "مرفوض", en: "Rejected", color: S.danger },
  amended: { ar: "معدل", en: "Amended", color: S.warning },
};

// Document lifecycle — the one vocabulary every document surface reads its status from.
export const DOCUMENT_STATUS = {
  draft: { ar: "مسودة", en: "Draft", color: "bg-state-neutral-surface text-state-neutral-ink" },
  in_review: { ar: "قيد المراجعة", en: "In review", color: "bg-state-warning-surface text-state-warning-ink" },
  approved: { ar: "معتمد", en: "Approved", color: "bg-state-success-surface text-state-success-ink" },
  published: { ar: "منشور", en: "Published", color: "bg-state-success-surface text-state-success-ink" },
  superseded: { ar: "مُستبدل", en: "Superseded", color: "bg-state-neutral-surface text-state-neutral-ink" },
  archived: { ar: "مؤرشف", en: "Archived", color: "bg-state-neutral-surface text-state-neutral-ink" },
};

export const AMENDMENT_STATUS = {
  draft: { ar: "مسودة", en: "Draft" },
  ai_processing: { ar: "معالجة آلية", en: "AI Processing" },
  secretary_review: { ar: "مراجعة الأمين", en: "Secretary Review" },
  governance_review: { ar: "مراجعة الحوكمة", en: "Governance Review" },
  legal_review: { ar: "مراجعة قانونية", en: "Legal Review" },
  returned: { ar: "أُعيد للتعديل", en: "Returned" },
  pending_approval: { ar: "بانتظار الاعتماد", en: "Pending Approval" },
  approved: { ar: "معتمد", en: "Approved" },
  scheduled: { ar: "مجدول", en: "Scheduled" },
  effective: { ar: "نافذ", en: "Effective" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  cancelled: { ar: "ملغى", en: "Cancelled" },
  superseded: { ar: "ملغى بقرار لاحق", en: "Superseded" },
};

export const DELEGATION_STATUS = {
  active: { ar: "سارية", en: "Active", color: S.success },
  expired: { ar: "منتهية", en: "Expired", color: S.neutral },
  revoked: { ar: "ملغاة", en: "Revoked", color: S.danger },
  completed: { ar: "مكتملة", en: "Completed", color: S.neutral },
};

export const CIRCULATION_ROUND_STATE = {
  draft: { ar: "مسودة", en: "Draft", color: S.neutral },
  dispatched: { ar: "مُرسلة", en: "Dispatched", color: S.info },
  collecting: { ar: "جمع الردود", en: "Collecting", color: S.progress },
  ready: { ar: "جاهزة", en: "Ready", color: S.warning },
  approved: { ar: "معتمدة", en: "Approved", color: S.success },
  rejected: { ar: "مرفوضة", en: "Rejected", color: S.danger },
  not_carried: { ar: "لم تتحقق", en: "Not Carried", color: S.danger },
  expired: { ar: "منتهية", en: "Expired", color: S.neutral },
  withdrawn: { ar: "مسحوبة", en: "Withdrawn", color: S.neutral },
  cancelled: { ar: "ملغاة", en: "Cancelled", color: S.danger },
  superseded: { ar: "مُستبدلة", en: "Superseded", color: S.neutral },
};

export const CIRCULATION_RULE = {
  unanimous: { ar: "إجماع", en: "Unanimous", color: S.ceremonial },
  simple_majority_of_eligible: { ar: "أغلبية المؤهلين", en: "Simple majority of eligible", color: S.info },
  two_thirds_of_eligible: { ar: "ثلثا المؤهلين", en: "Two-thirds of eligible", color: S.ceremonial },
  majority_of_responses: { ar: "أغلبية الردود", en: "Majority of responses", color: S.info },
};

export const CIRCULATION_DISPATCH_STATE = {
  queued: { ar: "في الانتظار", en: "Queued", color: S.warning },
  dispatched: { ar: "مُرسلة", en: "Dispatched", color: S.info },
  failed: { ar: "فشل الإرسال", en: "Failed", color: S.danger },
};

export const CIRCULATION_RESPONSE = {
  pending: { ar: "بانتظار", en: "Pending", color: S.warning },
  approve: { ar: "موافقة", en: "Approve", color: S.success },
  reject: { ar: "رفض", en: "Reject", color: S.danger },
  abstain: { ar: "امتناع", en: "Abstain", color: S.neutral },
  recuse: { ar: "تنحٍّ", en: "Recuse", color: S.ceremonial },
};

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const locale = getActiveLang() === "ar" ? "ar-QA" : "en-GB";
    return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ── Single-language guarantee ────────────────────────────────────────────────
// Every bilingual label entry resolves to the ACTIVE language when it is read, so
// no surface can render the other language's label. Arabic pages → Arabic labels,
// English pages → English labels. The language comes from the ONE language engine
// (never from the DOM), and `t(MAP[k]?.ar, MAP[k]?.en)` keeps working unchanged.
const BILINGUAL_LABEL_MAPS = [
  COMMITTEE_TYPES, COMMITTEE_STATUS, MEETING_STATUS, DECISION_STATUS, ACTION_STATUS,
  PRIORITY, READINESS, AGENDA_ITEM_STATUS, ESCALATION_LEVEL, CLASSIFICATION,
  MINUTES_STATUS, ATTENDANCE_STATUS, MEMBER_ROLE, AUTHORITY_LEVELS,
  DEPENDENCY_TYPE, DEPENDENCY_STATUS, SCENARIO_TYPE, SCENARIO_STATUS,
  AI_OUTPUT_TYPE, AI_OUTPUT_STATUS, WORKSTREAM_STATUS, WORKSTREAM_ROLE, FIRST_MEETING_STATUS,
  INITIATIVE_STATUS,
  DELEGATION_STATUS, CIRCULATION_ROUND_STATE, CIRCULATION_RULE,
  CIRCULATION_DISPATCH_STATE, CIRCULATION_RESPONSE, AMENDMENT_STATUS,
];

function bindEntryToActiveLanguage(entry) {
  if (!entry || typeof entry !== "object") return;
  const ar = entry.ar;
  const en = entry.en ?? ar;
  if (ar === undefined && en === undefined) return;
  const read = () => (getActiveLang() === "ar" ? ar ?? en : en ?? ar);
  delete entry.ar;
  delete entry.en;
  Object.defineProperty(entry, "ar", { get: read, enumerable: true, configurable: true });
  Object.defineProperty(entry, "en", { get: read, enumerable: true, configurable: true });
}

BILINGUAL_LABEL_MAPS.forEach((map) => Object.values(map || {}).forEach(bindEntryToActiveLanguage));

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}