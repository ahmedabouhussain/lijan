import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { ShieldCheck, Loader2, AlertTriangle, Check, Info } from "lucide-react";

// CommitteeActivationPanel — the surface of the committee's first governed transition (draft → active).
//
// The readiness gate AND the authority decision both live on the server (`ActivateCommittee` →
// `committee.activate`), so this panel never decides that a committee is ready, and it never reports a
// success the server did not return. A refusal is shown with its own code and with the items the gate
// found missing, so the reader knows exactly what to complete instead of guessing.
const GATE_LABELS = {
  mandate: ["السند النظامي", "Instrument / mandate"],
  "chair assignment": ["تعيين الرئيس", "Chair assignment"],
  "secretary assignment": ["تعيين أمين السر", "Secretary assignment"],
  "quorum rule": ["قاعدة النصاب", "Quorum rule"],
  "voting rule": ["قاعدة التصويت", "Voting rule"],
  "valid term dates": ["مدة سارية (بداية ونهاية)", "Valid term dates"],
  classification: ["التصنيف", "Classification"],
};

export default function CommitteeActivationPanel({ committee, onActivated }) {
  const { t, lang } = useLanguage();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  if (!committee || !["draft", "pending_activation"].includes(committee.status)) return null;

  const run = async () => {
    setBusy(true);
    setOutcome(null);
    try {
      const res = await base44.functions.invoke("ActivateCommittee", {
        committee_id: committee.id,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      const d = res?.data || {};
      if (d.error) {
        setOutcome({ kind: "refused", message: d.message?.[lang] || d.error, missing: d.missing || [], code: d.code || null });
      } else {
        setOutcome({ kind: "ok", from: d.old_status, to: d.new_status, correlation: d.correlation_id || null });
        if (typeof onActivated === "function") await onActivated();
      }
    } catch (e) {
      const d = e?.response?.data || {};
      setOutcome({
        kind: "refused",
        message: d.message?.[lang] || d.error || e?.message || t("تعذّر تنفيذ التنشيط.", "The activation could not be performed."),
        missing: d.missing || [],
        code: d.code || null,
      });
    }
    setBusy(false);
  };

  const gateLabel = (key) => {
    const known = GATE_LABELS[key];
    if (known) return lang === "ar" ? known[0] : known[1];
    if (String(key).startsWith("minimum membership")) {
      return t(
        `الحد الأدنى للعضوية النشطة (${String(key).replace("minimum membership ", "")})`,
        key
      );
    }
    return key;
  };

  return (
    <section className="raqeem-card p-4 space-y-3" dir={lang === "ar" ? "rtl" : "ltr"} aria-label={t("تنشيط اللجنة", "Activate the committee")}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-primary/8 ring-1 ring-primary/15">
          <ShieldCheck className="w-4 h-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground">{t("تنشيط اللجنة", "Activate the committee")}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "التنشيط انتقال محكوم: تقع الصلاحية على المقعد، وتُختبر جاهزية اللجنة على الخادم (السند · الرئيس · الأمين · النصاب · قاعدة التصويت · المدة · التصنيف · الحد الأدنى للعضوية النشطة)، ويُسجَّل الانتقال بحدث دورة حياة وواقعة تدقيق.",
              "Activation is a governed transition: the authority follows the seat, the committee's readiness is tested on the server (instrument · chair · secretary · quorum · voting rule · term · classification · minimum active membership), and the transition is recorded as a lifecycle event and an audit fact."
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-2">
        <div className="flex-1 min-w-0">
          <label htmlFor="committee-activation-reason" className="text-[11px] font-medium text-muted-foreground">
            {t("سبب التنشيط (اختياري — يُسجَّل في واقعة التدقيق)", "Activation reason (optional — recorded in the audit fact)")}
          </label>
          <input
            id="committee-activation-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full px-2.5 py-1.5 rounded-md border border-border bg-card text-xs text-foreground"
            placeholder={t("مثال: استيفاء متطلبات التأسيس", "e.g. formation requirements met")}
          />
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />}
          {busy ? t("جارٍ التنفيذ…", "Activating…") : t("تنشيط اللجنة", "Activate the committee")}
        </button>
      </div>

      {outcome?.kind === "ok" && (
        <div className="rounded-md border border-state-success-ink/30 bg-state-success-surface px-3 py-2 text-xs text-state-success-ink space-y-1">
          <p className="font-medium inline-flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            {t("نُشِّطت اللجنة وسُجِّل الانتقال.", "The committee is activated and the transition is recorded.")}
          </p>
          <p className="arabic-figures">
            {t("الحالة", "Status")}: {outcome.from} → {outcome.to}
            {outcome.correlation ? ` · ${outcome.correlation}` : ""}
          </p>
        </div>
      )}

      {outcome?.kind === "refused" && (
        <div className="rounded-md border border-destructive/30 bg-state-danger-surface px-3 py-2 text-xs text-state-danger-ink space-y-1.5">
          <p className="font-medium inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            {t("لم يُنفَّذ التنشيط", "The activation was not performed")}
            {outcome.code ? ` · ${outcome.code}` : ""}
          </p>
          {outcome.message && <p>{outcome.message}</p>}
          {outcome.missing.length > 0 && (
            <div>
              <p className="font-medium">{t("ما ينقص:", "Still missing:")}</p>
              <ul className="list-disc ms-4 space-y-0.5">
                {outcome.missing.map((m) => <li key={m}>{gateLabel(m)}</li>)}
              </ul>
            </div>
          )}
          <p className="text-[11px] opacity-80 flex items-start gap-1">
            <Info className="w-3 h-3 shrink-0 mt-0.5" aria-hidden="true" />
            {t(
              "الجاهزية والصلاحية تُقاسان على الخادم: أكمِل الناقص ثم أعد المحاولة، أو اطلب من صاحب الصفة تنفيذ التنشيط.",
              "Readiness and authority are measured on the server: complete what is missing and try again, or ask the seat holder to perform the activation."
            )}
          </p>
        </div>
      )}
    </section>
  );
}