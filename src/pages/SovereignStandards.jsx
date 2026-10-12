import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, ShieldCheck, RefreshCw, AlertTriangle, ExternalLink,
  CheckCircle2, AlertCircle, Info, Building2, FileCheck2, BookOpen,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import { cn } from "@/lib/utils";

// SovereignStandards — سجل المعايير السيادية: الإثبات الذي يطلبه مراجعو الحوكمة الوطنيون.
// يُعلن، لكل معيار دولي، ما تفعله المنصة، والدليل، والجهة المالكة، والحالة.
// ما هو جزئي أو مخطّط يُعلن حدّه صراحةً — لا يُدَّعى امتثال بلا دليل.

const STATUS_ICON = {
  adhered: CheckCircle2,
  partial: AlertCircle,
  planned: Info,
};

const STATUS_TONE = {
  adhered: "border-state-success-ink/40 bg-state-success-surface text-state-success-ink",
  partial: "border-state-warning-ink/40 bg-state-warning-surface text-state-warning-ink",
  planned: "border-state-info-ink/40 bg-state-info-surface text-state-info-ink",
};

export default function SovereignStandards() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openStd, setOpenStd] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const res = await base44.functions.invoke("GetSovereignStandards", {});
      const d = res?.data || res;
      if (d?.error) { setError(d.error); setData(null); }
      else { setData(d); setOpenStd(d.standards?.[0]?.id || null); }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("تعذّر تحميل سجل المعايير", "Could not load the standards register"));
      setData(null);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const summary = data?.summary;
  const audit = data?.registry_audit;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      <header className="border-b border-border bg-card sticky top-[env(safe-area-inset-top)] z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAr ? "رجوع" : "Back"}</span>
          </button>
          <div className="shrink-0">
            <span className="text-sm font-bold text-primary">لِجان™</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary px-2.5 py-1.5 rounded-md transition-colors disabled:opacity-50"
            title={t("تحديث", "Refresh")}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              سجل المعايير السيادية
              <span className="block text-lg sm:text-xl text-muted-foreground font-medium mt-1" dir="ltr">
                Sovereign Standards Register
              </span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t(
                "الإثبات الذي يطلبه مراجعو الحوكمة الوطنيون: ما تفعله المنصة ازاء كل معيار دولي، والدليل، والجهة المالكة، والحالة.",
                "The evidence national governance auditors require: what the platform does against each international standard, the evidence, the owning authority, and the status."
              )}
            </p>
          </div>

          {loading ? (
            <div className="raqeem-card p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t("جارٍ تجميع السجل…", "Assembling the register…")}
            </div>
          ) : error ? (
            <div className="raqeem-card p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">{t("تعذّر تحميل السجل", "Could not load the register")}</div>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
                <button onClick={load} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                  <RefreshCw className="w-3.5 h-3.5" />{t("إعادة المحاولة", "Try again")}
                </button>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Coverage summary */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                  <SummaryCard
                    icon={FileCheck2}
                    labelAr="بنود الملتزم بها"
                    labelEn="Adhered controls"
                    value={summary.adhered}
                    tone="state-success"
                  />
                  <SummaryCard
                    icon={AlertCircle}
                    labelAr="بنود جزئية"
                    labelEn="Partial controls"
                    value={summary.partial}
                    tone="state-warning"
                  />
                  <SummaryCard
                    icon={Info}
                    labelAr="بنود مخطّطة"
                    labelEn="Planned controls"
                    value={summary.planned}
                    tone="state-info"
                  />
                  <SummaryCard
                    icon={ShieldCheck}
                    labelAr="نسبة الالتزام"
                    labelEn="Adherence coverage"
                    value={`${summary.coverage}%`}
                    tone="primary"
                  />
                </div>
              )}

              {/* Self-check */}
              {audit && (
                <div className={cn(
                  "rounded-md border px-3 py-2 mb-6 text-[11px] flex items-start gap-2",
                  audit.ok ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink"
                            : "border-state-warning-ink/30 bg-state-warning-surface text-state-warning-ink"
                )}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {t(
                      `فحص ذاتي: ${summary.controls} بندًا عبر ${summary.standards} معايير — ${audit.ok ? "لا عيوب" : `${audit.findings.length} ملاحظة: ${audit.findings.join(" · ")}`}`,
                      `Self-check: ${summary.controls} controls across ${summary.standards} standards — ${audit.ok ? "no findings" : `${audit.findings.length} finding(s): ${audit.findings.join(" · ")}`}`
                    )}
                  </span>
                </div>
              )}

              {/* Standard selector */}
              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {(data.standards || []).map((std) => (
                  <button
                    key={std.id}
                    onClick={() => setOpenStd(std.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors text-center max-w-full",
                      openStd === std.id ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{isAr ? std.name_ar : std.name_en}</span>
                  </button>
                ))}
              </div>

              {/* Active standard detail */}
              {(data.standards || []).filter((s) => s.id === openStd).map((std) => (
                <div key={std.id} className="raqeem-card p-5 sm:p-8 space-y-5">
                  <div className="pb-4 border-b border-border">
                    <h2 className="text-lg sm:text-xl font-bold text-foreground">{isAr ? std.name_ar : std.name_en}</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isAr ? std.issuing_body_ar : std.issuing_body_en}
                      {std.reference_url && (
                        <a href={std.reference_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 ms-2 text-primary hover:underline">
                          <ExternalLink className="w-3 h-3" />{t("المرجع", "Reference")}
                        </a>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{isAr ? std.summary_ar : std.summary_en}</p>
                  </div>

                  <ul className="space-y-4">
                    {std.controls.map((c) => {
                      const SIcon = STATUS_ICON[c.status] || Info;
                      return (
                        <li key={c.id} className="rounded-md border border-border p-3 sm:p-4">
                          <div className="flex flex-wrap items-start gap-2 mb-2">
                            <span className="text-[10px] font-mono text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded shrink-0">
                              {c.clause}
                            </span>
                            <span className="text-sm font-semibold text-foreground flex-1 min-w-0">
                              {isAr ? c.ar : c.en}
                            </span>
                            <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border shrink-0", STATUS_TONE[c.status])}>
                              <SIcon className="w-3 h-3" />
                              {isAr ? c.status_label.ar : c.status_label.en}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                            {isAr ? c.what_platform_does_ar : c.what_platform_does_en}
                          </p>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground border-t border-border pt-2">
                            <span className="inline-flex items-center gap-1">
                              <FileCheck2 className="w-3 h-3" />
                              <span className="text-muted-foreground/80">{t("الدليل", "Evidence")}:</span>
                              <span className="font-mono text-foreground/90">{c.evidence}</span>
                              <span className="text-muted-foreground/60">({isAr ? c.evidence_kind_label.ar : c.evidence_kind_label.en})</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span className="text-muted-foreground/80">{t("الجهة المالكة", "Owning authority")}:</span>
                              <span className="text-foreground/90">{isAr ? c.owning_authority_ar : c.owning_authority_en}</span>
                            </span>
                          </div>

                          {c.declared_limit_ar && c.status !== "adhered" && (
                            <p className="text-[11px] text-state-warning-ink mt-2 leading-relaxed border-t border-border pt-2">
                              {isAr ? c.declared_limit_ar : c.declared_limit_en}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              {/* Honesty note */}
              {data.honesty_note && (
                <div className="mt-8 rounded-md border border-border bg-secondary/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isAr ? data.honesty_note.ar : data.honesty_note.en}
                  </p>
                </div>
              )}

              <div className="mt-10 flex flex-col items-center gap-3">
                <PoweredByConnection variant="dark" />
                <p className="text-[10px] text-muted-foreground text-center leading-relaxed max-w-md">
                  {t("إصدار العقد", "Contract version")}: {data.contract_version}
                </p>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function SummaryCard({ icon: Icon, labelAr, labelEn, value, tone }) {
  const toneClass = {
    "state-success": "text-state-success-ink bg-state-success-surface",
    "state-warning": "text-state-warning-ink bg-state-warning-surface",
    "state-info": "text-state-info-ink bg-state-info-surface",
    "primary": "text-primary bg-primary/8",
  };
  return (
    <div className="raqeem-card p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", toneClass[tone])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-bold text-foreground leading-tight">{value}</div>
          <div className="text-[10px] text-muted-foreground truncate" dir="rtl">{labelAr}</div>
          <div className="text-[10px] text-muted-foreground truncate" dir="ltr">{labelEn}</div>
        </div>
      </div>
    </div>
  );
}