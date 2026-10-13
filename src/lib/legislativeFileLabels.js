// legislativeFileLabels.ts — Bilingual labels for the legislative file surfaces.
// One vocabulary, shared by the list and the detail page, so the two never disagree.

export const CLASSIFICATION_LABELS = {
  bill: { ar: "مشروع قانون", en: "Bill" },
  proposed_law: { ar: "اقتراح قانون", en: "Proposed Law" },
  discussion_request: { ar: "طلب مناقشة", en: "Discussion Request" },
  wish_proposal: { ar: "مقترح برغبة", en: "Wish Proposal" },
  oversight_matter: { ar: "موضوع رقابي", en: "Oversight Matter" },
  treaty: { ar: "اتفاقية أو معاهدة", en: "Treaty" },
  budget_report: { ar: "موازنة أو تقرير مالي", en: "Budget / Financial Report" },
  other: { ar: "إحالة أخرى", en: "Other Referral" },
};

export const DELIVERY_STATUS_LABELS = {
  not_delivered: { ar: "لم يُسلَّم", en: "Not Delivered" },
  delivered: { ar: "سُلِّم", en: "Delivered" },
  delivery_confirmed: { ar: "تأكيد الاستلام", en: "Delivery Confirmed" },
};

export const REPORT_STAGE_LABELS = {
  not_started: { ar: "لم يبدأ", en: "Not Started" },
  draft: { ar: "مسودة", en: "Draft" },
  under_review: { ar: "قيد المراجعة", en: "Under Review" },
  amendments_required: { ar: "تعديلات مطلوبة", en: "Amendments Required" },
  resubmitted: { ar: "معاد التقديم", en: "Resubmitted" },
  approved: { ar: "معتمد", en: "Approved" },
  issued: { ar: "صادر", en: "Issued" },
  amended_new_version: { ar: "معدل بإصدار جديد", en: "Amended (New Version)" },
  archived: { ar: "مؤرشف", en: "Archived" },
};

export const INTEGRATION_POSTURE_LABELS = {
  connected: { ar: "متصل", en: "Connected" },
  configured_not_connected: { ar: "مُهيّأ — غير متصل", en: "Configured — Not Connected" },
  awaiting_technical_integration: { ar: "بانتظار التكامل التقني", en: "Awaiting Technical Integration" },
  manual_governed_handoff: { ar: "تسليم محكوم يدوي", en: "Manual Governed Handoff" },
  integration_unavailable: { ar: "التكامل غير متاح", en: "Integration Unavailable" },
};