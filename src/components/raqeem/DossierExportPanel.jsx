import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { FileText, Printer, Download, Loader2, ShieldQuestion, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// DossierExportPanel — the readable evidence dossier of a decision (evidence-dossier-1.0.0, D-091).
//
// The dossier is assembled ONCE on the server; this panel only renders what it received and offers the
// two renderings of the same assembly (Markdown to keep, printable document to file or sign). Nothing is
// recomputed here — that is how the same fact ends up printed twice with two different values. The state
// labels below mirror the contract's own three states; the server sends its label with each section.

const STATE_TONE = {
  recorded: "text-state-success-ink bg-state-success-surface",
  not_recorded: "text-state-neutral-ink bg-state-neutral-surface",
  not_read: "text-state-danger-ink bg-state-danger-surface",
};

export default function DossierExportPanel({ decision }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ loading: false, data: null, error: null });

  const load = async () => {
    if (!decision?.id) return;
    setState({ loading: true, data: null, error: null });
    try {
      const res = await base44.functions.invoke("GetDecisionDossier", { decision_id: decision.id });
      const d = res?.data || {};
      if (d.error) { setState({ loading: false, data: null, error: d.error_ar || d.error }); return; }
      setState({ loading: false, data: d, error: null });
    } catch (e) {
      const d = e?.response?.data || {};
      setState({ loading: false, data: null, error: d.error_ar || d.error || e?.message || t("تعذّر تجميع الملف.", "The dossier could not be assembled.") });
    }
  };

  const downloadMarkdown = () => {
    const blob = new Blob([state.data.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dossier-${state.data.dossier?.decision_ref?.number || decision?.id}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printDocument = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(state.data.html);
    w.document.close();
    w.focus();
  };

  return (
    <div className="raqeem-card p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">{t("ملف أدلة القرار", "Decision evidence dossier")}</h3>
            <p className="text-[11px] text-muted-foreground">
              {t(
                "يجمع مسار القرار في ملف واحد مقروء: النص المجمّد والهيئة الناخبة والأصوات والتمرير وحزمة الإصدار والتنفيذ والمحضر. وكل واقعة تحمل السجل الذي جاءت منه.",
                "The whole decision trail in one readable document: the frozen text, the electorate, the votes, the circulation, the issuance package, the execution and the minutes. Every fact names the record it came from."
              )}
            </p>
          </div>
        </div>
        {!state.data && (
          <button
            onClick={load}
            disabled={state.loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary text-primary-foreground disabled:opacity-50"
          >
            {state.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            {t("تجميع الملف", "Assemble the dossier")}
          </button>
        )}
        {state.data && (
          <div className="flex items-center gap-2">
            <button onClick={downloadMarkdown} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-foreground">
              <Download className="w-3.5 h-3.5" /> {t("تنزيل نصًّا", "Download text")}
            </button>
            <button onClick={printDocument} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-border text-foreground">
              <Printer className="w-3.5 h-3.5" /> {t("طباعة / حفظ المستند", "Print / save document")}
            </button>
          </div>
        )}
      </div>

      {state.error && (
        <div className="mt-3 rounded-md border border-destructive/30 bg-state-danger-surface p-3 flex items-start gap-2">
          <ShieldQuestion className="w-4 h-4 text-state-danger-ink shrink-0 mt-0.5" />
          <div className="text-xs text-state-danger-ink">
            <p className="font-medium">{t("لم يُجمَّع الملف", "The dossier was not assembled")}</p>
            <p>{state.error}</p>
          </div>
        </div>
      )}

      {state.data && (
        <div className="mt-3 space-y-2">
          <p className="text-[10px] text-muted-foreground font-mono">
            {state.data.contract_version} · {t("جُمع", "assembled")} {new Date(state.data.dossier.assembled_at || Date.now()).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {state.data.dossier.sections.map((s) => {
              const label = s.state_label ? (lang === "ar" ? s.state_label.ar : s.state_label.en) : s.state;
              return (
                <div key={s.key} className="rounded-md border border-border p-2">
                  <div className="text-[11px] font-semibold text-foreground truncate">{lang === "ar" ? s.title.ar : s.title.en}</div>
                  <span className={cn("inline-block mt-1 px-1.5 py-0.5 rounded text-[10px]", STATE_TONE[s.state] || STATE_TONE.not_recorded)}>{label}</span>
                  {s.state === "recorded" && <div className="text-[10px] text-muted-foreground mt-1 arabic-figures">{s.row_total} {t("واقعة", "facts")}</div>}
                </div>
              );
            })}
          </div>

          {state.data.dossier.unread_sources?.length > 0 && (
            <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface px-3 py-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-state-warning-ink shrink-0 mt-0.5" />
                <div className="text-[11px] text-state-warning-ink">
                  <p className="font-semibold">{t("مصادر لم تُقرأ — معلنة في الملف لا محذوفة", "Sources not read — named in the dossier, never dropped")}</p>
                  <ul className="mt-0.5">
                    {state.data.dossier.unread_sources.map((u) => <li key={u.source}>{u.source}: {u.reason}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-state-success-ink" />
            {t(
              "الملف خلاصة محتوى: ليس إثباتًا للصحة القانونية ولا طابعًا زمنيًا مستقلًا ولا بديلًا عن السجل، وما لا سجل له يُذكر بلفظه ولا يُحذف.",
              "The dossier is a digest of content: not proof of legal validity, not an independent timestamp, and not a substitute for the record. What has no record says so in words and is never dropped."
            )}
          </p>
        </div>
      )}
    </div>
  );
}