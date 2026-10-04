import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Info, Loader2, RotateCw, Users } from "lucide-react";
import {
  noticeStateLabel,
  noticeStateTone,
  deliveryStatusLabel,
  failureReasonLabel,
} from "@/lib/noticeStates";

/**
 * Reports the notice outcome of an escalation exactly as the server measured it, and offers
 * an authorized user a governed retry.
 *
 * The escalation and its notice are two separate facts: this component never claims a
 * notification was delivered, never hides a failure, and never shows a raw state key.
 * Retrying re-attempts delivery of the same transition — it never moves the escalation.
 */
export default function NoticeDeliveryStatus({ outcome, actionId, onRetried }) {
  const { t, lang } = useLanguage();
  const [retrying, setRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState(null);
  const [failure, setFailure] = useState("");

  const current = retryResult || outcome || {};
  const state = current.notice_state || "not_required";
  const rows = current.delivery || [];

  const retry = async () => {
    setRetrying(true);
    setFailure("");
    try {
      const res = await base44.functions.invoke("RetryEscalationNotice", {
        action_id: actionId,
        idempotency_key: `${actionId}:retry:${Date.now().toString(36)}`,
      });
      const data = res?.data || res || {};
      if (data.error) {
        setFailure(data.message?.[lang] || data.error);
      } else {
        setRetryResult(data);
        onRetried?.(data);
      }
    } catch (error) {
      const data = error?.response?.data || {};
      setFailure(
        data.message?.[lang] ||
        data.error ||
        t("تعذّرت إعادة محاولة الإرسال", "The delivery retry could not be completed")
      );
    }
    setRetrying(false);
  };

  return (
    <div className="space-y-1.5">
      <p className={`inline-flex items-center gap-1.5 ${noticeStateTone(state)}`}>
        {state === "delivered" ? (
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        ) : state === "failed" ? (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        )}
        <span>{t("الإشعار", "Notice")}: {noticeStateLabel(state, t)}</span>
      </p>

      {rows.length > 0 && (
        <ul className="space-y-0.5 text-muted-foreground">
          {rows.map((row, i) => (
            <li key={`${row.outbox_id || row.name || "recipient"}-${i}`} className="flex items-start gap-1.5">
              <Users className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {row.name || "—"}
                {" — "}
                {deliveryStatusLabel(row.status, t)}
                {row.attempt_count > 0
                  ? ` · ${t(`المحاولات: ${row.attempt_count}`, `Attempts: ${row.attempt_count}`)}`
                  : ""}
                {row.failure_reason ? ` · ${failureReasonLabel(row.failure_reason, t)}` : ""}
                {row.next_retry_at
                  ? ` · ${t(
                      `إعادة المحاولة التالية: ${new Date(row.next_retry_at).toLocaleString("ar")}`,
                      `Next retry: ${new Date(row.next_retry_at).toLocaleString("en")}`
                    )}`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      )}

      {failure && (
        <p role="alert" className="text-destructive flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{failure}</span>
        </p>
      )}

      {current.retry_available && (
        <Button
          size="sm"
          variant="outline"
          className="min-h-[32px]"
          onClick={retry}
          disabled={retrying}
          aria-busy={retrying}
        >
          {retrying ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {t("إعادة محاولة الإرسال", "Retry delivery")}
        </Button>
      )}
    </div>
  );
}