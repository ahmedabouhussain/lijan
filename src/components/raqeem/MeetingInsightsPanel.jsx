import React, { useEffect, useState } from "react";
import { Sparkles, FileText, RefreshCw, AlertTriangle, Loader2, Info, HelpCircle, GitCompare, ArrowLeftRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import AIFeedbackPanel from "@/components/raqeem/AIFeedbackPanel";

// MeetingInsightsPanel — التحضير الذكي + ملخص الحزمة (استشاري بحت).
// تبويبان: «التحضير» (أسئلة محتملة لكل بند + تناقضات + فروقات عن آخر حزمة)
// و«الملخص» (نظرة عامة وأقسام للحزمة المنشورة). كل مخرج موسوم «مولَّد آليًا» ومُسجَّل.

export default function MeetingInsightsPanel({ meetingId }) {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState("prep");
  const [prep, setPrep] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPrep = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke("PrepareMeetingInsights", { meeting_id: meetingId });
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setPrep(null); }
      else setPrep(d);
    } catch (e) { setError(e?.response?.data?.error || e?.message || t("تعذّر التحضير", "Could not prepare")); setPrep(null); }
    setLoading(false);
  };

  const loadSummary = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke("SummarizeMeetingPack", { meeting_id: meetingId });
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setSummary(null); }
      else setSummary(d);
    } catch (e) { setError(e?.response?.data?.error || e?.message || t("تعذّر التلخيص", "Could not summarize")); setSummary(null); }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === "prep" && !prep) loadPrep();
    if (tab === "summary" && !summary) loadSummary();
    // eslint-disable-next-line
  }, [tab]);

  const reload = () => { if (tab === "prep") loadPrep(); else loadSummary(); };

  return (
    <section className="raqeem-card p-4 sm:p-5 space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 ring-1 ring-primary/15">
            <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">{t("التحضير الذكي وملخص الحزمة", "Smart prep & pack summary")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("تحضير استشاري قبل الاجتماع، وملخص للحزمة للجهات الإشرافية.", "Advisory prep before the meeting, and a pack summary for oversight bodies.")}
            </p>
          </div>
        </div>
        <button onClick={reload} disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary disabled:opacity-50">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">{t("تحديث", "Refresh")}</span>
        </button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setTab("prep")} aria-pressed={tab === "prep"}
          className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
            tab === "prep" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-secondary/60")}>
          <HelpCircle className="w-3.5 h-3.5 inline-block me-1" /> {t("التحضير", "Prep")}
        </button>
        <button onClick={() => setTab("summary")} aria-pressed={tab === "summary"}
          className={cn("px-3 py-1.5 rounded-md text-xs font-medium border transition-colors",
            tab === "summary" ? "bg-primary text-primary-foreground border-primary" : "bg-card text-foreground border-border hover:bg-secondary/60")}>
          <FileText className="w-3.5 h-3.5 inline-block me-1" /> {t("ملخص الحزمة", "Pack summary")}
        </button>
      </div>

      {(prep?.ai_generated || summary?.ai_generated) && (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-state-info-surface text-state-info-ink text-[11px] font-medium">
          <Info className="w-3 h-3" /> {t("مولَّد آليًا — استشاري بحت", "AI-generated — advisory only")}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {tab === "prep" ? t("جارٍ تجهيز التحضير…", "Preparing…") : t("جارٍ تلخيص الحزمة…", "Summarizing…")}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-state-danger-ink/30 bg-state-danger-surface px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-state-danger-ink shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-state-danger-ink">{error}</div>
        </div>
      )}

      {tab === "prep" && prep && !loading && (
        <>
          {prep.status === "not_evaluated" && (
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              {lang === "ar" ? prep.reason?.ar : prep.reason?.en}
            </div>
          )}
          {prep.status === "ok" && (
            <>
              {prep.items?.length > 0 ? (
                <ul className="space-y-2">
                  {prep.items.map((it, i) => (
                    <li key={i} className="rounded-md border border-border px-3 py-2.5">
                      <div className="text-sm font-semibold text-foreground mb-1.5">{it.agenda_item_id}</div>
                      <div className="flex items-start gap-1.5 mb-1">
                        <HelpCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <ul className="text-xs text-foreground space-y-0.5">
                          {it.questions.map((q, j) => <li key={j}>• {q}</li>)}
                        </ul>
                      </div>
                      {it.inconsistencies?.length > 0 && (
                        <div className="flex items-start gap-1.5 mt-1.5 pt-1.5 border-t border-border">
                          <AlertTriangle className="w-3.5 h-3.5 text-state-warning-ink shrink-0 mt-0.5" />
                          <ul className="text-xs text-state-warning-ink space-y-0.5">
                            {it.inconsistencies.map((c, j) => <li key={j}>• {c}</li>)}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("لا بنود مُحضَّرة بعد.", "No items prepared yet.")}</p>
              )}

              {prep.cross_item_inconsistencies?.length > 0 && (
                <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-state-warning-ink mb-1">
                    <GitCompare className="w-3.5 h-3.5" /> {t("تناقضات بين البنود", "Cross-item inconsistencies")}
                  </div>
                  <ul className="text-xs text-state-warning-ink space-y-0.5">
                    {prep.cross_item_inconsistencies.map((c, j) => <li key={j}>• {c}</li>)}
                  </ul>
                </div>
              )}

              {prep.deltas_from_last?.length > 0 && (
                <div className="rounded-md border border-state-info-ink/30 bg-state-info-surface px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-state-info-ink mb-1">
                    <ArrowLeftRight className="w-3.5 h-3.5" /> {t("فروقات عن آخر حزمة", "Deltas from the last pack")}
                  </div>
                  <ul className="text-xs text-state-info-ink space-y-0.5">
                    {prep.deltas_from_last.map((d, j) => <li key={j}>• {d}</li>)}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                {lang === "ar" ? prep.advisory_note?.ar : prep.advisory_note?.en}
              </p>
              <AIFeedbackPanel
                ledgerId={prep.ledger_id}
                confidenceScore={prep.confidence_score}
                confidenceBasis={prep.confidence_basis}
              />
            </>
          )}
        </>
      )}

      {tab === "summary" && summary && !loading && (
        <>
          {summary.status === "not_evaluated" && (
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              {lang === "ar" ? summary.reason?.ar : summary.reason?.en}
            </div>
          )}
          {summary.status === "ok" && (
            <>
              {summary.overview_ar && (
                <p className="text-sm text-foreground leading-relaxed bg-secondary/40 rounded-md px-3 py-2">
                  {lang === "ar" ? summary.overview_ar : summary.overview_en}
                </p>
              )}
              {summary.sections?.length > 0 ? (
                <ul className="space-y-2">
                  {summary.sections.map((s, i) => (
                    <li key={i} className="rounded-md border border-border px-3 py-2.5">
                      <div className="text-sm font-semibold text-foreground mb-1">{s.title}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{lang === "ar" ? s.summary_ar : s.summary_en}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">{t("لا أقسام في الملخص.", "No sections in the summary.")}</p>
              )}
              <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                {lang === "ar" ? summary.advisory_note?.ar : summary.advisory_note?.en}
              </p>
              <AIFeedbackPanel
                ledgerId={summary.ledger_id}
                confidenceScore={summary.confidence_score}
                confidenceBasis={summary.confidence_basis}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}