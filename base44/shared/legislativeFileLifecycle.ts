// legislativeFileLifecycle.ts — Stage machine for the legislative file through-line.
// One implementation of the journey order, shared by Open/Get/Transition so the three
// functions never disagree on what comes next. A transition may skip stages the institution
// does not require (e.g. a file with no hearing), but it may never go backwards silently —
// a return to an earlier stage is a different act recorded in stage_history.

export const STAGE_ORDER = [
  'referral_received',
  'completeness_check',
  'assigned_to_committee',
  'study_underway',
  'documents_requested',
  'on_agenda',
  'under_discussion',
  'hearing_held',
  'amendments_recorded',
  'comparison_table_built',
  'report_draft',
  'report_review',
  'report_chair_review',
  'voting',
  'report_approved',
  'delivered',
  'delivery_confirmed',
  'follow_up',
  'closed',
] as const;

export type Stage = (typeof STAGE_ORDER)[number];

export const STAGE_LABELS_AR: Record<string, string> = {
  referral_received: 'استلام الإحالة',
  completeness_check: 'التحقق من اكتمال الملف',
  assigned_to_committee: 'الإسناد إلى اللجنة',
  study_underway: 'الدراسة جارية',
  documents_requested: 'طلب الدراسات والمذكرات',
  on_agenda: 'الإدراج على جدول الأعمال',
  under_discussion: 'المناقشة',
  hearing_held: 'عقد جلسة استماع',
  amendments_recorded: 'تسجيل التعديلات',
  comparison_table_built: 'إنتاج جدول المقارنة',
  report_draft: 'إعداد مسودة التقرير',
  report_review: 'مراجعة الشؤون التشريعية',
  report_chair_review: 'عرض التقرير على رئيس اللجنة',
  voting: 'التصويت',
  report_approved: 'اعتماد التقرير',
  delivered: 'تسليم المخرج',
  delivery_confirmed: 'إثبات الاستلام',
  follow_up: 'متابعة ما ترتب على التقرير',
  closed: 'إغلاق الملف',
};

export const STAGE_LABELS_EN: Record<string, string> = {
  referral_received: 'Referral Received',
  completeness_check: 'Completeness Check',
  assigned_to_committee: 'Assigned to Committee',
  study_underway: 'Study Underway',
  documents_requested: 'Documents Requested',
  on_agenda: 'On Agenda',
  under_discussion: 'Under Discussion',
  hearing_held: 'Hearing Held',
  amendments_recorded: 'Amendments Recorded',
  comparison_table_built: 'Comparison Table Built',
  report_draft: 'Report Draft',
  report_review: 'Legislative Review',
  report_chair_review: 'Chair Review',
  voting: 'Voting',
  report_approved: 'Report Approved',
  delivered: 'Delivered',
  delivery_confirmed: 'Delivery Confirmed',
  follow_up: 'Follow-up',
  closed: 'Closed',
};

export function stageIndex(stage: string): number {
  return STAGE_ORDER.indexOf(stage as Stage);
}

export function isForwardTransition(from: string, to: string): boolean {
  return stageIndex(to) > stageIndex(from);
}

export function nextStageOf(stage: string): string | null {
  const i = stageIndex(stage);
  if (i < 0 || i >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[i + 1];
}

/**
 * Generate a stable reference number for a legislative file.
 * Format: LEG-{YYYY}-{sequence} — never reused, assigned on receipt.
 */
export function buildReferenceNumber(seq: number, now = new Date()): string {
  const year = now.getUTCFullYear();
  return `LEG-${year}-${String(seq).padStart(4, '0')}`;
}

// ── Report lifecycle ──
// The report's own lifecycle is distinct from the file's journey stage. A report may be
// returned for amendments and resubmitted; the forward map encodes the allowed next stages so
// the editor never offers an illegal move.

export const REPORT_STAGE_ORDER = [
  'not_started', 'draft', 'under_review', 'amendments_required',
  'resubmitted', 'approved', 'issued', 'amended_new_version', 'archived',
] as const;

export const REPORT_STAGE_LABELS_AR: Record<string, string> = {
  not_started: 'لم يبدأ',
  draft: 'مسودة',
  under_review: 'قيد المراجعة',
  amendments_required: 'تعديلات مطلوبة',
  resubmitted: 'معاد التقديم',
  approved: 'معتمد',
  issued: 'صادر',
  amended_new_version: 'معدل بإصدار جديد',
  archived: 'مؤرشف',
};

export const REPORT_STAGE_LABELS_EN: Record<string, string> = {
  not_started: 'Not Started',
  draft: 'Draft',
  under_review: 'Under Review',
  amendments_required: 'Amendments Required',
  resubmitted: 'Resubmitted',
  approved: 'Approved',
  issued: 'Issued',
  amended_new_version: 'Amended (New Version)',
  archived: 'Archived',
};

// Forward-allowed transitions: a report may never move backwards silently; a return for
// amendments is a forward move into amendments_required, then resubmitted, then back to
// under_review — each a distinct, audited act.
export const REPORT_STAGE_FORWARD: Record<string, string[]> = {
  not_started: ['draft'],
  draft: ['under_review'],
  under_review: ['approved', 'amendments_required'],
  amendments_required: ['resubmitted'],
  resubmitted: ['under_review'],
  approved: ['issued'],
  issued: ['amended_new_version', 'archived'],
  amended_new_version: ['issued', 'archived'],
  archived: [],
};

export function canTransitionReportStage(from: string, to: string): boolean {
  const allowed = REPORT_STAGE_FORWARD[from] || [];
  return allowed.includes(to);
}

export function nextReportStagesOf(stage: string): string[] {
  return REPORT_STAGE_FORWARD[stage] || [];
}