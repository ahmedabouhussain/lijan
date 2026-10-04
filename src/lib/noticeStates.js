// One vocabulary for notice delivery, shared by every interface surface.
// Mirrors the backend states in base44/shared/notificationEngine.ts — a raw state key
// (`failed`, `queued`, …) must never reach the screen.

export const NOTICE_STATE_LABEL = {
  not_required: { ar: "لا حاجة لتبليغ", en: "No notice required" },
  no_recipient: { ar: "لا يوجد مستلم مؤهل", en: "No eligible recipient" },
  queued: { ar: "الإشعار في قائمة الإرسال", en: "Notice queued" },
  dispatching: { ar: "جارٍ الإرسال", en: "Sending" },
  delivered: { ar: "تم التبليغ", en: "Delivered" },
  partially_delivered: { ar: "تم تبليغ بعض المستلمين", en: "Partially delivered" },
  failed: { ar: "تعذّر التبليغ", en: "Delivery failed" },
  retry_scheduled: { ar: "أُعيد جدولة الإرسال", en: "Retry scheduled" },
  // Legacy records written before delivery truth was tracked — reported as unverified.
  none: { ar: "لم يُطلب تبليغ", en: "No notice requested" },
  notified: { ar: "سجل تبليغ قديم (غير مُتحقق منه)", en: "Legacy notice record (unverified)" },
};

export const DELIVERY_STATUS_LABEL = {
  queued: { ar: "في قائمة الإرسال", en: "Queued" },
  dispatching: { ar: "جارٍ الإرسال", en: "Sending" },
  delivered: { ar: "تم التسليم", en: "Delivered" },
  failed: { ar: "فشل الإرسال", en: "Failed" },
  retry_scheduled: { ar: "بانتظار إعادة المحاولة", en: "Retry scheduled" },
  not_required: { ar: "غير مطلوب", en: "Not required" },
  sent: { ar: "سجل إرسال قديم", en: "Legacy send record" },
  suppressed: { ar: "موقوف بحسب التفضيلات", en: "Suppressed by preference" },
  read: { ar: "مقروء", en: "Read" },
};

/** Tone for a notice state — semantic tokens only, never a raw colour scale. */
export const NOTICE_STATE_TONE = {
  delivered: "text-state-success-ink",
  partially_delivered: "text-state-warning-ink",
  retry_scheduled: "text-state-warning-ink",
  queued: "text-state-info-ink",
  dispatching: "text-state-info-ink",
  failed: "text-state-danger-ink",
  no_recipient: "text-state-warning-ink",
  not_required: "text-muted-foreground",
  none: "text-muted-foreground",
  notified: "text-muted-foreground",
};

/** Known delivery failure keys, labelled for the reader instead of shown as a code. */
export const FAILURE_REASON_LABEL = {
  no_recipient_address: { ar: "لا يوجد بريد مسجّل لهذا المستلم", en: "The recipient has no recorded address" },
  recipient_preference: { ar: "المستلم أوقف هذا النوع من الإشعارات", en: "The recipient disabled this notice type" },
  dispatch_failed: { ar: "تعذّر بدء الإرسال", en: "The delivery could not be started" },
};

/** Badge surface for a notice state — semantic tokens only. */
export const NOTICE_STATE_BADGE = {
  delivered: "bg-state-success-surface text-state-success-ink",
  partially_delivered: "bg-state-warning-surface text-state-warning-ink",
  retry_scheduled: "bg-state-warning-surface text-state-warning-ink",
  queued: "bg-state-info-surface text-state-info-ink",
  dispatching: "bg-state-info-surface text-state-info-ink",
  failed: "bg-state-danger-surface text-state-danger-ink",
  no_recipient: "bg-state-warning-surface text-state-warning-ink",
  not_required: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
  notified: "bg-muted text-muted-foreground",
};

export function noticeStateBadgeClass(state) {
  return NOTICE_STATE_BADGE[state] || "bg-muted text-muted-foreground";
}

export function noticeStateLabel(state, t) {
  const entry = NOTICE_STATE_LABEL[state];
  if (!entry) return t("حالة تبليغ غير معروفة", "Unknown notice state");
  return t(entry.ar, entry.en);
}

export function noticeStateTone(state) {
  return NOTICE_STATE_TONE[state] || "text-muted-foreground";
}

export function deliveryStatusLabel(status, t) {
  const entry = DELIVERY_STATUS_LABEL[status];
  if (!entry) return t("حالة غير معروفة", "Unknown status");
  return t(entry.ar, entry.en);
}

export function failureReasonLabel(reason, t) {
  if (!reason) return "";
  const entry = FAILURE_REASON_LABEL[reason];
  if (entry) return t(entry.ar, entry.en);
  if (reason.startsWith("channel_not_configured")) return t("القناة غير مهيأة للإرسال", "The channel is not configured for sending");
  // A provider's own technical message is shown as detail, never as the state itself.
  return t(`تفصيل تقني: ${reason}`, `Technical detail: ${reason}`);
}