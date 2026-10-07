import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Archive, Loader2, AlertTriangle, RefreshCw, Check } from "lucide-react";

// RetentionPanel — جدول الاحتفاظ: قرار المؤسسة لكل صنف مواد، وما يعنيه اليوم.
//
// This panel never disposes of anything: it records the institution's rule and shows, per class, what
// that rule means today — including the classes where the institution has not decided yet, which read
// "unresolved" and never "permanent" or "disposable". A standing legal hold stops the disposition.
const BASIS = [
  { value: "years", ar: "مدة محددة", en: "A stated period" },
  { value: "permanent", ar: "احتفاظ دائم", en: "Permanent" },
];

const TONE = {
  permanent: "border-state-neutral-ink/30 bg-state-neutral-surface text-state-neutral-ink",
  within_period: "border-state-info-ink/30 bg-state-info-surface text-state-info-ink",
  eligible_for_review: "border-state-warning-ink/30 bg-state-warning-surface text-state-warning-ink",
  held: "border-destructive/30 bg-state-danger-surface text-state-danger-ink",
  unresolved_no_rule: "border-state-warning-ink/30 bg-state-warning-surface text-state-warning-ink",
};

export default function RetentionPanel({ committeeId }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ record_class: "", basis: "years", retention_years: "", disposal_authority: "", instrument_basis: "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    if (!committeeId) return;
    setLoading(true); setError("");
    try {
      const res = await base44.functions.invoke("GetRetentionState", { committee_id: committeeId });
      const data = res?.data || {};
      if (data.error) { setError(data.message?.[lang] || data.error); setState(null); }
      else {
        setState(data);
        if (!form.record_class) {
          const first = (data.unresolved_classes || [])[0] || (data.classes || [])[0]?.record_class || "";
          setForm((f) => ({ ...f, record_class: first }));
        }
      }
    } catch (e) {
      setError(t("تعذّرت قراءة جدول الاحتفاظ لهذه اللجنة.", "The retention schedule for this committee could not be read."));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [committeeId]);

  const save = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await base44.functions.invoke("SetRetentionRule", {
        committee_id: committeeId,
        rule: {
          record_class: form.record_class,
          basis: form.basis,
          retention_years: form.basis === "years" ? Number(form.retention_years) : undefined,
          disposal_authority: form.disposal_authority.trim(),
          instrument_basis: form.instrument_basis.trim(),
        },
      });
      const data = res?.data || {};
      setResult(data.error
        ? { kind: "refused", message: data.message?.[lang] || data.error_ar || data.error, code: data.code || null }
        : { kind: "ok", message: t("سُجّل جدول الاحتفاظ لهذا الصنف.", "The retention rule for this class is recorded."), code: null });
    } catch (e) {
      const data = e?.response?.data || {};
      setResult({ kind: "refused", message: data.message?.[lang] || data.error_ar || data.error || e?.message, code: data.code || null });
    }
    setBusy(false);
    load();
  };

  if (loading) {
    return (
      <div className="raqeem-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> {t("جارٍ قراءة جدول الاحتفاظ…", "Reading the retention schedule…")}
      </div>
    );
  }

  const classes = state?.classes || [];

  return (
    <div className="raqeem-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Archive className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading font-semibold text-sm">{t("مدة الاحتفاظ والإتلاف", "Retention and disposal")}</h3>
          <p className="text-xs text-muted-foreground mt-1">{lang === "ar" ? state?.no_deletion?.ar : state?.no_deletion?.en}</p>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="space-y-2">
        {classes.map((c) => (
          <div key={c.record_class} className="rounded-md border border-border p-3 space-y-1">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-medium">{lang === "ar" ? c.label.ar : c.label.en}</span>
              <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] ${TONE[c.state] || "border-border bg-secondary/40"}`}>
                {lang === "ar" ? c.state_note?.ar : c.state_note?.en}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <p>
                {t("القاعدة:", "Rule:")}{" "}
                {c.rule
                  ? `${c.rule.basis === "permanent" ? t("احتفاظ دائم", "permanent") : `${c.rule.retention_years} ${t("سنوات", "years")}`} · ${c.rule.disposal_authority}${c.rule.recorded_by_name ? ` · ${c.rule.recorded_by_name}` : ""}`
                  : t("غير مسجَّلة — قرار المؤسسة قائم", "not recorded — the institution's decision stands open")}
              </p>
              <p>
                {t("المواد:", "Material:")}{" "}
                {c.materials.read
                  ? `${c.materials.count ?? "—"}${c.materials.oldest_at ? ` · ${t("أقدم مادة", "oldest")}: ${new Date(c.materials.oldest_at).toLocaleDateString()}` : ""}`
                  : t("لم تُقرأ", "could not be read")}
                <span className="ms-1 opacity-70">({c.count_scope})</span>
              </p>
              {c.eligible_since && <p>{t("استحقت الإجراء في:", "Eligible since:")} {new Date(c.eligible_since).toLocaleDateString()}</p>}
              {c.rule?.instrument_basis && <p>{t("السند:", "Basis:")} {c.rule.instrument_basis}</p>}
              {(c.holes?.oldest_not_read || c.holes?.material_not_read) && (
                <p className="text-state-warning-ink">{t("أقدم مادة لم تُقرأ، فلا يُدَّعى انقضاء مدة ولا بقاؤها.", "The oldest material was not read, so neither an elapsed nor a running period is claimed.")}</p>
              )}
            </div>
          </div>
        ))}
        {classes.length === 0 && <p className="text-xs text-muted-foreground">{t("لا أصناف معلنة.", "No classes declared.")}</p>}
      </div>

      {state?.holds?.count > 0 && (
        <p className="text-[11px] text-state-danger-ink bg-state-danger-surface rounded-md px-2 py-1 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          {t(`حجز قانوني قائم على ${state.holds.count} التزامًا: الحجز يمنع الإجراء ولا يُرفع من تلقاء نفسه.`, `A legal hold stands over ${state.holds.count} obligation(s): the hold stops the disposition and never lapses by itself.`)}
        </p>
      )}
      {(state?.unread_sources || []).length > 0 && (
        <p className="text-[11px] text-state-warning-ink">{t("لم تُقرأ:", "Unread:")} {state.unread_sources.join(" · ")}</p>
      )}

      <div className="space-y-2 pt-2 border-t border-border">
        <Label className="text-xs">{t("تسجيل قاعدة الاحتفاظ لصنف", "Record a rule for a class")}</Label>
        <div className="grid sm:grid-cols-2 gap-2">
          <select
            aria-label={t("صنف المواد", "Material class")}
            className="w-full h-9 rounded-md border border-input px-3 text-sm bg-transparent"
            value={form.record_class}
            onChange={(e) => setForm((f) => ({ ...f, record_class: e.target.value }))}
          >
            {classes.map((c) => <option key={c.record_class} value={c.record_class}>{lang === "ar" ? c.label.ar : c.label.en}</option>)}
          </select>
          <select
            aria-label={t("أساس المدة", "Basis")}
            className="w-full h-9 rounded-md border border-input px-3 text-sm bg-transparent"
            value={form.basis}
            onChange={(e) => setForm((f) => ({ ...f, basis: e.target.value }))}
          >
            {BASIS.map((b) => <option key={b.value} value={b.value}>{lang === "ar" ? b.ar : b.en}</option>)}
          </select>
          {form.basis === "years" && (
            <Input
              aria-label={t("المدة بالسنوات", "Period in years")} type="number" min="1"
              value={form.retention_years} onChange={(e) => setForm((f) => ({ ...f, retention_years: e.target.value }))}
              placeholder={t("المدة بالسنوات", "Period in years")}
            />
          )}
          <Input
            aria-label={t("الجهة المختصة بالإجراء", "Competent authority")}
            value={form.disposal_authority} onChange={(e) => setForm((f) => ({ ...f, disposal_authority: e.target.value }))}
            placeholder={t("الجهة المختصة بالإجراء", "Competent authority")}
          />
          <Input
            aria-label={t("نص السند النظامي", "Instrument clause")}
            value={form.instrument_basis} onChange={(e) => setForm((f) => ({ ...f, instrument_basis: e.target.value }))}
            placeholder={t("نصّ السند النظامي (إلزامي)", "The instrument clause (required)")}
          />
        </div>
        <Button size="sm" onClick={save} disabled={busy || !form.record_class || !form.disposal_authority.trim() || form.instrument_basis.trim().length < 5 || (form.basis === "years" && !Number(form.retention_years))}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t("حفظ على سجل اللجنة", "Save to the committee's record")}
        </Button>
        {result && (
          <div className={`rounded-md border p-2 text-[11px] ${result.kind === "ok" ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink" : "border-destructive/30 bg-state-danger-surface text-state-danger-ink"}`}>
            <p className="font-medium">{result.kind === "ok" ? t("تم", "Done") : result.code || t("رُفض", "Refused")}</p>
            <p>{result.message}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> {t("إعادة القراءة", "Read again")}</Button>
          <p className="text-[11px] text-muted-foreground">
            {t("لا يُتلف هذا البناء سجلًا: القاعدة تحدّد ما يُعرض على قرار المؤسسة، والسجل يبقى.", "This build erases no record: the rule decides what is presented to the institution's decision, and the record stays.")}
          </p>
        </div>
      </div>
    </div>
  );
}