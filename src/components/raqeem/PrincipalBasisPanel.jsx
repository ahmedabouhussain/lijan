import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Users, Loader2, AlertTriangle, RefreshCw, Check } from "lucide-react";

// PrincipalBasisPanel — "من يصوّت عند تعدد المقاعد" على قواعد الحوكمة.
//
// The one institutional fact the platform refuses to assume: when one person holds more than one
// voting seat, does that person carry two votes or one? The panel states what is recorded, what the
// record means for THIS committee right now (seats · voters · who holds more than one seat · whether
// the committee's own quorum is reachable), and records the choice under the committee-management
// right — never inline in a round.
const BASIS_OPTIONS = [
  { value: "per_person", ar: "صوت واحد للشخص", en: "One vote per person" },
  { value: "per_seat", ar: "صوت لكل مقعد", en: "One vote per seat" },
];

export default function PrincipalBasisPanel({ committeeId }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [basis, setBasis] = useState(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  const load = async () => {
    if (!committeeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetPrincipalBasis", { committee_id: committeeId });
      const data = res?.data || {};
      if (data.error) {
        setError(data.message?.[lang] || data.error);
        setState(null);
      } else {
        setState(data);
        setBasis(data.recorded?.basis || null);
        setReference(data.recorded?.basis_reference || "");
      }
    } catch (e) {
      setError(t("تعذّر قراءة أساس التصويت لهذه اللجنة.", "The voting basis for this committee could not be read."));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [committeeId]);

  const save = async () => {
    if (!basis) return;
    setBusy(true);
    setOutcome(null);
    try {
      const res = await base44.functions.invoke("SetPrincipalBasis", {
        committee_id: committeeId, basis, basis_reference: reference || null,
      });
      const data = res?.data || {};
      if (data.error) {
        setOutcome({ kind: "refused", message: data.message?.[lang] || data.error, code: data.code || null });
      } else {
        setOutcome({ kind: "ok", message: t("سُجّل الأساس على سجل اللجنة.", "The basis is recorded on the committee's record.") });
      }
    } catch (e) {
      const data = e?.response?.data || {};
      setOutcome({ kind: "refused", message: data.message?.[lang] || data.error || e?.message, code: data.code || null });
    }
    setBusy(false);
    load();
  };

  if (loading) {
    return (
      <div className="raqeem-card p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> {t("جارٍ قراءة أساس التصويت…", "Reading the voting basis…")}
      </div>
    );
  }

  const a = state?.assessment;
  const refusal = a?.refusal;
  const principals = (a?.multi_seat_principals || []);

  return (
    <div className="raqeem-card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Scale className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading font-semibold text-sm">{t("من يصوّت عند تعدد المقاعد", "Who votes when one person holds more than one seat")}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              "المقاعد وحدة الأهلية، والأشخاص وحدة القدرة على التصويت. أما هل يحمل الشخص الواحد ذو المقعدين صوتين أم صوتًا واحدًا، فهذا قرار المؤسسة — ولا تفترضه المنصة. وما دام غير مسجَّل، يتوقف فتح التصويت وإرسال دورة التمرير في هذه اللجنة.",
              "Seats are the unit of eligibility and persons the unit of capacity. Whether one person holding two seats carries two votes or one is the institution's own decision — the platform never assumes it, and until it is recorded this committee cannot open a vote or dispatch a written resolution.",
            )}
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-md bg-secondary/40 border border-border">
          <p className="text-muted-foreground">{t("الأساس المسجَّل", "Recorded basis")}</p>
          <p className="text-foreground font-medium mt-0.5">
            {state?.recorded?.basis
              ? (BASIS_OPTIONS.find((o) => o.value === state.recorded.basis)?.[lang === "ar" ? "ar" : "en"] || state.recorded.basis)
              : t("غير مسجَّل بعد", "Not recorded yet")}
          </p>
          {state?.recorded?.basis_reference && <p className="text-muted-foreground mt-0.5">{state.recorded.basis_reference}</p>}
          {state?.recorded?.recorded_by_name && (
            <p className="text-muted-foreground mt-0.5">{t("سجّله:", "Recorded by:")} {state.recorded.recorded_by_name}</p>
          )}
        </div>
        <div className="p-3 rounded-md bg-secondary/40 border border-border space-y-1">
          <p className="text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {t("أثر الأساس اليوم", "What the basis means today")}</p>
          {a ? (
            <>
              <p>{t("مقاعد مؤهلة:", "Eligible seats:")} {a.eligible_seat_count} · {t("أصوات:", "Votes:")} {a.voter_count}</p>
              <p>{t("النصاب المطلوب:", "Quorum required:")} {a.quorum_required ?? "—"} {a.quorum_reachable === false && `· ${t("غير قابل للبلوغ", "unreachable")}`}</p>
              {principals.length > 0 && (
                <p className="text-foreground">
                  {t("يحمل أكثر من مقعد:", "Holds more than one seat:")} {principals.map((p) => `${p.name || p.user_id} (${p.seat_count})`).join("، ")}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{t("مصدر غير مقروء — القياس غير مكتمل.", "A source could not be read, so the measure is incomplete.")}</p>
          )}
          {(state?.unread_sources || []).length > 0 && (
            <p className="text-state-warning-ink">{t("لم تُقرأ:", "Unread:")} {state.unread_sources.join(" · ")}</p>
          )}
        </div>
      </div>

      {refusal && (
        <div className="rounded-md border border-state-warning-ink/30 bg-state-warning-surface text-state-warning-ink p-3 flex items-start gap-2 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{refusal.code}</p>
            <p>{lang === "ar" ? refusal.ar : refusal.en}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-xs">{t("تسجيل الأساس", "Record the basis")}</Label>
        <div className="flex flex-wrap gap-2">
          {BASIS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setBasis(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                basis === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "ar" ? opt.ar : opt.en}
            </button>
          ))}
        </div>
        <div>
          <Label className="text-xs" htmlFor="basis-reference">{t("سند القرار (بند النظام أو القرار)", "The basis it rests on (instrument clause or decision)")}</Label>
          <Input
            id="basis-reference"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder={t("مثال: المادة 7 من لائحة اللجنة", "e.g. article 7 of the committee's instrument")}
            className="mt-1 text-sm"
          />
        </div>
        <Button onClick={save} disabled={busy || !basis} size="sm">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t("حفظ على سجل اللجنة", "Save to the committee's record")}
        </Button>
      </div>

      {outcome && (
        <div className={`rounded-md border p-3 text-xs ${outcome.kind === "ok" ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink" : "border-destructive/30 bg-state-danger-surface text-state-danger-ink"}`}>
          <p className="font-medium">{outcome.kind === "ok" ? t("تم", "Done") : outcome.code || t("رُفض", "Refused")}</p>
          <p>{outcome.message}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-4 h-4" /> {t("إعادة القراءة", "Read again")}</Button>
        <p className="text-[11px] text-muted-foreground">
          {t("التسجيل يقع بحق إدارة اللجنة، ولا يُكتب داخل دورة ولا يُفترض عند الفتح.", "The record is written under the committee-management right, never inline in a round and never assumed when a round opens.")}
        </p>
      </div>
    </div>
  );
}