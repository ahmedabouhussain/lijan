import React from "react";
import { ShieldCheck, ShieldAlert, ShieldX, BookCheck, Eye, Gauge, MessageSquare } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

// AIGovernancePostureBanner — لمحة تنفيذية لموقف حوكمة الذكاء على اللجنة مقابل
// الممارسة الوطنية: خمسة شروط (استشاري فقط · مُسجَّل · مراجعة بشرية · إفصاح الثقة · تغذية راجعة).
// حساب تقريبي من السجلات المحمّلة — ليس بديلاً عن تقرير المساءلة المُحسب خادميًا.

const CONDITIONS = [
  { key: "advisory", ar: "استشاري فقط", en: "Advisory-only", Icon: ShieldCheck },
  { key: "logged", ar: "مُسجَّل في السجل", en: "Logged in ledger", Icon: BookCheck },
  { key: "reviewed", ar: "مراجعة بشرية", en: "Human-reviewed", Icon: Eye },
  { key: "confidence", ar: "إفصاح الثقة", en: "Confidence disclosed", Icon: Gauge },
  { key: "feedback", ar: "تغذية راجعة", en: "Feedback collected", Icon: MessageSquare },
];

export default function AIGovernancePostureBanner({ records = [] }) {
  const { t, lang } = useLanguage();
  const total = records.length;
  const reviewed = records.filter((r) => r.human_reviewed).length;
  const withConfidence = records.filter((r) => typeof r.confidence_score === "number").length;
  const withFeedback = records.filter((r) => !!r.feedback_rating).length;

  const met = {
    advisory: true, // التزام المنصة — لا يُغيّر الذكاء حالة الحوكمة
    logged: total > 0,
    reviewed: reviewed > 0,
    confidence: withConfidence > 0,
    feedback: withFeedback > 0,
  };
  const score = Object.values(met).filter(Boolean).length;

  const verdict = total === 0
    ? { ar: "لم يُقيَّم بعد", en: "Not yet assessed", Icon: ShieldX, tone: "text-muted-foreground" }
    : score === 5
      ? { ar: "مستوفٍ للممارسة الوطنية", en: "Meets national practice", Icon: ShieldCheck, tone: "text-state-success-ink" }
      : reviewed > 0
        ? { ar: "جزئي — قيد التقدم", en: "Partial — in progress", Icon: ShieldAlert, tone: "text-state-warning-ink" }
        : { ar: "بانتظار المراجعة البشرية", en: "Awaiting human review", Icon: ShieldAlert, tone: "text-state-warning-ink" };

  return (
    <div className="raqeem-card p-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <verdict.Icon className={cn("w-4 h-4", verdict.tone)} />
          <span className="text-sm font-semibold">{t("موقف حوكمة الذكاء", "AI Governance Posture")}</span>
        </div>
        <span className={cn("text-xs font-medium", verdict.tone)}>{t(verdict.ar, verdict.en)}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CONDITIONS.map((c) => (
          <span
            key={c.key}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border",
              met[c.key]
                ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink"
                : "border-border bg-secondary/40 text-muted-foreground"
            )}
          >
            <c.Icon className="w-3 h-3" />
            {t(c.ar, c.en)}
          </span>
        ))}
      </div>
      {total > 0 && (
        <p className="text-[11px] text-muted-foreground/80 mt-2">
          {t("لمحة من السجلات المحمّلة — التقرير المُحسب خادميًا أدناه هو المصدر المعتمد.", "A glance from loaded records — the server-computed report below is the authoritative source.")}
        </p>
      )}
    </div>
  );
}