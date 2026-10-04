// AuditEvent action labels — the event log says what happened, in the interface language.
// The stored value is a state key; a raw key is never shown to a reader.
export const AUDIT_ACTIONS = {
  create: { ar: "إنشاء", en: "Created" },
  update: { ar: "تحديث", en: "Updated" },
  delete: { ar: "حذف", en: "Deleted" },
  status_change: { ar: "تغيير حالة", en: "Status changed" },
  login: { ar: "دخول", en: "Signed in" },
  logout: { ar: "خروج", en: "Signed out" },
  vote: { ar: "تصويت", en: "Voted" },
  approve: { ar: "اعتماد", en: "Approved" },
  reject: { ar: "رفض", en: "Rejected" },
  sign: { ar: "توقيع", en: "Signed" },
  issue: { ar: "إصدار", en: "Issued" },
  escalate: { ar: "تصعيد", en: "Escalated" },
  close: { ar: "إغلاق", en: "Closed" },
  activate: { ar: "تفعيل", en: "Activated" },
  provision: { ar: "تهيئة", en: "Provisioned" },
  suspend: { ar: "تعليق", en: "Suspended" },
  deny_access: { ar: "رفض وصول", en: "Access denied" },
  demo_explore: { ar: "بدء استكشاف", en: "Exploration started" },
  ai_query: { ar: "استعلام", en: "AI query" },
};

export function auditActionLabel(action, lang) {
  const entry = AUDIT_ACTIONS[action];
  if (!entry) return action || "";
  return lang === "ar" ? entry.ar : entry.en;
}