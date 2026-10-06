import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { ShieldCheck, AlertTriangle, Loader2, RefreshCw, CircleSlash, Check } from "lucide-react";

// GovernanceSurfaceRegistry — G-1 on screen: every governed surface with FOUR facts (the capability that
// governs the act, the command that performs it, the contract that gates its state, and what the surface
// shows when the act is unavailable), its actor binding, its evidence status, and the register's OWN
// self-check — including the work list it declares rather than hides.

const hasCapability = (capabilities, name) => {
  if (!capabilities || !name) return false;
  if (Array.isArray(capabilities)) return capabilities.includes(name);
  if (typeof capabilities === "object") {
    if (capabilities[name] === true) return true;
    const list = capabilities.permitted || capabilities.capabilities || capabilities.allowed;
    return Array.isArray(list) ? list.includes(name) : false;
  }
  return false;
};

export default function GovernanceSurfaceRegistry() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("governance-surfaces");
  const [registry, setRegistry] = useState(null);
  const [capabilities, setCapabilities] = useState(null);
  const [role, setRole] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (committeeId) => {
    if (!committeeId) return;
    setLoading(true);
    setError("");
    try {
      const [reg, caps] = await Promise.all([
        base44.functions.invoke("GetGovernanceSurfaces", { committee_id: committeeId }),
        base44.functions.invoke("GetCommitteeCapabilities", { committee_id: committeeId }).catch(() => null),
      ]);
      const r = reg?.data || {};
      if (r.error) { setError(lang === "ar" ? r.error_ar || r.error : r.error); setRegistry(null); }
      else setRegistry(r);
      const c = caps?.data || {};
      setCapabilities(c.error ? null : (c.capabilities ?? null));
      setRole(c.error ? null : (c.role || null));
    } catch (e) {
      const d = e?.response?.data || {};
      setError((lang === "ar" ? d.error_ar : d.error) || d.error || e?.message || t("تعذّرت قراءة سجل الأسطح.", "The register could not be read."));
      setRegistry(null);
    }
    setLoading(false);
  };

  useEffect(() => { if (data?.committee?.id) load(data.committee.id); }, [data?.committee?.id]);

  if (!data) return <TableSkeleton rows={4} />;

  const summary = registry?.summary;
  const audit = registry?.registry_audit;
  const surfaces = registry?.surfaces || [];
  const stages = registry?.stages || [];

  const rowsFor = (stageKey) => surfaces.filter((s) => s.stage === stageKey);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ShieldCheck}
        title={getTitle("سجل الأسطح المحكومة", "Governed Surface Registry", lang)}
        subtitle={lang === "ar"
          ? "كل سطح محكوم بأربع وقائع: الحق الذي يحكمه، الأمر الذي ينفّذه، العقد الذي يقيّد حالته، وما يعرضه عند تعذّر الفعل."
          : "Every governed surface with four facts: the right that governs it, the command that performs it, the contract that gates its state, and what it shows when the act is unavailable."}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => load(data.committee.id)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {t("تحديث السجل", "Refresh the register")}
        </button>
        {registry?.contract_version && <span className="text-[11px] text-muted-foreground font-mono">{registry.contract_version}</span>}
        {role && <span className="text-[11px] text-muted-foreground">{t("تتصرف بصفتك:", "Acting as:")} {role}</span>}
      </div>

      {error && <div className="raqeem-card p-4 text-xs text-state-danger-ink bg-state-danger-surface">{error}</div>}

      {summary && (
        <div className="raqeem-card p-4 space-y-2">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>{t("الأسطح", "Surfaces")}: <strong>{summary.total}</strong></span>
            <span>{t("أفعال", "Acts")}: <strong>{summary.acts}</strong></span>
            <span>{t("قراءات", "Views")}: <strong>{summary.views}</strong></span>
            <span>{t("مقيَّدة بحالة", "State-gated")}: <strong>{summary.state_gated}</strong></span>
            <span>{t("مسار محفوظ", "Recorded path")}: <strong>{summary.recorded_paths}</strong></span>
            <span>{t("بانتظار فاعل مُقعد", "Awaiting seated actor")}: <strong>{summary.blocked_awaiting_seated_actor?.length || 0}</strong></span>
          </div>
          <div className="flex flex-wrap gap-2">
            {stages.map((s) => (
              <span key={s.key} className="text-[11px] px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                {lang === "ar" ? s.ar : s.en}: {s.count}
              </span>
            ))}
          </div>
          {audit && (
            <div className={`rounded-md px-3 py-2 text-xs ${audit.ok ? "bg-state-success-surface text-state-success-ink" : "bg-state-warning-surface text-state-warning-ink"}`}>
              <span className="inline-flex items-center gap-1.5 font-semibold">
                {audit.ok ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {audit.ok ? t("الفحص الداخلي للسجل: نظيف", "The register's own check: clean") : t("الفحص الداخلي للسجل: ملاحظات", "The register's own check: findings")}
              </span>
              <p className="mt-0.5">{lang === "ar" ? audit.note_ar : audit.note_en}</p>
              <p className="mt-1">
                {t("موانع", "Blocking")}: {audit.blocking?.length || 0} · {t("قائمة عمل معلنة", "Declared work list")}: {audit.declared_work?.length || 0}
              </p>
            </div>
          )}
        </div>
      )}

      {summary?.unverified_capabilities?.length > 0 && (
        <div className="raqeem-card p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t("قائمة العمل المعلنة: حقوق لم يُعد اشتقاقها في هذه الجولة", "Declared work list: capabilities not re-derived in this pass")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {summary.unverified_capabilities.map((u) => (
              <span key={u.id} className="text-[11px] px-2 py-0.5 rounded-md bg-state-warning-surface text-state-warning-ink font-mono">{u.command}</span>
            ))}
          </div>
        </div>
      )}

      {stages.map((stage) => {
        const rows = rowsFor(stage.key);
        if (rows.length === 0) return null;
        return (
          <div key={stage.key} className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{lang === "ar" ? stage.ar : stage.en}</h3>
            {rows.map((s) => {
              const available = s.capability === "none" || hasCapability(capabilities, s.capability);
              return (
                <div key={s.id} className="raqeem-card p-3 space-y-1.5">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium">{lang === "ar" ? s.ar : s.en}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded inline-flex items-center gap-1 ${available ? "bg-state-success-surface text-state-success-ink" : "bg-state-neutral-surface text-state-neutral-ink"}`}>
                      {available ? <Check className="w-3 h-3" /> : <CircleSlash className="w-3 h-3" />}
                      {s.kind === "view"
                        ? (available ? t("قراءة متاحة", "Read available") : t("قراءة غير متاحة", "Read unavailable"))
                        : (available ? t("الفعل متاح لك", "The act is available to you") : t("الفعل غير متاح لك", "The act is not available to you"))}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{t("الحق", "Right")}: <span className="font-mono text-foreground">{s.capability}</span>{s.capability_source === "unverified" ? ` (${t("لم يُعد اشتقاقه", "not re-derived")})` : ""}</span>
                    <span>{t("الأمر", "Command")}: <span className="font-mono text-foreground">{s.command}</span></span>
                    {s.contract && <span>{t("العقد", "Contract")}: <span className="font-mono text-foreground">{s.contract}</span></span>}
                    {s.gated && s.state_from && <span>{t("الحالة المقبولة", "Permitted state")}: <span className="font-mono text-foreground">{s.state_from}</span></span>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{t("ربط الفاعل", "Actor binding")}: {lang === "ar" ? s.actor_binding_text?.ar : s.actor_binding_text?.en}{s.bound_field ? ` — ${s.bound_field}` : ""}</span>
                    <span>· {t("الدليل", "Evidence")}: {lang === "ar" ? s.evidence_text?.ar : s.evidence_text?.en}{s.suite ? ` (${s.suite})` : ""}</span>
                    {s.recorded_path
                      ? <span>· {t("مسار محفوظ", "Recorded path")}: <span className="font-mono">{s.recorded_path_evidence}</span></span>
                      : <span>· {t("بانتظار فاعل مُقعد مُصادَق", "Awaiting an authorized seated actor")}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground border-t border-border pt-1.5">
                    {t("عند تعذّر الفعل:", "When the act is unavailable:")} {lang === "ar" ? s.unavailable_text?.ar : s.unavailable_text?.en}
                  </p>
                  {(s.note_ar || s.note_en) && (
                    <p className="text-[11px] text-muted-foreground">{lang === "ar" ? s.note_ar : s.note_en}</p>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}

      {registry?.honesty_note && (
        <p className="text-[11px] text-muted-foreground">{lang === "ar" ? registry.honesty_note.ar : registry.honesty_note.en}</p>
      )}
      {registry?.no_surface_acts_alone && (
        <p className="text-[11px] text-muted-foreground">{lang === "ar" ? registry.no_surface_acts_alone.ar : registry.no_surface_acts_alone.en}</p>
      )}
    </div>
  );
}