import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stamp, Loader2, AlertTriangle, RefreshCw, Check, Clock, Ban } from "lucide-react";

// RatificationPanel — التصديق على الناتج: مَن يُصدِّق بحسب مسار اللجنة، وأين يقف التصديق اليوم.
//
// Three states it never conflates: «لم تسجّل اللجنة مسارها» (غير محسوم) · «يقتضي ولم يُصدَّق» ·
// «انقضت المدة قبل التصديق». ولا يقع التصديق من هذه اللوحة إلا بمَن سمّته اللجنة: الخادم يتحقق
// من هوية الفاعل أو صفة مقعده، ويرفض بأسبابه المكتوبة.
const OUTCOMES = [
  { value: "ratified", ar: "تصديق", en: "Ratify" },
  { value: "refused", ar: "رفض التصديق", en: "Refuse" },
  { value: "returned", ar: "إعادة لإعادة النظر", en: "Return for reconsideration" },
];

const TONE = {
  ratified: "border-state-success-ink/30 bg-state-success-surface text-state-success-ink",
  refused: "border-destructive/30 bg-state-danger-surface text-state-danger-ink",
  returned: "border-state-warning-ink/30 bg-state-warning-surface text-state-warning-ink",
};

const ICON = { ratified: Check, refused: Ban, returned: AlertTriangle, required_awaiting: Clock, window_lapsed: Clock };

