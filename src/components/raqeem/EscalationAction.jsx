import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUpRight, Loader2, CheckCircle2, AlertTriangle, Users } from "lucide-react";

// The escalation chain and the receiving authority are decided on the server; this
// component asks the server who will receive the action, shows that answer before the
// user commits, sends one request per confirmation (with a stable key so a retry is
// not a second escalation), and reports the confirmed outcome the server returned.
const CHAIN = ["none", "reminder", "priority_reminder", "owner_secretary", "chair", "escalation_authority"];

const LEVEL_LABEL = {
  reminder: { ar: "تذكير", en: "Reminder" },
  priority_reminder: { ar: "تذكير أولوية", en: "Priority Reminder" },
  owner_secretary: { ar: "أمين السر", en: "Owner Secretary" },
  chair: { ar: "الرئيس", en: "Chair" },
  escalation_authority: { ar: "جهة التصعيد", en: "Escalation Authority" },
};

const ROLE_LABEL = {
  chair: { ar: "الرئيس", en: "Chair" },
  secretary: { ar: "أمين السر", en: "Secretary" },
  owner: { ar: "الجهة المالكة للإجراء", en: "Action owner" },
  escalation_authority: { ar: "جهة التصعيد", en: "Escalation authority" },
};

export default function EscalationAction({ action, busy, onEscalate }) {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState("");
  const [key, setKey] = useState("");

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

  // Ask the server who receives the action, so the user sees the real authority first.
  const openDialog = async () => {
    setOpen(true);
    setFailure("");
    setPreview(null);
    setPreviewing(true);
    // One stable key per confirmation: a retry of the same request is not a new escalation.
    setKey(`${action.id}:${nextLevel}:${Date.now().toString(36)}`);
    try {
      const res = await base44.functions.invoke("ProcessEscalation", { action_id: action.id, preview: true });
      const data = res?.data || res || {};
      if (data.status === "preview") setPreview(data);
      else if (data.message) setFailure(lang === "ar" ? data.message.ar : data.message.en);
      else setFailure(t("تعذّر تحديد الجهة المستلمة", "The receiving authority could not be resolved"));
    } catch (e) {
      setFailure(
        e?.response?.data?.message?.[lang] ||
        e?.response?.data?.error ||
        t("تعذّر تحديد الجهة المستلمة", "The receiving authority could not be resolved")
      );
    }
    setPreviewing(false);
  };

  const submit = async () => {
    setFailure("");
    if (!note.trim()) {
      setFailure(t("سبب التصعيد مطلوب", "An escalation reason is required"));
      return;
    }
    try {
      const outcome = await onEscalate(action.id, note.trim(), key);
      setResult(outcome || { level: next, recipients: preview?.recipients || [], notified: 0 });
      setNote("");
      setOpen(false);
    } catch (error) {
      const data = error?.response?.data || {};
      setFailure(
        data.message?.[lang] ||
        data.error ||
        error?.message ||
        t("تعذّر التصعيد", "The escalation could not be completed")
      );
      // A conflict means the record moved on; reload it before another attempt.
      if (data.status === "conflict") setKey(`${action.id}:${nextLevel}:${Date.now().toString(36)}`);
    }
  };

  if (result) {
    const levelLabel = LEVEL_LABEL[result.level] || result.level || next;
    return (
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2 text-state-success-ink">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>{t(`تم التصعيد إلى ${levelLabel.ar}`, `Escalated to ${levelLabel.en}`)}</span>
          <button type="button" onClick={() => setResult(null)} className="underline">
            {t("تصعيد مرة أخرى", "Escalate again")}
          </button>
        </div>
        <p className="text-muted-foreground">
          {result.notified > 0
            ? t(`أُشعر: ${(result.notified_names || []).join("، ")}`, `Notified: ${(result.notified_names || []).join(", ")}`)
            : t(
                "لم يُرسل إشعار: لا يوجد مستلم صالح لهذا المستوى",
                "No notice was sent: no valid recipient exists for this level"
              )}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" disabled={busy} onClick={openDialog} className="min-h-[36px]">
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

      {previewing && (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5" role="status" aria-busy="true">
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          {t("جارٍ تحديد المستلمين...", "Resolving recipients...")}
        </p>
      )}

      {preview?.recipients?.length > 0 && (
        <div className="text-xs text-foreground space-y-0.5">
          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
            <Users className="w-3.5 h-3.5" aria-hidden="true" />
            {t("سيُشعر:", "Will be notified:")}
          </span>
          <ul className="ms-5 list-disc">
            {preview.recipients.map((r, i) => (
              <li key={`${r.name}-${i}`}>
                {r.name || "—"}
                {" — "}
                {t(ROLE_LABEL[r.role]?.ar || r.role, ROLE_LABEL[r.role]?.en || r.role)}
                {r.entity ? ` · ${r.entity}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

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
        <Button
          size="sm"
          onClick={submit}
          disabled={busy || previewing || !note.trim() || !preview?.recipients?.length}
          aria-busy={busy}
          className="min-h-[36px]"
        >
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
            setPreview(null);
          }}
          className="min-h-[36px]"
        >
          {t("إلغاء", "Cancel")}
        </Button>
      </div>
    </div>
  );
}