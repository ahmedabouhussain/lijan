import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpRight, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

// The escalation chain is authoritative on the server; the interface mirrors it only to
// show which authority receives the action before the user commits to it.
const CHAIN = ["none", "reminder", "priority_reminder", "owner_secretary", "chair", "escalation_authority"];

const LEVEL_LABEL = {
  reminder: { ar: "تذكير", en: "Reminder" },
  priority_reminder: { ar: "تذكير أولوية", en: "Priority Reminder" },
  owner_secretary: { ar: "أمين السر", en: "Owner Secretary" },
  chair: { ar: "الرئيس", en: "Chair" },
  escalation_authority: { ar: "جهة التصعيد", en: "Escalation Authority" },
};

/**
 * In-row escalation control. The server decides the receiving authority and enforces the
 * permission; this component collects the required reason, blocks repeat submission while
 * a request is in flight, and reports the confirmed outcome the server returned.
 */
export default function EscalationAction({ action, busy, onEscalate }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState("");

  const currentIndex = Math.max(CHAIN.indexOf(action.escalation_level || "none"), 0);
  const nextLevel = CHAIN[Math.min(currentIndex + 1, CHAIN.length - 1)];
  const next = LEVEL_LABEL[nextLevel] || LEVEL_LABEL.reminder;

  if (nextLevel === CHAIN[currentIndex]) {
    return (
      <span className="text-xs text-muted-foreground">
        {t("بلغ أعلى مستوى تصعيد", "Already at the highest escalation level")}
      </span>
    );
  }

  const submit = async () => {
    setFailure("");
    if (!note.trim()) {
      setFailure(t("سبب التصعيد مطلوب", "An escalation reason is required"));
      return;
    }
    try {
      const level = await onEscalate(action.id, note.trim());
      setResult(LEVEL_LABEL[level] || next);
      setNote("");
      setOpen(false);
    } catch (error) {
      setFailure(
        error?.response?.data?.error || error?.message || t("تعذّر التصعيد", "The escalation could not be completed")
      );
    }
  };

  if (result) {
    return (
      <div className="flex items-center gap-2 text-xs text-state-success-ink">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{t(`تم التصعيد إلى ${result.ar}`, `Escalated to ${result.en}`)}</span>
        <button type="button" onClick={() => setResult(null)} className="underline">
          {t("تصعيد مرة أخرى", "Escalate again")}
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setOpen(true)} className="min-h-[36px]">
        <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        {t(`تصعيد إلى ${next.ar}`, `Escalate to ${next.en}`)}
      </Button>
    );
  }

  return (
    <div className="space-y-2 border border-border rounded-md p-3 bg-secondary/30">
      <p className="text-xs text-muted-foreground">
        {t("الجهة المستلمة", "Receiving authority")}:{" "}
        <strong className="text-foreground">{t(next.ar, next.en)}</strong>
      </p>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        aria-label={t("سبب التصعيد", "Escalation reason")}
        placeholder={t("سبب التصعيد (مطلوب)", "Escalation reason (required)")}
      />
      {failure && (
        <div role="alert" className="text-xs text-destructive flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{failure}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={submit} disabled={busy} aria-busy={busy} className="min-h-[36px]">
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          {t("تأكيد التصعيد", "Confirm Escalation")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setFailure("");
          }}
          className="min-h-[36px]"
        >
          {t("إلغاء", "Cancel")}
        </Button>
      </div>
    </div>
  );
}