export default function RatificationPanel({ committeeId, decisionId }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState("ratified");
  const [basis, setBasis] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    if (!committeeId || !decisionId) return;
    setLoading(true); setError("");
    try {
      const res = await base44.functions.invoke("GetRatificationState", {
        committee_id: committeeId, output_type: "decision", output_id: decisionId,
      });
      const data = res?.data || {};
      if (data.error) { setError(data.message?.[lang] || data.error); setState(null); }
      else setState(data);
    } catch (e) {
      setError(t("تعذّرت قراءة حالة التصديق لهذا القرار.", "The ratification state for this decision could not be read."));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [committeeId, decisionId]);

  const record = async () => {
    setBusy(true); setResult(null);
    try {
      const res = await base44.functions.invoke("RecordRatification", {
        committee_id: committeeId, output_type: "decision", output_id: decisionId,
        outcome, instrument_basis: basis.trim(),
      });
      const data = res?.data || {};
      setResult(data.error
        ? { kind: "refused", message: data.message?.[lang] || data.error_ar || data.error, code: data.code || null }
        : { kind: "ok", message: data.late ? t("سُجّل التصديق بعد انقضاء المدة — يبقى متأخرًا.", "Recorded after the window lapsed — it stays late.") : t("سُجّل التصديق على سجل اللجنة.", "The ratification is recorded on the committee's record."), code: null });
    } catch (e) {
      const data = e?.response?.data || {};
      setResult({ kind: "refused", message: data.message?.[lang] || data.error_ar || data.error || e?.message, code: data.code || null });
    }
    setBusy(false);
    if (result?.kind !== "refused") setBasis("");
    load();
  };

  if (loading) {
    return (
      <div className="p-3 rounded-md border border-border flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("جارٍ قراءة حالة التصديق…", "Reading the ratification state…")}
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-3 rounded-md border border-destructive/30 bg-state-danger-surface text-xs text-state-danger-ink">
        {error}
        <button onClick={load} className="ms-2 underline">{t("إعادة المحاولة", "Retry")}</button>
      </div>
    );
  }
  if (!state) return null;

  const v = state.verdict || {};
  const note = state.verdict_note;
  const tone = TONE[v.state] || "border-state-neutral-ink/30 bg-state-neutral-surface text-state-neutral-ink";
  const Icon = ICON[v.state] || Stamp;
  const route = state.route;

  return (
    <div className="p-3 rounded-md border border-border space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Stamp className="w-4 h-4 text-primary shrink-0" />
        <span className="text-xs font-medium">{t("التصديق", "Ratification")}</span>
        {note && (
          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] ${tone}`}>
            <Icon className="w-3 h-3" />{lang === "ar" ? note.ar : note.en}
          </span>
        )}
      </div>

      {/* ما سجّلته اللجنة — أو عدم تسجيلها، ويُقال صراحةً ولا يُفسَّر «غير مطلوب». */}
      <div className="text-[11px] text-muted-foreground space-y-0.5">
        <p>
          {t("المسار المسجَّل:", "Recorded route:")}{" "}
          {state.route_state === "recorded"
            ? `${(route.required_for || []).join(" · ") || t("لا ناتج يقتضي تصديقًا", "no output requires ratification")}`
            : state.route_state === "not_recorded"
              ? t("لم يُسجَّل بعد", "Not recorded yet")
              : t("تعذّرت قراءته", "Could not be read")}
        </p>
        {route && (
          <>
            <p>{t("جهة التصديق:", "Authority:")} {route.authority.name || route.authority.seat_id || route.authority.role} {route.authority.external && `· ${t("خارج المنصة", "outside the platform")}`}</p>
            <p>
              {t("المدة:", "Window:")} {route.window_days ? `${route.window_days} ${t("يومًا", "days")}` : t("بلا مدة محددة", "no window stated")}
              {route.on_lapse_note ? ` · ${lang === "ar" ? route.on_lapse_note.ar : route.on_lapse_note.en}` : ""}
            </p>
            <p>{t("السند:", "Basis:")} {route.instrument_basis}</p>
          </>
        )}
        {v.window?.lapsed_at && v.state === "window_lapsed" && (
          <p className="text-state-danger-ink">{t("انقضت المدة في:", "Window lapsed at:")} {new Date(v.window.lapsed_at).toLocaleString()}</p>
        )}
        {v.state === "required_awaiting" && v.authority_name && (
          <p>{t("ينتظر:", "Awaiting:")} {v.authority_name}</p>
        )}
        {state.structural_requirements?.count > 0 && state.route_state === "not_recorded" && (
          <p className="text-state-warning-ink">
            {t("البنية تنص على تصديق ولا مسار مسجَّل:", "The structure requires ratification while no route is recorded:")} {state.structural_requirements.names.join(" · ")}
          </p>
        )}
        {state.unread_sources?.length > 0 && (
          <p className="text-state-warning-ink">{t("لم تُقرأ:", "Unread:")} {state.unread_sources.join(" · ")}</p>
        )}
      </div>

      {(state.disposition_history || []).length > 0 && (
        <div className="space-y-1">
          {state.disposition_history.map((d, i) => (
            <p key={i} className="text-[11px] text-muted-foreground">
              {new Date(d.decided_at).toLocaleString()} · {d.authority_name}{d.authority_capacity ? ` (${d.authority_capacity})` : ""}
              {d.within_window === false && ` · ${t("خارج المدة", "outside the window")}`}
            </p>
          ))}
        </div>
      )}

      {/* الفعل: يُعرض دائمًا، والرفض يُعرض بنصّه — لا يُبتلع. */}
      <div className="space-y-2 pt-1 border-t border-border">
        <div className="flex flex-wrap gap-2 pt-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setOutcome(o.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                outcome === o.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {lang === "ar" ? o.ar : o.en}
            </button>
          ))}
        </div>
        <Input
          aria-label={t("نص السند النظامي", "Instrument clause")}
          value={basis}
          onChange={(e) => setBasis(e.target.value)}
          placeholder={t("نصّ السند النظامي للتصديق (إلزامي)", "The clause the disposition rests on (required)")}
        />
        <Button size="sm" onClick={record} disabled={busy || basis.trim().length < 5}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {t("تسجيل التصديق", "Record the ratification")}
        </Button>
        {result && (
          <div className={`rounded-md border p-2 text-[11px] ${result.kind === "ok" ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink" : "border-destructive/30 bg-state-danger-surface text-state-danger-ink"}`}>
            <p className="font-medium">{result.kind === "ok" ? t("تم", "Done") : result.code || t("رُفض", "Refused")}</p>
            <p>{result.message}</p>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" />
          {t("التصديق فعله لمَن سمّته اللجنة وحدها، والوقوع خارج المدة يبقى مسجَّلًا متأخرًا ولا يُعاد تأريخه.", "Ratification belongs to the authority the committee named alone, and a late disposition stays recorded as late — never backdated.")}
        </p>
      </div>
    </div>
  );
}