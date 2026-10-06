import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { BarChart3, Loader2, AlertTriangle, Info, ShieldQuestion } from "lucide-react";
import { cn } from "@/lib/utils";

// MetricsPanel — the metric surface (metric-definitions-1.0.0, D-088).
//
// Every figure is computed on the server and arrives WITH its definition, owner, period, numerator,
// denominator, source and freshness — so this panel can never print a bare percentage. A figure below
// the disclosure floor, a period with no records, or a source that could not be read is shown as that,
// and never as a number (the D-054 rule). The panel computes nothing.

const TONE = {
  computed: "text-state-success-ink bg-state-success-surface",
  suppressed: "text-state-warning-ink bg-state-warning-surface",
  no_records: "text-state-neutral-ink bg-state-neutral-surface",
  unread: "text-state-danger-ink bg-state-danger-surface",
  refused: "text-state-danger-ink bg-state-danger-surface",
};

const STATE_LABEL = {
  computed: { ar: "محسوب", en: "Computed" },
  suppressed: { ar: "محجوب للإفصاح", en: "Withheld (disclosure)" },
  no_records: { ar: "لا سجل", en: "No records" },
  unread: { ar: "مصدر لم يُقرأ", en: "Source unread" },
  refused: { ar: "مرفوض", en: "Refused" },
};

function MetricCard({ m, lang, t }) {
  const tone = TONE[m.state] || TONE.no_records;
  const value = m.value === null || m.value === undefined
    ? (lang === "ar" ? m.note?.ar : m.note?.en) || (lang === "ar" ? STATE_LABEL[m.state]?.ar : STATE_LABEL[m.state]?.en)
    : m.unit === "percent" ? `${m.value}%` : `${m.value}`;

  return (
    <div className="raqeem-card p-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-foreground leading-tight">{lang === "ar" ? m.title?.ar : m.title?.en}</span>
        <span className={cn("shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium", tone)}>
          {lang === "ar" ? STATE_LABEL[m.state]?.ar : STATE_LABEL[m.state]?.en}
        </span>
      </div>

      <div className="mt-1.5 text-lg font-bold text-foreground arabic-figures">{value}</div>
      {m.numerator !== null && m.numerator !== undefined && (
        <div className="text-[11px] text-muted-foreground arabic-figures">
          {t("البسط/المقام:", "Numerator/denominator:")} {m.numerator}/{m.denominator}
          {m.polarity === "inverse" ? ` · ${t("ارتفاعه خطر لا إنجاز", "a rising value is a risk, not an achievement")}` : ""}
        </div>
      )}

      <p className="mt-2 text-[11px] text-muted-foreground leading-relaxed">{lang === "ar" ? m.definition?.ar : m.definition?.en}</p>

      <dl className="mt-2 space-y-1 text-[11px] border-t border-border pt-2">
        <div><dt className="inline font-medium text-foreground">{t("المالك:", "Owner:")} </dt><dd className="inline text-muted-foreground">{lang === "ar" ? m.owner?.ar : m.owner?.en}</dd></div>
        <div><dt className="inline font-medium text-foreground">{t("الفترة:", "Period:")} </dt><dd className="inline text-muted-foreground">{lang === "ar" ? m.period?.ar : m.period?.en}</dd></div>
        <div><dt className="inline font-medium text-foreground">{t("البسط:", "Numerator:")} </dt><dd className="inline text-muted-foreground">{lang === "ar" ? m.numerator_text?.ar : m.numerator_text?.en}</dd></div>
        <div><dt className="inline font-medium text-foreground">{t("المقام:", "Denominator:")} </dt><dd className="inline text-muted-foreground">{lang === "ar" ? m.denominator_text?.ar : m.denominator_text?.en}</dd></div>
        <div><dt className="inline font-medium text-foreground">{t("المصدر:", "Source:")} </dt><dd className="inline text-muted-foreground" dir="ltr">{(m.source_entities || []).join(" · ")}</dd></div>
        <div><dt className="inline font-medium text-foreground">{t("الحداثة:", "Freshness:")} </dt><dd className="inline text-muted-foreground">{lang === "ar" ? m.freshness?.ar : m.freshness?.en}</dd></div>
      </dl>
    </div>
  );
}

