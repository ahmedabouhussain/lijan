import React, { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, AlertTriangle, Loader2, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

// RecordRiskPanel — فاحص المخاطر قبل الاعتماد (استشاري بحت).
// يعرض المخاطر القانونية/الامتثالية/التشغيلية في نص مقترح القرار قبل إصداره.
// استشاري: لا يغيّر حالة ولا يوقف إصدارًا. كل مخرج موسوم «مولَّد آليًا» ومُسجَّل.

const SEVERITY_TONE = {
  high: "bg-state-danger-surface text-state-danger-ink border-state-danger-ink/30",
  medium: "bg-state-warning-surface text-state-warning-ink border-state-warning-ink/30",
  low: "bg-state-info-surface text-state-info-ink border-state-info-ink/30",
};

const CATEGORY_LABEL = {
  missing_legal_basis: { ar: "غياب السند النظامي", en: "Missing legal basis" },
  unaddressed_regulation: { ar: "مرجع تنظيمي غير مُحدَّث", en: "Unaddressed regulation" },
  unsupported_figure: { ar: "رقم بلا مصدر", en: "Unsupported figure" },
  signature_required_missing: { ar: "توقيع مطلوب غائب", en: "Missing signatory" },
  conflict_of_interest_relevant: { ar: "تضارب مصالح محتمل", en: "Conflict of interest" },
  vague_obligation: { ar: "التزام غامض", en: "Vague obligation" },
  missing_deadline: { ar: "مهلة غائبة", en: "Missing deadline" },
};

export default function RecordRiskPanel({ decisionId }) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("ScanRecordRisks", { decision_id: decisionId });
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setData(null); }
      else { setData(d); }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر إجراء الفحص", "Could not run the scan"));
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { if (decisionId) load(); /* eslint-disable-next-line */ }, [decisionId]);

  return (
    <section className="raqeem-card p-4 sm:p-5 space-y-4" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-state-danger-surface ring-1 ring-state-danger-ink/20">
            <ShieldAlert className="w-5 h-5 text-state-danger-ink" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">{t("فاحص المخاطر قبل الاعتماد", "Pre-approval risk scanner")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("فحص استشاري للمخاطر القانونية والامتثالية في النص قبل إصداره.", "An advisory scan of legal and compliance risks in the text before issuance.")}
            </p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary disabled:opacity-50"
          title={t("إعادة الفحص", "Re-scan")}
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">{t("فحص", "Scan")}</span>
        </button>
      </div>

      {data?.ai_generated && (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-state-info-surface text-state-info-ink text-[11px] font-medium">
          <Info className="w-3 h-3" />
          {t("مولَّد آليًا — استشاري بحت", "AI-generated — advisory only")}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t("جارٍ فحص النص…", "Scanning the text…")}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-state-danger-ink/30 bg-state-danger-surface px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-state-danger-ink shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-state-danger-ink">{error}</div>
        </div>
      )}

      {data && !loading && (
        <>
          {data.status === "not_evaluated" && (
            <div className="rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              {lang === "ar" ? data.reason?.ar : data.reason?.en}
            </div>
          )}

          {data.status === "scan_unavailable" && (
            <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface px-3 py-2 text-xs text-state-warning-ink">
              {lang === "ar" ? data.reason?.ar : data.reason?.en}
            </div>
          )}

          {data.status === "ok" && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">
                  {t(`${data.flag_count} علمًا`, `${data.flag_count} flag(s)`)}
                  {data.high_count > 0 && t(` · ${data.high_count} عالي`, ` · ${data.high_count} high`)}
                </span>
                {data.flag_count === 0 && (
                  <span className="px-2 py-0.5 rounded-md bg-state-success-surface text-state-success-ink font-medium">
                    {t("لا مخاطر مكتشفة — لا يُقرأ براءة", "No risks detected — not a clean bill")}
                  </span>
                )}
              </div>

              {data.flags?.length > 0 && (
                <ul className="space-y-2">
                  {data.flags.map((f, i) => {
                    const tone = SEVERITY_TONE[f.severity] || SEVERITY_TONE.medium;
                    const cat = CATEGORY_LABEL[f.category] || { ar: f.category, en: f.category };
                    return (
                      <li key={i} className={cn("rounded-md border px-3 py-2.5", tone)}>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-sm font-semibold">{lang === "ar" ? cat.ar : cat.en}</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/40">
                            {t(f.severity === "high" ? "عالية" : f.severity === "medium" ? "متوسطة" : "منخفضة",
                              f.severity === "high" ? "High" : f.severity === "medium" ? "Medium" : "Low")}
                          </span>
                          {f.location && <span className="text-[10px] opacity-80">· {f.location}</span>}
                        </div>
                        <p className="text-xs mt-1.5 leading-relaxed">{lang === "ar" ? f.explanation_ar : f.explanation_en}</p>
                        {f.excerpt && (
                          <blockquote className="mt-1.5 text-[11px] italic opacity-80 border-s-2 border-current/30 ps-2">
                            «{f.excerpt}»
                          </blockquote>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
                {lang === "ar" ? data.advisory_note?.ar : data.advisory_note?.en}
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}