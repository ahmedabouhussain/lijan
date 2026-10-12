import React, { useEffect, useState } from "react";
import { Cpu, ShieldCheck, RefreshCw, AlertTriangle, Loader2, Info, ChevronDown, ChevronUp, Scale } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

// AISystemInventoryPanel — سجل أنظمة الذكاء الاصطناعي وتقييم أثرها (ISO 42001 §6.1.2/§8.3 · EU AI Act).
// كل نظام في الخدمة: غرضه، نموذجه، فئة مخاطره، حالات استخدامه المصرّح بها، ومصادر بياناته — مع
// تقييم الأثر الأربعة الأسئلة (المتأثرون، المخاطر، التدابير، أساس الإشراف البشري). لا حذف صامت:
// النظام المُحال يُحفظ لأن مخرجاته في AIOutputLedger تحتفظ بمصدرها.

const TONE_BADGE = {
  high_risk: "border-state-warning-ink/40 bg-state-warning-surface text-state-warning-ink",
  limited_risk: "border-state-progress-ink/40 bg-state-progress-surface text-state-progress-ink",
  minimal_risk: "border-state-info-ink/40 bg-state-info-surface text-state-info-ink",
};

const STATUS_TONE = {
  draft: "bg-state-neutral-surface text-state-neutral-ink",
  under_review: "bg-state-progress-surface text-state-progress-ink",
  approved: "bg-state-success-surface text-state-success-ink",
  retired: "bg-state-info-surface text-state-info-ink",
};

export default function AISystemInventoryPanel({ committeeId }) {
  const { t, lang } = useLanguage();
  const [systems, setSystems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke("GetAISystems", { committee_id: committeeId });
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setSystems([]); }
      else setSystems(d.systems || []);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر قراءة السجل", "Could not read the register"));
      setSystems([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [committeeId]);

  return (
    <section className="raqeem-card p-4 sm:p-5 space-y-3" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 ring-1 ring-primary/15">
            <Cpu className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">{t("سجل أنظمة الذكاء وتقييم أثرها", "AI Systems Register & Impact Assessment")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("كل نظام ذكاء قيد الاستخدام: غرضه، فئة مخاطره، استخداماته المصرّح بها، وتقييم أثره — ISO 42001 §6.1.2/§8.3 · EU AI Act.", "Every AI system in use: its purpose, risk tier, approved use cases, and impact assessment — ISO 42001 §6.1.2/§8.3 · EU AI Act.")}
            </p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary disabled:opacity-50">
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          <span className="hidden sm:inline">{t("تحديث", "Refresh")}</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> {t("جارٍ قراءة السجل…", "Reading the register…")}
        </div>
      )}

      {error && !loading && (
        <div className="rounded-md border border-state-danger-ink/30 bg-state-danger-surface px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-state-danger-ink shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-state-danger-ink">{error}</div>
        </div>
      )}

      {!loading && !error && systems.length === 0 && (
        <div className="rounded-md border border-border bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
          {t("لا أنظمة ذكاء مُسجَّلة على هذه اللجنة بعد. أي نظام يُولّد مخرجات يجب أن يُسجّل هنا أولًا.", "No AI systems registered on this committee yet. Any system that generates outputs must be registered here first.")}
        </div>
      )}

      {!loading && !error && systems.length > 0 && (
        <ul className="space-y-2">
          {systems.map((s) => {
            const open = expanded[s.id];
            return (
              <li key={s.id} className="rounded-md border border-border px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [s.id]: !p[s.id] }))}
                  className="flex items-center justify-between gap-2 w-full text-start"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate">
                      {lang === "ar" ? s.system_name : (s.system_name_en || s.system_name)}
                    </span>
                    {s.risk_tier_label && (
                      <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border", TONE_BADGE[s.risk_tier] || "border-border bg-card")}>
                        <ShieldCheck className="w-2.5 h-2.5" />
                        {lang === "ar" ? s.risk_tier_label.ar : s.risk_tier_label.en}
                      </span>
                    )}
                    {s.status_label && (
                      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium", STATUS_TONE[s.status] || "bg-card")}>
                        {lang === "ar" ? s.status_label.ar : s.status_label.en}
                      </span>
                    )}
                  </div>
                  {open ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>

                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  {lang === "ar" ? s.purpose : (s.purpose_en || s.purpose)}
                </p>

                <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span>{t("النموذج", "Model")}: <span className="text-foreground">{s.model_used}</span></span>
                  <span>·</span>
                  <span>{t("استخدامات مصرّح بها", "Approved uses")}: <span className="text-foreground">{s.approved_use_cases.length}</span></span>
                  <span>·</span>
                  <span>{t("مصادر بيانات", "Data sources")}: <span className="text-foreground">{s.data_sources.length}</span></span>
                </div>

                {open && (
                  <div className="mt-2.5 pt-2.5 border-t border-border space-y-2">
                    <div className="flex items-start gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">{s.standard_reference}</p>
                    </div>

                    <ImpactField label={t("المتأثرون", "Affected parties")} value={s.affected_parties} lang={lang} />
                    <ImpactField label={t("المخاطر المُحدَّدة", "Identified risks")} value={s.identified_risks} lang={lang} />
                    <ImpactField label={t("التدابير المُتخذة", "Mitigation measures")} value={s.mitigation_measures} lang={lang} />
                    <ImpactField label={t("أساس الإشراف البشري", "Human oversight basis")} value={s.human_oversight_basis} lang={lang} />

                    {s.approved_use_cases.length > 0 && (
                      <div className="flex items-start gap-1.5">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="text-[11px]">
                          <span className="text-muted-foreground">{t("حالات الاستخدام", "Use cases")}: </span>
                          <span className="text-foreground">{s.approved_use_cases.join(" · ")}</span>
                        </div>
                      </div>
                    )}

                    {s.approved_by_name && (
                      <div className="text-[10px] text-muted-foreground border-t border-border pt-1.5">
                        {t("اعتُمد بواسطة", "Approved by")} {s.approved_by_name}
                        {s.approved_at && ` · ${new Date(s.approved_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}`}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function ImpactField({ label, value, lang }) {
  if (!value) return null;
  return (
    <div className="text-[11px]">
      <span className="text-muted-foreground font-medium">{label}: </span>
      <span className="text-foreground leading-relaxed">{value}</span>
    </div>
  );
}