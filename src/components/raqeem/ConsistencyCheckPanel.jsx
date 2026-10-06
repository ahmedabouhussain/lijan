import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { ShieldCheck, AlertTriangle, Info, Loader2, RefreshCw } from "lucide-react";

// Cross-record consistency (record-consistency-1.0.0) — a CHECK, never a correction.
//
// The panel reports where an official record contradicts a rule that spans records, names the source it
// could not read instead of counting it as clean, and states its own read scope so a bounded page never
// passes for the whole register. It writes nothing and stops nothing: prevention lives in the commands.

export default function ConsistencyCheckPanel({ committeeId }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ loading: false, data: null, error: null });

  const load = async () => {
    if (!committeeId) return;
    setState({ loading: true, data: null, error: null });
    try {
      const res = await base44.functions.invoke("CheckRecordConsistency", { committee_id: committeeId });
      const d = res?.data || {};
      if (d.error) setState({ loading: false, data: null, error: d.error });
      else setState({ loading: false, data: d, error: null });
    } catch (e) {
      const d = e?.response?.data || {};
      setState({ loading: false, data: null, error: d.message?.[lang] || d.error || e?.message || t("تعذّر إجراء فحص الاتساق.", "The consistency check could not run.") });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [committeeId]);

  const report = state.data?.report;
  const blocking = (report?.violations || []).filter((x) => x.severity === "blocking");
  const advisory = (report?.violations || []).filter((x) => x.severity === "advisory");
  const notEvaluated = report?.not_evaluated || [];
  const scope = state.data?.read_scope;

  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("اتساق السجلات", "Record consistency")}</h3>
        </div>
        <button onClick={load} disabled={state.loading} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border hover:bg-secondary/40 disabled:opacity-40">
          {state.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {t("إعادة الفحص", "Re-run the check")}
        </button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "فحص لا تصحيح: يقابل السجلات بقواعد تمتد بينها — ولا يكتب ولا يصحّح ولا يوقف فعلًا. الوقاية في الأوامر المحكومة، وهذا التقرير يقيس الانحراف مقابل سياسة اللجنة.",
          "A check, not a correction: it matches records against rules that span them — and it writes nothing, corrects nothing, and stops no act. Prevention lives in the governed commands; this report measures divergence against the committee's own policy."
        )}
      </p>

      {state.error && (
        <div className="p-3 rounded-md border border-destructive/30 bg-state-danger-surface text-xs text-state-danger-ink">{state.error}</div>
      )}

      {report && (
        <div className="space-y-3">
          <div className={`p-3 rounded-md border text-xs ${report.verdict === "consistent" ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink" : report.verdict === "partial" ? "border-state-warning-ink/30 bg-state-warning-surface text-state-warning-ink" : "border-destructive/30 bg-state-danger-surface text-state-danger-ink"}`}>
            <p className="font-medium">
              {report.verdict === "consistent"
                ? t("لا انحراف في الصفحة المقروءة.", "No divergence in the page that was read.")
                : report.verdict === "partial"
                  ? t("فحص جزئي: بعض المصادر لم تُقرأ فلا تُحسب نظيفة.", "Partial check: some sources were not read, so they are not counted as clean.")
                  : t(`انحراف مسجَّل: ${report.blocking_count} حاكمًا و${report.advisory_count} للمراجعة.`, `Divergence recorded: ${report.blocking_count} governing and ${report.advisory_count} for review.`)}
            </p>
            <p className="mt-0.5 opacity-80">
              {t(`قواعد مُقيَّمة: ${(report.rules_evaluated || []).length} من ${report.rules_declared}`, `Rules evaluated: ${(report.rules_evaluated || []).length} of ${report.rules_declared}`)}
              {scope ? t(` · مصادر مقروءة: ${scope.sources_read}/10`, ` · sources read: ${scope.sources_read}/10`) : null}
              {scope?.capped?.length ? t(` · مقيَّدة بالحدّ: ${scope.capped.join(" · ")}`, ` · capped at the limit: ${scope.capped.join(" · ")}`) : null}
            </p>
          </div>

          {[...blocking, ...advisory].map((x, i) => (
            <div key={`${x.rule_id}-${x.record_id}-${i}`} className={`rounded border p-2.5 text-[11px] ${x.severity === "blocking" ? "border-destructive/30 bg-state-danger-surface" : "border-border bg-secondary/30"}`}>
              <p className="font-medium flex items-center gap-1.5">
                <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${x.severity === "blocking" ? "text-state-danger-ink" : "text-muted-foreground"}`} />
                <span className="font-mono">{x.rule_id}</span> · {lang === "ar" ? x.ar : x.en}
              </p>
              <p className="text-muted-foreground mt-0.5">{x.record_type} · <span className="font-mono">{x.record_id}</span></p>
              <p className="text-foreground mt-0.5">{lang === "ar" ? x.detail_ar : x.detail_en}</p>
            </div>
          ))}

          {notEvaluated.length > 0 && (
            <div className="rounded border border-state-warning-ink/30 bg-state-warning-surface p-2.5 text-[11px] text-state-warning-ink space-y-1">
              <p className="font-medium">{t("قواعد لم تُقيَّم — والقراءة التي فشلت ليست غيابًا:", "Rules NOT evaluated — a failed read is not an absence:")}</p>
              {notEvaluated.map((r) => (
                <p key={r.rule_id}><span className="font-mono">{r.rule_id}</span> · {lang === "ar" ? r.ar : r.en} · {t("مصادر لم تُقرأ:", "unread sources:")} {r.missing_sources.join(" · ")}</p>
              ))}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
            <Info className="w-3 h-3 shrink-0 mt-0.5" />
            {lang === "ar" ? report.note_ar : report.note_en}
          </p>
        </div>
      )}
    </div>
  );
}