import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import {
  RefreshCw, AlertTriangle, ShieldCheck, Gauge, ThumbsUp, ThumbsDown, AlertCircle,
  CheckCircle2, Lock, FileCheck2, Siren, Scale, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// AIAccountabilityPanel — تقرير المساءلة على الذكاء (محسوب خادميًا، لا في المتصفح).
// يعرض مقاييس الإفصاح الوطنية: تغطية المراجعة، تجاوز الإنسان، نسبة المفيد، متوسط الثقة.
// كل رقم يحمل تعريفه ومالكه وبسطه/مقامه — ولا يُعرض ما هو تحت أرضية الإفصاح.

const STATE_TONE = {
  computed: "state-success",
  suppressed: "state-warning",
  no_records: "state-info",
  unread: "state-danger",
  refused: "state-danger",
};

const FEEDBACK_TONE = {
  helpful: "bg-state-success-surface text-state-success-ink",
  needs_correction: "bg-state-warning-surface text-state-warning-ink",
  not_helpful: "bg-state-danger-surface text-state-danger-ink",
};

export default function AIAccountabilityPanel({ committeeId }) {
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!committeeId) return;
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke("GetAIAccountabilityReport", { committee_id: committeeId });
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setData(null); }
      else { setData(d); setError(null); }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر تحميل تقرير المساءلة", "Could not load the accountability report"));
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [committeeId]);

  if (loading) {
    return (
      <div className="raqeem-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" />
        {t("جارٍ تجميع تقرير المساءلة…", "Assembling the accountability report…")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="raqeem-card p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">{t("تعذّر تجميع التقرير", "Could not assemble the report")}</div>
          <p className="text-xs text-muted-foreground mt-1">{error}</p>
          <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
            <RefreshCw className="w-3.5 h-3.5" />{t("إعادة المحاولة", "Try again")}
          </button>
        </div>
      </div>
    );
  }
  if (!data) return null;

  const metrics = data.metrics || [];
  const fd = data.feedback_distribution || {};
  const fl = data.feedback_labels || {};
  const byType = data.by_output_type || [];
  const unread = data.unread_sources || [];

  return (
    <section className="space-y-3" dir={lang === "ar" ? "rtl" : "ltr"} aria-label={t("تقرير المساءلة على الذكاء", "AI Accountability Report")}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 ring-1 ring-primary/12">
          <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-foreground">{t("تقرير المساءلة على الذكاء", "AI Accountability Report")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              "مقاييس إفصاح محسوبة خادميًا وفق مبادئ OECD للذكاء و NIST AI RMF — لا رقم بلا تعريف ومالك وبسط/مقام.",
              "Server-computed disclosure metrics per OECD AI Principles and NIST AI RMF — no figure without a definition, owner, and numerator/denominator."
            )}
          </p>
        </div>
        <button onClick={load} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary" title={t("تحديث", "Refresh")}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("تحديث", "Refresh")}</span>
        </button>
      </div>

      {/* الالتزام بـ«الاستشاري فقط» */}
      <div className={cn(
        "rounded-md border px-3 py-2 flex items-start gap-2 text-[11px]",
        data.advisory_only?.compliant
          ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink"
          : "border-state-danger-ink/30 bg-state-danger-surface text-state-danger-ink"
      )}>
        <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{lang === "ar" ? data.advisory_only?.clause?.ar : data.advisory_only?.clause?.en}</span>
      </div>

      {/* مقاييس النسب */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.key} metric={m} lang={lang} t={t} />
        ))}
      </div>

      {/* توزيع التغذية الراجعة */}
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileCheck2 className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("توزيع حكم الإنسان", "Human verdict distribution")}
          </p>
        </div>
        {fd.total_reviewed === 0 || fd.total_reviewed === null ? (
          <p className="text-xs text-muted-foreground italic">
            {t("لا أحكام بشرية مُسجَّلة بعد.", "No human verdicts recorded yet.")}
          </p>
        ) : (
          <div className="space-y-2">
            {Object.entries(fl).map(([key, label]) => {
              const count = fd[key] ?? 0;
              const pct = fd.total_reviewed > 0 ? Math.round((count / fd.total_reviewed) * 100) : 0;
              const Icon = key === "helpful" ? ThumbsUp : key === "needs_correction" ? AlertCircle : ThumbsDown;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <Icon className="w-3 h-3" />
                      {lang === "ar" ? label.ar : label.en}
                    </span>
                    <span className="text-muted-foreground">{count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className={cn("h-full rounded-full", FEEDBACK_TONE[key])} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground border-t border-border pt-1.5 mt-1.5">
              {t(
                `إجمالي المراجَعة بشريًا: ${fd.total_reviewed ?? "—"} من أصل ${data.summary?.total_outputs ?? "—"} مخرجًا.`,
                `Total reviewed by a human: ${fd.total_reviewed ?? "—"} of ${data.summary?.total_outputs ?? "—"} outputs.`
              )}
            </p>
          </div>
        )}
      </div>

      {/* التوزيع حسب النوع */}
      {byType.length > 0 && (
        <div className="raqeem-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("حسب نوع المخرج", "By output type")}
          </p>
          <div className="space-y-2">
            {byType.map((r) => {
              const pct = data.summary?.total_outputs > 0 ? Math.round((r.count / data.summary.total_outputs) * 100) : 0;
              return (
                <div key={r.type}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-foreground">{lang === "ar" ? r.label.ar : r.label.en}</span>
                    <span className="text-muted-foreground">{r.count} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* سجل الحوادث — NIST AI RMF MEASURE/MANAGE */}
      {data.incidents && (
        <IncidentsSection incidents={data.incidents} lang={lang} t={t} />
      )}

      {/* العدالة عبر أنواع المخرجات — OECD Fairness */}
      {data.fairness_by_output_type?.length > 0 && (
        <FairnessSection rows={data.fairness_by_output_type} lang={lang} t={t} floor={data.disclosure_floor} />
      )}

      {/* الاتجاه الزمني */}
      {data.trend?.buckets?.length > 0 && (
        <TrendSection trend={data.trend} lang={lang} t={t} />
      )}

      {/* مصادر غير مقروءة */}
      {unread.length > 0 && (
        <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-state-warning-ink shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-state-warning-ink">
                {t("مصادر لم تُقرأ — التقرير ناقص ويقول ذلك", "Sources could not be read — the report is incomplete and says so")}
              </div>
              <ul className="mt-1 space-y-0.5">
                {unread.map((u, i) => (
                  <li key={i} className="text-[11px] text-state-warning-ink/90">{u.source} — {u.reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ملاحظة الصدق */}
      {data.honesty_note && (
        <p className="text-[11px] text-muted-foreground leading-relaxed border-t border-border pt-2">
          {lang === "ar" ? data.honesty_note.ar : data.honesty_note.en}
        </p>
      )}
    </section>
  );
}

function IncidentsSection({ incidents, lang, t }) {
  const open = incidents.open ?? 0;
  const critical = incidents.critical_open ?? 0;
  const sevLabels = incidents.severity_labels || {};
  const bySev = incidents.by_severity || [];
  const byType = incidents.by_type || [];
  if (open === 0 && bySev.length === 0) return null;

  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Siren className={cn("w-4 h-4", open > 0 ? "text-state-danger-ink" : "text-muted-foreground")} />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("سجل حوادث الذكاء", "AI Incident Register")}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-state-danger-surface text-state-danger-ink">
            {t("مفتوحة", "Open")}: {open}
          </span>
          {critical > 0 && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-state-danger-ink text-white animate-pulse">
              {t("حرج", "Critical")}: {critical}
            </span>
          )}
        </div>
      </div>

      {bySev.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {bySev.map((s) => {
            const label = sevLabels[s.severity] || { ar: s.severity, en: s.severity };
            return (
              <span key={s.severity} className={cn("px-2 py-0.5 rounded text-[10px] font-medium", `bg-${label.tone}-surface text-${label.tone}-ink`)}>
                {lang === "ar" ? label.ar : label.en}: {s.count}
              </span>
            );
          })}
        </div>
      )}

      {byType.length > 0 && (
        <div className="space-y-1.5 border-t border-border pt-2">
          <p className="text-[10px] font-medium text-muted-foreground">{t("حسب نوع الحادثة", "By incident type")}</p>
          {byType.map((it) => (
            <div key={it.type} className="flex items-start justify-between gap-2 text-[11px]">
              <div className="min-w-0">
                <span className="text-foreground font-medium">{lang === "ar" ? it.label.ar : it.label.en}</span>
                {it.standard && <span className="text-muted-foreground/70 block text-[10px]">{it.standard}</span>}
              </div>
              <span className="text-muted-foreground shrink-0">{it.count}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground border-t border-border pt-2 leading-relaxed">
        {t(
          "كل حادثة سجل قابلاً للتدقيق وفق NIST AI RMF (MEASURE/MANAGE). الحادثة المُتدارَكة تُغلق بأساس مكتوب، ولا تُمحى.",
          "Every incident is an auditable record per NIST AI RMF (MEASURE/MANAGE). A mitigated incident closes on a written basis and is never erased."
        )}
      </p>
    </div>
  );
}

function FairnessSection({ rows, lang, t, floor }) {
  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Scale className="w-4 h-4 text-primary" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("العدالة عبر أنواع المخرجات", "Fairness across output types")}
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            {t("هل يفشل الذكاء في نوع دون آخر؟ OECD AI Principle 1.2 (Fairness).", "Does the AI fail more on some output classes? OECD AI Principle 1.2 (Fairness).")}
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.type} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-foreground">{lang === "ar" ? r.label.ar : r.label.en}</span>
              <span className="text-muted-foreground">{t("إجمالي", "Total")}: {r.total}</span>
            </div>
            {r.suppressed ? (
              <p className="text-[10px] text-muted-foreground italic">{t("أقل من حد الإفصاح — يُكتم.", "Below disclosure floor — withheld.")}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                    <span>{t("تجاوز الإنسان", "Human override")}</span>
                    <span>{r.override_rate === null ? "—" : `${r.override_rate}%`}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-state-warning-ink rounded-full" style={{ width: `${r.override_rate || 0}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                    <span>{t("مفيد", "Helpful")}</span>
                    <span>{r.helpful_rate === null ? "—" : `${r.helpful_rate}%`}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-state-success-ink rounded-full" style={{ width: `${r.helpful_rate || 0}%` }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendSection({ trend, lang, t }) {
  const buckets = trend.buckets || [];
  if (buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => b.outputs || 0), 1);
  const direction = trend.direction || "insufficient";
  const DirIcon = direction === "rising" || direction === "stable_or_rising" ? TrendingUp : direction === "declining" ? TrendingDown : Minus;

  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <DirIcon className="w-4 h-4 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("الاتجاه الزمني", "Trend over time")}
          </p>
        </div>
        <span className="text-[10px] text-muted-foreground">
          {t("آخر", "Last")} {trend.window_months || 6} {t("أشهر", "months")}
        </span>
      </div>
      <div className="flex items-end justify-between gap-1.5 h-20">
        {buckets.map((b, i) => {
          const h = Math.max((b.outputs / max) * 100, 4);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full bg-primary/70 rounded-t" style={{ height: `${h}%` }} title={`${b.outputs}`} />
              <span className="text-[9px] text-muted-foreground">{String(b.bucket || "").slice(0, 7)}</span>
              <span className="text-[10px] font-medium text-foreground">{b.outputs}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        {direction === "declining"
          ? t("الاتجاه تنازلي — انخفاض مخرجات الذكاء. قد يعكس صحة سجل المقاييس لا تحسنًا.", "Declining trend — fewer AI outputs. This may reflect register health, not improvement.")
          : direction === "stable_or_rising"
            ? t("الاتجاه مستقر/صاعد — اللجنة تستخدم الذكاء بانتظام.", "Stable or rising trend — the committee uses AI regularly.")
            : t("بيانات غير كافية لقراءة الاتجاه.", "Insufficient data to read a trend.")}
      </p>
    </div>
  );
}

function MetricCard({ metric, lang, t }) {
  const tone = STATE_TONE[metric.state] || "state-neutral";
  const Icon = metric.key === "ai_confidence_avg" ? Gauge
    : metric.key === "ai_review_coverage" ? CheckCircle2
    : metric.key === "ai_human_override_rate" ? AlertCircle
    : ThumbsUp;
  const isInverse = metric.polarity === "inverse";
  const isComputed = metric.state === "computed";

  return (
    <div className="raqeem-card p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn("w-3.5 h-3.5", `text-${tone}-ink`)} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
          {lang === "ar" ? metric.title.ar : metric.title.en}
        </span>
      </div>
      <div className={cn("text-xl font-bold", isComputed && (isInverse && metric.value >= 30 ? "text-state-warning-ink" : "text-foreground"))}>
        {isComputed
          ? (metric.unit === "score" ? `${Math.round((metric.value || 0) * 100)}%` : `${metric.value}%`)
          : "—"}
      </div>
      {isComputed && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {metric.fraction}
          {isInverse && (
            <span className="text-muted-foreground/70"> · {t("مقلوب", "inverse")}</span>
          )}
        </div>
      )}
      {!isComputed && metric.note && (
        <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {lang === "ar" ? metric.note.ar : metric.note.en}
        </div>
      )}
    </div>
  );
}