import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Bot, Loader2, ShieldCheck, Building2, Users, AlertTriangle, Gauge, Eye, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Image } from "@/components/ui/image";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { formatDate } from "@/lib/raqeemUtils";

// PublicAIRegister — السجل العمومي الوطني للذكاء الاصطناعي.
// سطح إفصاح عمومي بلا تسجيل دخول: يعرض الأنظمة المُعتمدة قيد الاستخدام، غرضها، فئة
// مخاطرها، تقييم أثرها، والإشراف البشري عليها. التزام وطني بالإفصاح (EU AI Act Art. 60 ·
// Canada Algorithmic Impact Assessment · Dutch Algorithm Register).

const RISK_TONE = {
  high_risk: "bg-state-warning-surface text-state-warning-ink",
  limited_risk: "bg-state-progress-surface text-state-progress-ink",
  minimal_risk: "bg-state-info-surface text-state-info-ink",
};

export default function PublicAIRegister() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = isAr ? "السجل الوطني للذكاء الاصطناعي | لِجان" : "National AI Register | LIJAN";
  }, [isAr]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("GetPublicAIRegister", {});
        if (cancelled) return;
        const d = res?.data || res;
        if (d?.error) setError(true);
        else setData(d);
      } catch (e) {
        if (!cancelled) setError(true);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const t = (ar, en) => (isAr ? ar : en);

  return (
    <div className="min-h-app bg-background flex flex-col" dir={dir}>
      <header className="border-b border-border bg-card sticky top-[env(safe-area-inset-top)] z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            aria-label={t("العودة للرئيسية", "Back to home")}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{t("الرئيسية", "Home")}</span>
          </button>
          <div className="h-9 w-28 overflow-hidden shrink-0">
            <Image
              src="https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/8c4576066_image.png"
              alt="LIJAN™"
              fittingType="fit"
              className="w-full h-full"
            />
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="ui-title text-foreground">
                {t("السجل الوطني للذكاء الاصطناعي", "National AI Register")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t(
                  "إفصاح عمومي عن أنظمة الذكاء المُعتمدة لدى الجهات المؤسسية",
                  "Public disclosure of approved AI systems used by institutions"
                )}
              </p>
            </div>
          </div>

          <div className="raqeem-card p-4 mb-6 bg-secondary/30 border-primary/15">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "يلتزم هذا السجل بالإفصاح الوطني عن كل نظام ذكاء اصطناعي مُعتمد قيد الاستخدام: غرضه، فئة مخاطره، تقييم أثره، والإشراف البشري عليه. لا يُغيّر أي نظام حالة الحوكمة — كل مخرج استشاري والحكم النهائي بشري. (EU AI Act Art. 60 · Canada Algorithmic Impact Assessment · Dutch Algorithm Register)",
                "This register fulfils the national disclosure obligation for every approved AI system in use: its purpose, risk tier, impact assessment, and human oversight. No system changes governance state — every output is advisory and the final verdict is human. (EU AI Act Art. 60 · Canada Algorithmic Impact Assessment · Dutch Algorithm Register)"
              )}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertTriangle className="w-10 h-10 text-destructive/40 mx-auto mb-3" />
              <p className="text-sm text-destructive">{t("تعذّر تحميل السجل.", "Failed to load the register.")}</p>
            </div>
          ) : (
            <>
              {/* ملخص وطني */}
              <div className="raqeem-card p-4 mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryStat
                    icon={Bot}
                    label={t("الأنظمة", "Systems")}
                    value={data?.summary?.total_systems ?? 0}
                  />
                  <SummaryStat
                    icon={ShieldCheck}
                    label={t("مُعتمدة", "Approved")}
                    value={data?.summary?.approved_count ?? 0}
                  />
                  <SummaryStat
                    icon={Eye}
                    label={t("بإشراف بشري", "With oversight")}
                    value={data?.summary?.all_have_oversight ? (data?.summary?.total_systems ?? 0) : 0}
                  />
                  <div className="rounded-md bg-secondary/30 p-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>{t("حسب فئة المخاطر", "By risk tier")}</span>
                    </div>
                    <div className="space-y-1">
                      {(data?.summary?.by_risk_tier || []).map((r) => (
                        <div key={r.key} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{isAr ? r.label.ar : r.label.en}</span>
                          <span className="font-semibold text-foreground">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {data?.summary?.advisory_only && (
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-state-success-ink">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t("كل حالة استخدام استشارية بحتة — لا تُغيّر حالة الحوكمة.", "Every use case is advisory only — no governance state is changed.")}
                  </div>
                )}
              </div>

              {(!data?.systems || data.systems.length === 0) ? (
                <div className="text-center py-16">
                  <Bot className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    {t("لا توجد أنظمة ذكاء مُعتمدة مُعلنة حالياً", "No approved AI systems disclosed yet")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.systems.map((s, i) => {
                    const name = isAr ? s.system_name : (s.system_name_en || s.system_name);
                    const ownerName = isAr
                      ? s.organization?.name_ar || s.committee?.name_ar
                      : s.organization?.name_en || s.committee?.name_ar;
                    return (
                      <div key={`${s.system_name}-${i}`} className="raqeem-card p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-foreground leading-snug">{name || "—"}</h3>
                            {ownerName && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                {s.committee ? <Users className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                                <span>{ownerName}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <StatusBadge
                              label={isAr ? s.risk_tier_label?.ar : s.risk_tier_label?.en}
                              colorClass={RISK_TONE[s.risk_tier] || "bg-secondary text-muted-foreground"}
                            />
                            {s.status === "retired" && (
                              <span className="text-[10px] text-muted-foreground">{t("مُحال", "Retired")}</span>
                            )}
                          </div>
                        </div>

                        {(isAr ? s.purpose : (s.purpose_en || s.purpose)) && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {isAr ? s.purpose : (s.purpose_en || s.purpose)}
                          </p>
                        )}

                        {/* تقييم الأثر — إفصاح عمومي */}
                        <div className="rounded-md border border-border bg-secondary/20 p-3 space-y-2">
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                            {t("تقييم الأثر", "Impact Assessment")}
                          </p>
                          <ImpactField label={t("المتأثرون", "Affected parties")} value={isAr ? s.impact_assessment?.affected_parties : s.impact_assessment?.affected_parties} isAr={isAr} />
                          <ImpactField label={t("المخاطر المُحدَّدة", "Identified risks")} value={s.impact_assessment?.identified_risks} isAr={isAr} />
                          <ImpactField label={t("التدابير", "Mitigation measures")} value={s.impact_assessment?.mitigation_measures} isAr={isAr} />
                          {s.human_oversight_basis && (
                            <div className="flex items-start gap-1.5 pt-1 border-t border-border/60">
                              <Eye className="w-3.5 h-3.5 text-state-success-ink shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[10px] text-muted-foreground">{t("الإشراف البشري", "Human oversight")}</p>
                                <p className="text-xs text-foreground leading-relaxed">{s.human_oversight_basis}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {s.approved_use_cases?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {s.approved_use_cases.map((u) => (
                              <span key={u.key} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-secondary/50 text-muted-foreground border border-border">
                                <Sparkles className="w-2.5 h-2.5" />
                                {isAr ? u.ar : u.en}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border text-[11px] text-muted-foreground">
                          <span>{s.standard_reference}</span>
                          {s.deployed_at && <span>{t("مُنشَر: ", "Deployed: ")}{formatDate(s.deployed_at)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {data?.honesty_note && (
                <div className="raqeem-card p-4 mt-6 bg-secondary/20">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {isAr ? data.honesty_note.ar : data.honesty_note.en}
                  </p>
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <PoweredByConnection variant="dark" />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function SummaryStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md bg-secondary/30 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

function ImpactField({ label, value, isAr }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground leading-relaxed">{value}</p>
    </div>
  );
}