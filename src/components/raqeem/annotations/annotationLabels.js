// Bilingual wording for the notes panel (annotation-continuity-1.0.0). One place, so the row, the
// change strip and the panel never describe the same state in two different ways.

export const CHANGE_LABEL = {
  changed: ["تغيّر الملف (البصمة مختلفة)", "File changed (fingerprint differs)"],
  identical: ["مطابق للإصدار السابق", "Identical to the previous version"],
  unknown: ["لا تتوفر بصمة للمقارنة", "No fingerprint available to compare"],
};

export const REANCHOR_LABEL = {
  identical_content: ["نُقلت إلى محتوى مطابق", "Carried to identical content"],
  unverified: ["نُقلت — موضع الاقتباس غير مُتحقَّق، راجعه", "Carried — anchor not verified, check the passage"],
};

export function continuityLabel(t, c) {
  if (!c) return "";
  if (c.state === "current") return t("على الإصدار النافذ", "On the version in force");
  if (c.state === "version_unavailable") return t("تعذّرت قراءة إصدارها — لم تُنقل", "Its version cannot be read — not moved");
  if (c.state === "unbound_legacy") return t("ملاحظة قديمة غير مرتبطة بإصدار", "Legacy note not bound to a version");
  const change = CHANGE_LABEL[c.change?.state] || CHANGE_LABEL.unknown;
  return t(
    `كُتبت على الإصدار ${c.on_version} · النافذ الآن ${c.current_version ?? "—"} · ${change[0]}`,
    `Written on version ${c.on_version} · in force now ${c.current_version ?? "—"} · ${change[1]}`
  );
}

export function serverError(t, e, fallback) {
  const d = e?.response?.data || {};
  if (d.error_ar || d.error) return t(d.error_ar || d.error, d.error || d.error_ar);
  return fallback;
}