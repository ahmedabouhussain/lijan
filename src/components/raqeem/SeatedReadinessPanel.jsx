import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { AlertTriangle, CheckCircle2, RefreshCw, Users } from "lucide-react";

// Measured, not asserted: this panel asks the server what each committee's seat register actually
// supports today, so "no authorized seated actor" stops being a sentence in a register and becomes a
// number per committee with the exact enabling action next to it.

const VERDICT_STYLE = {
  executable: "bg-state-success-surface text-state-success-ink",
  insufficient_seated_voters: "bg-state-warning-surface text-state-warning-ink",
  unreadable: "bg-state-neutral-surface text-state-neutral-ink",
};

export default function SeatedReadinessPanel({ committeeIds = [] }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const ids = committeeIds.filter(Boolean).slice(0, 20).join(",");

  useEffect(() => {
    let alive = true;
    if (!ids) {
      setState({ loading: false, data: null, error: null });
      return () => { alive = false; };
    }
    setState((s) => ({ ...s, loading: true }));
    (async () => {
      try {
        const res = await base44.functions.invoke("GetSeatedActorReadiness", { committee_ids: ids.split(",") });
        if (alive) setState({ loading: false, data: res?.data || {}, error: null });
      } catch (e) {
        const d = e?.response?.data || {};
        if (alive) {
          setState({
            loading: false,
            data: null,
            error: (lang === "ar" ? d.error_ar : d.error) || d.error || t("تعذّر القياس.", "The measure could not be computed."),
          });
        }
      }
    })();
    return () => { alive = false; };
  }, [ids, lang]);

  if (!ids) return null;

  if (state.loading) {
    return (
      <div className="raqeem-card p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        {t("يُقاس ما تسمح به سجلات المقاعد…", "Measuring what the seat registers actually support…")}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="raqeem-card p-3 flex items-start gap-2 text-xs text-destructive">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{state.error}</span>
      </div>
    );
  }

  const rows = state.data?.committees || [];
  const summary = state.data?.summary || null;

  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">
          {t("جاهزية التشغيل بالمواقع المُقعدة", "Readiness for seated operation")}
        </span>
        {summary && (
          <span className="text-xs text-muted-foreground">
            {t("قابلة للتشغيل", "executable")}: {summary.executable} · {t("غير مكتملة المقاعد", "insufficient seats")}: {summary.insufficient_seated_voters} · {t("غير قابلة للقياس", "unverifiable")}: {summary.unreadable}
          </span>
        )}
      </div>

      {rows.map((r) => {
        const verdict = r.verdict || "unreadable";
        const blocked = (r.runs || []).filter((x) => x.status !== "ready");
        return (
          <div key={r.committee_id} className="border border-border rounded-md p-3 space-y-2">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{lang === "ar" ? (r.name_ar || r.name_en || r.committee_id) : (r.name_en || r.name_ar || r.committee_id)}</div>
                {r.readable ? (
                  <div className="text-xs text-muted-foreground">
                    {t("المقاعد المؤهلة", "Eligible seats")}: {r.eligible_seats}
                    {" · "}{t("مربوطة بحساب مستخدم", "bound to an account")}: {r.bound_seats}
                    {" · "}{t("النصاب", "quorum")}: {r.quorum_required}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {t("لم يُسمح بقياس هذه اللجنة", "This committee could not be measured")}{r.code ? ` · ${r.code}` : ""}
                  </div>
                )}
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${VERDICT_STYLE[verdict] || VERDICT_STYLE.unreadable}`}>
                {verdict === "executable" ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {r.verdict_text ? (lang === "ar" ? r.verdict_text.ar : r.verdict_text.en) : verdict}
              </span>
            </div>

            {r.readable && (r.reason_text || r.enabling_action_text) && (
              <p className="text-xs text-muted-foreground">
                {r.reason_text ? (lang === "ar" ? r.reason_text.ar : r.reason_text.en) : null}
                {r.enabling_action_text ? ` — ${t("المُتيح", "Enabler")}: ${lang === "ar" ? r.enabling_action_text.ar : r.enabling_action_text.en}` : null}
              </p>
            )}

            {r.unread_sources?.length > 0 && (
              <p className="text-xs text-destructive">
                {t("لم نستطع قراءة:", "Could not read:")} {r.unread_sources.join(" · ")} — {t("القياس غير مكتمل، ولا يُعرض صفرًا.", "the measure is incomplete and is never shown as zero.")}
              </p>
            )}

            {blocked.length > 0 && (
              <ul className="space-y-1">
                {blocked.map((run) => (
                  <li key={run.id} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-foreground shrink-0">{run.id}</span>
                    <span className="min-w-0">
                      {lang === "ar" ? run.ar : run.en} — {run.blocking_text ? (lang === "ar" ? run.blocking_text.ar : run.blocking_text.en) : run.blocking_code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}

      <p className="text-[11px] text-muted-foreground">
        {t(
          "القياس يُحتسب بالقاعدة نفسها التي تستخدمها دورة التصويت، ولا يُعدّ مقعدًا قادرًا على العمل إلا إذا كان مربوطًا بحساب مستخدم حقيقي. وما لا يُقرأ يُعلن، ولا يُعرض صفرًا.",
          "The measure uses the same rule the voting round uses, and counts a seat as able to act only when it is bound to a real user account. What cannot be read is declared, never shown as zero.",
        )}
      </p>
    </div>
  );
}