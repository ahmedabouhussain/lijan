import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, AlertCircle, Loader2, Check, Gauge } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

// AIFeedbackPanel — حلقة التغذية الراجعة البشرية على مخرج الذكاء (الممارسة العالمية).
// يعرض ثقة النموذج الذاتية + أساسها، ثم يتيح للإنسان تسجيل حكمه:
// مفيد / يحتاج تصحيحًا / غير مفيد — مع ملاحظة. الحكم بشري لا تقدير نموذج لنفسه.
// لا يُعرض إلا بوجود ledger_id (سجل المخرج المُسجَّل).

const RATINGS = [
  { value: "helpful", ar: "مفيد", en: "Helpful", Icon: ThumbsUp, tone: "state-success" },
  { value: "needs_correction", ar: "يحتاج تصحيحًا", en: "Needs correction", Icon: AlertCircle, tone: "state-warning" },
  { value: "not_helpful", ar: "غير مفيد", en: "Not helpful", Icon: ThumbsDown, tone: "state-danger" },
];

const TONE_BTN = {
  "state-success": "border-state-success-ink/40 bg-state-success-surface text-state-success-ink",
  "state-warning": "border-state-warning-ink/40 bg-state-warning-surface text-state-warning-ink",
  "state-danger": "border-state-danger-ink/40 bg-state-danger-surface text-state-danger-ink",
};

function confidenceWord(score, lang) {
  if (score === null || score === undefined) return null;
  const pct = Math.round(score * 100);
  if (pct >= 80) return lang === "ar" ? "ثقة عالية" : "High confidence";
  if (pct >= 50) return lang === "ar" ? "ثقة متوسطة" : "Medium confidence";
  return lang === "ar" ? "ثقة منخفضة" : "Low confidence";
}

export default function AIFeedbackPanel({ ledgerId, confidenceScore, confidenceBasis }) {
  const { t, lang } = useLanguage();
  const [rating, setRating] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  if (!ledgerId) return null;

  const submit = async () => {
    if (!rating) return;
    setBusy(true); setError(null);
    try {
      const res = await base44.functions.invoke("RecordAIFeedback", {
        ledger_id: ledgerId, feedback_rating: rating, feedback_note: note.trim() || null,
      });
      const d = res?.data || res;
      if (d?.error) setError(d.message?.[lang] || d.error);
      else setDone(true);
    } catch (e) {
      const d = e?.response?.data || {};
      setError(d.message?.[lang] || d.error || e?.message || t("تعذّر تسجيل الحكم", "Could not record feedback"));
    }
    setBusy(false);
  };

  const hasConfidence = typeof confidenceScore === "number";

  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3 space-y-2.5" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* ثقة النموذج الذاتية — تقدير لا ضمان */}
      {hasConfidence && (
        <div className="flex items-start gap-2 text-[11px]">
          <Gauge className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="min-w-0">
            <span className="text-muted-foreground">{t("ثقة النموذج:", "Model confidence:")}</span>{" "}
            <span className="font-medium text-foreground">{Math.round(confidenceScore * 100)}%</span>
            <span className="text-muted-foreground"> · {confidenceWord(confidenceScore, lang)}</span>
            {confidenceBasis && (
              <p className="text-muted-foreground/90 mt-0.5 leading-relaxed">{confidenceBasis}</p>
            )}
            <p className="text-muted-foreground/70 mt-0.5">
              {t("تقدير النموذج لنفسه — لا ضمانًا. الحكم النهائي للإنسان.", "The model's self-assessment — not a guarantee. The final verdict is human.")}
            </p>
          </div>
        </div>
      )}

      {done ? (
        <div className="flex items-center gap-1.5 text-[11px] text-state-success-ink font-medium">
          <Check className="w-3.5 h-3.5" />
          {t("شكرًا. حُكْمك مُسجَّل وسيُحسِّن المُوجِّهات المحكومة.", "Thank you. Your verdict is recorded and will improve the governed prompts.")}
        </div>
      ) : (
        <>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">
              {t("حكمك على هذا المخرج (يُسجَّل لتحسين الذكاء المحكوم):", "Your verdict on this output (recorded to improve governed AI):")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRating(r.value)}
                  aria-pressed={rating === r.value}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors",
                    rating === r.value ? TONE_BTN[r.tone] : "bg-card text-muted-foreground border-border hover:text-foreground"
                  )}
                >
                  <r.Icon className="w-3 h-3" />
                  {lang === "ar" ? r.ar : r.en}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full px-2.5 py-1.5 text-xs border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder={t("ما الذي أصاب أو أخطأ؟ (اختياري)", "What was right or wrong? (optional)")}
          />
          {error && <p className="text-[11px] text-state-danger-ink">{error}</p>}
          <button
            onClick={submit}
            disabled={busy || !rating}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-[11px] font-medium hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {t("تسجيل الحكم", "Record verdict")}
          </button>
        </>
      )}
    </div>
  );
}