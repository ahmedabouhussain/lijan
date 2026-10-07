import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Search, Loader2, Info, AlertTriangle, ShieldAlert, Wrench } from "lucide-react";

// The exception register, read from the server (exception-catalogue-1.0.0).
//
// When an act refuses, a person needs three answers: what was prevented, what stops, and who resolves
// it — plus the rule that keeps a refusal honest: what may NEVER be assumed while it stands. The panel
// prints the register's own wording; it never re-writes it, and it decides nothing.

const CLASS_TONE = {
  refusal: "border-destructive/30 bg-state-danger-surface text-state-danger-ink",
  unresolved: "border-state-warning-ink/30 bg-state-warning-surface text-state-warning-ink",
  integrity: "border-state-danger-ink/30 bg-state-danger-surface text-state-danger-ink",
  boundary: "border-border bg-secondary/30 text-foreground",
  degraded: "border-state-warning-ink/30 bg-state-warning-surface text-state-warning-ink",
  quarantine: "border-state-ceremonial-ink/30 bg-state-ceremonial-surface text-state-ceremonial-ink",
};

export default function ExceptionCataloguePanel({ committeeId }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [query, setQuery] = useState("");

  const load = async () => {
    if (!committeeId) return;
    setState({ loading: true, data: null, error: null });
    try {
      const res = await base44.functions.invoke("GetExceptionCatalogue", { committee_id: committeeId });
      const d = res?.data || {};
      if (d.error) setState({ loading: false, data: null, error: d.message?.[lang] || d.error });
      else setState({ loading: false, data: d, error: null });
    } catch (e) {
      const d = e?.response?.data || {};
      setState({ loading: false, data: null, error: d.message?.[lang] || d.error || e?.message || t("تعذّرت قراءة سجل الاستثناءات.", "The exception register could not be read.") });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [committeeId]);

  const entries = state.data?.entries || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => `${e.code} ${e.contract} ${e.emitted_by} ${e.ar} ${e.en}`.toLowerCase().includes(q));
  }, [entries, query]);

  const audit = state.data?.contract_check;

  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("سجل الاستثناءات", "Exception register")}</h3>
        {state.data?.summary && (
          <span className="text-[11px] text-muted-foreground">
            {t(`${state.data.summary.total} استثناءً من ${state.data.summary.contracts} عقدًا`, `${state.data.summary.total} exceptions across ${state.data.summary.contracts} contracts`)}
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {t(
          "كل توقّف في المنصة له هنا: ما الذي مُنع · ماذا يتوقف بالضبط · مَن يحلّه · وما لا يجوز استنتاجه وهو قائم. السجل يُعلن ولا يقرّر، ولا يحلّ استثناءً بنفسه.",
          "Every stop in the platform is here: what was prevented · what exactly stops · who resolves it · and what may never be assumed while it stands. The register declares and never decides, and it resolves no exception itself."
        )}
      </p>

      <div className="flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("ابحث برمز أو عقد أو نص…", "Search by code, contract or wording…")}
          className="w-full px-3 py-1.5 rounded-md border border-input bg-transparent text-xs"
        />
      </div>

      {state.loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("جارٍ القراءة…", "Reading…")}
        </div>
      )}

      {state.error && (
        <div className="p-3 rounded-md border border-destructive/30 bg-state-danger-surface text-xs text-state-danger-ink flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      {!state.loading && !state.error && (
        <div className="space-y-2 max-h-[28rem] overflow-y-auto pe-1">
          {filtered.map((e) => (
            <div key={`${e.code}-${e.contract}`} className={`rounded border p-2.5 text-[11px] ${CLASS_TONE[e.class] || "border-border"}`}>
              <p className="font-medium flex items-center gap-2 flex-wrap">
                <span className="font-mono">{e.code}</span>
                <span className="opacity-80">· {lang === "ar" ? e.class_text?.ar : e.class_text?.en}</span>
              </p>
              <p className="mt-1 text-foreground">{lang === "ar" ? e.ar : e.en}</p>
              <p className="mt-1 text-muted-foreground">
                <span className="font-mono">{e.contract}</span> · {e.emitted_by}
                {" · "}
                {e.stops === "act" ? t("يتوقف الفعل", "the act stops") : e.stops === "read" ? t("تتوقف القراءة", "the read stops") : t("يتوقف الفعل المتأثر وحده", "only the affected act stops")}
              </p>
              <p className="mt-1 flex items-start gap-1.5 text-foreground">
                <Wrench className="w-3 h-3 shrink-0 mt-0.5" />
                {lang === "ar" ? e.resolution_text?.ar : e.resolution_text?.en}
              </p>
              <p className="mt-1 text-state-warning-ink">
                {t("ما لا يجوز استنتاجه:", "What may never be assumed:")} {lang === "ar" ? e.never_assume_ar : e.never_assume_en}
              </p>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground">{t("لا سجل يوافق البحث.", "No register entry matches the search.")}</p>
          )}
        </div>
      )}

      {state.data?.declared_gaps?.length > 0 && (
        <div className="rounded border border-border bg-secondary/30 p-2.5 text-[11px] space-y-1">
          <p className="font-medium">{t("ما لا يغطيه هذا السجل:", "What this register does not cover:")}</p>
          {state.data.declared_gaps.map((g, i) => (
            <p key={i} className="text-muted-foreground">{lang === "ar" ? g.ar : g.en}</p>
          ))}
        </div>
      )}

      {audit && (
        <p className="text-[10px] text-muted-foreground flex items-start gap-1.5">
          <Info className="w-3 h-3 shrink-0 mt-0.5" />
          {lang === "ar" ? state.data?.note_ar : state.data?.note_en}
          {" · "}
          {t(
            `فحص السجل: ${audit.ok ? "سليم" : "بملاحظات"} · مصادر مُشتقّة مقارَنة: ${(state.data?.derived_sources || []).length} (${(state.data?.derived_sources || []).map((s) => `${s.map}: ${s.codes}`).join(" · ")})`,
            `Register check: ${audit.ok ? "sound" : "with findings"} · derived compared sources: ${(state.data?.derived_sources || []).length} (${(state.data?.derived_sources || []).map((s) => `${s.map}: ${s.codes}`).join(" · ")})`
          )}
        </p>
      )}
    </div>
  );
}