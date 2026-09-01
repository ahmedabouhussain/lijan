// RAQEEM shared utilities — bilingual labels, status maps, helpers

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
  draft: { ar: "مسودة", en: "Draft", color: "text-muted-foreground bg-secondary" },
  pending_activation: { ar: "بانتظار التفعيل", en: "Pending Activation", color: "text-amber-700 bg-amber-50" },
  active: { ar: "نشطة", en: "Active", color: "text-emerald-700 bg-emerald-50" },
  closing: { ar: "قيد الإغلاق", en: "Closing", color: "text-amber-700 bg-amber-50" },
  closed: { ar: "مغلقة", en: "Closed", color: "text-muted-foreground bg-secondary" },
  archived: { ar: "مؤرشفة", en: "Archived", color: "text-muted-foreground bg-secondary" },
};

export const MEETING_STATUS = {
  scheduled: { ar: "مجدول", en: "Scheduled", color: "text-blue-700 bg-blue-50" },
  in_progress: { ar: "جارٍ", en: "In Progress", color: "text-emerald-700 bg-emerald-50" },
  adjourned: { ar: "مؤجلة", en: "Adjourned", color: "text-amber-700 bg-amber-50" },
  completed: { ar: "مكتملة", en: "Completed", color: "text-muted-foreground bg-secondary" },
  cancelled: { ar: "ملغاة", en: "Cancelled", color: "text-destructive bg-red-50" },
};

export const DECISION_STATUS = {
  draft: { ar: "مسودة", en: "Draft", color: "text-muted-foreground bg-secondary" },
  in_review: { ar: "قيد المراجعة", en: "In Review", color: "text-blue-700 bg-blue-50" },
  proposed: { ar: "مقترح", en: "Proposed", color: "text-amber-700 bg-amber-50" },
  voting: { ar: "قيد التصويت", en: "Voting", color: "text-purple-700 bg-purple-50" },
  approved: { ar: "معتمد", en: "Approved", color: "text-emerald-700 bg-emerald-50" },
  rejected: { ar: "مرفوض", en: "Rejected", color: "text-destructive bg-red-50" },
  deferred: { ar: "مؤجل", en: "Deferred", color: "text-amber-700 bg-amber-50" },
  issued: { ar: "صادر", en: "Issued", color: "text-primary bg-primary/10" },
  executing: { ar: "قيد التنفيذ", en: "Executing", color: "text-blue-700 bg-blue-50" },
  completed: { ar: "مكتمل", en: "Completed", color: "text-emerald-700 bg-emerald-50" },
  superseded: { ar: "ملغى بقرار لاحق", en: "Superseded", color: "text-muted-foreground bg-secondary" },
  closed: { ar: "مغلق", en: "Closed", color: "text-muted-foreground bg-secondary" },
};

export const ACTION_STATUS = {
  assigned: { ar: "مُسند", en: "Assigned", color: "text-blue-700 bg-blue-50" },
  in_progress: { ar: "قيد التنفيذ", en: "In Progress", color: "text-amber-700 bg-amber-50" },
  blocked: { ar: "متعثر", en: "Blocked", color: "text-destructive bg-red-50" },
  evidence_pending: { ar: "بانتظار الأدلة", en: "Evidence Pending", color: "text-amber-700 bg-amber-50" },
  under_review: { ar: "قيد المراجعة", en: "Under Review", color: "text-purple-700 bg-purple-50" },
  verified: { ar: "تم التحقق", en: "Verified", color: "text-emerald-700 bg-emerald-50" },
  closed: { ar: "مغلق", en: "Closed", color: "text-muted-foreground bg-secondary" },
  overdue: { ar: "متأخر", en: "Overdue", color: "text-destructive bg-red-50" },
};

export const PRIORITY = {
  low: { ar: "منخفضة", en: "Low", color: "text-muted-foreground" },
  medium: { ar: "متوسطة", en: "Medium", color: "text-blue-700" },
  high: { ar: "عالية", en: "High", color: "text-amber-700" },
  critical: { ar: "حرجة", en: "Critical", color: "text-destructive" },
};

export const READINESS = {
  ready: { ar: "جاهز", en: "Ready", color: "text-emerald-700 bg-emerald-50" },
  needs_attention: { ar: "يحتاج انتباه", en: "Needs Attention", color: "text-amber-700 bg-amber-50" },
  not_ready: { ar: "غير جاهز", en: "Not Ready", color: "text-destructive bg-red-50" },
};

export const CLASSIFICATION = {
  public: { ar: "عام", en: "Public" },
  internal: { ar: "داخلي", en: "Internal" },
  confidential: { ar: "سري", en: "Confidential" },
  restricted: { ar: "مقيد", en: "Restricted" },
  highly_restricted: { ar: "سري للغاية", en: "Highly Restricted" },
};

export const MEMBER_ROLE = {
  chair: { ar: "الرئيس", en: "Chair" },
  vice_chair: { ar: "نائب الرئيس", en: "Vice Chair" },
  secretary: { ar: "الأمين", en: "Secretary" },
  member: { ar: "عضو", en: "Member" },
  observer: { ar: "مراقب", en: "Observer" },
  advisor: { ar: "مستشار", en: "Advisor" },
};

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date() && new Date(dateStr).toDateString() !== new Date().toDateString();
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}