export default function MetricsPanel({ committeeId }) {
  const { t, lang } = useLanguage();
  const { isDemoMode, demoPersonaKey } = useEffectiveActor();
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = async () => {
    if (!committeeId) return;
    setState({ loading: true, data: null, error: null });
    try {
      const res = await base44.functions.invoke("GetCommitteeMetrics", {
        committee_id: committeeId,
        demo_mode: isDemoMode,
        demo_persona: demoPersonaKey,
      });
      const d = res?.data || {};
      if (d.error) { setState({ loading: false, data: null, error: d.error }); return; }
      setState({ loading: false, data: d, error: null });
    } catch (e) {
      const d = e?.response?.data || {};
      setState({
        loading: false,
        data: null,
        error: d.error || e?.message || t("تعذّر حساب المؤشرات.", "The metrics could not be computed."),
      });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [committeeId, isDemoMode, demoPersonaKey]);

  if (state.loading) {
    return (
      <div className="raqeem-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> {t("جارٍ حساب المؤشرات من سجلات اللجنة…", "Computing the metrics from the committee registers…")}
      </div>
    );
  }

  // A refused or failed read is reported, never rendered as an empty or zeroed panel.
  if (!state.data) {
    return (
      <div className="raqeem-card p-4 flex items-start gap-2 text-xs text-state-danger-ink bg-state-danger-surface border-destructive/30">
        <ShieldQuestion className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-medium">{t("لم تُحسب المؤشرات", "The metrics were not computed")}</p>
          <p>{state.error}</p>
          <button onClick={load} className="mt-1 underline text-[11px]">{t("إعادة المحاولة", "Retry")}</button>
        </div>
      </div>
    );
  }

  const d = state.data;
  const unread = d.unread_sources || [];

  return (
    <div className="space-y-3">
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("المؤشرات المعرَّفة", "Defined metrics")}</h3>
          <span className="text-[11px] text-muted-foreground">
            {t(`حد الإفصاح: ${d.disclosure_floor} سجلات`, `Disclosure floor: ${d.disclosure_floor} records`)}
          </span>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {t(
            "لا يُعرض رقم دون تعريفه ومالكه وفترته وبسطه ومقامه ومصدره وحداثته؛ وتحسبه الخادم من سجلات اللجنة عند الطلب. الرقم الذي دون حد الإفصاح يُحجب ويُسمّى، ولا يُعرض صفر لمصدر تعذّرت قراءته.",
            "No figure is shown without its definition, owner, period, numerator, denominator, source and freshness, and every figure is computed on the server from the committee registers on request. A figure below the disclosure floor is withheld and named, and no zero is shown for a source that could not be read."
          )}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground font-mono">
          {d.contract_version} · {t("حُسبت", "computed")} {new Date(d.computed_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          {d.registry_self_check ? ` · ${t("فحص ذاتي", "self-check")}: ${d.registry_self_check.ok ? t("سليم", "clean") : t("خلل", "problem")}` : ""}
        </p>
      </div>

      {unread.length > 0 && (
        <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-state-warning-ink shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-state-warning-ink">
                {t("مصادر لم تُقرأ — مؤشراتها غير محسوبة لا صفرية", "Some sources could not be read — their metrics are unread, never zero")}
              </div>
              <ul className="mt-1 space-y-0.5">
                {unread.map((u) => (
                  <li key={u.source} className="text-[11px] text-state-warning-ink/90">{u.source} — {u.reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(d.metrics || []).map((m) => <MetricCard key={m.key} m={m} lang={lang} t={t} />)}
      </div>
    </div>
  );
}