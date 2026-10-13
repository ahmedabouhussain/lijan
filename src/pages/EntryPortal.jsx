import React from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Compass, ShieldCheck, LogOut, Activity, Check, Loader2, FileText } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { base44 } from "@/api/base44Client";
import BrandLogo from "@/components/raqeem/BrandLogo";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import UnifiedWorkspace from "@/components/raqeem/UnifiedWorkspace";
import { BRAND } from "@/lib/brand";

// The four institutional pillars shown on the public entry.
const PILLARS = [
  { ar: "حوكمة واضحة", en: "Clear governance" },
  { ar: "قرارات موثقة", en: "Documented decisions" },
  { ar: "تنفيذ قابل للمتابعة", en: "Trackable execution" },
  { ar: "ذاكرة مؤسسية مستدامة", en: "Sustained institutional memory" },
];

export default function EntryPortal() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const { isDemoMode, effectiveActor, exitDemo } = useEffectiveActor();
  const { t, lang } = useLanguage();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">{t("جارٍ التحميل", "Loading…")}</p>
        </div>
      </div>
    );
  }

  const hasAccess = (isAuthenticated && user) || isDemoMode;
  const displayEmail = isDemoMode ? effectiveActor?.email : user?.email;

  // ── Contextual workspace — the single surface for authenticated accounts and
  //    governed exploration sessions alike. There is no second entry toggle.
  if (hasAccess) {
    return (
      <div className="min-h-app bg-background flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
        <header className="border-b border-border bg-card sticky top-[env(safe-area-inset-top)] z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <BrandLogo className="h-9 w-32 shrink-0" />
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <LanguageSwitcher />
              {user?.role === "admin" && !isDemoMode && (
                <>
                  <button
                    onClick={() => navigate("/national-adoption-showcase")}
                    className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                    title={t("عرض التبنّي الوطني", "National Adoption Showcase")}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("عرض التبنّي الوطني", "National Adoption")}</span>
                  </button>
                  <button
                    onClick={() => navigate("/activity-log")}
                    className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                    title={t("لوحة التحكم", "Admin Dashboard")}
                  >
                    <Activity className="w-4 h-4" />
                    <span className="hidden sm:inline">{t("لوحة التحكم", "Admin Dashboard")}</span>
                  </button>
                </>
              )}
              <button
                onClick={() => navigate("/profile")}
                className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                title={t("الملف الشخصي", "Profile")}
              >
                <span className="text-xs text-muted-foreground hidden md:block">{displayEmail}</span>
                <span className="md:hidden">{t("الملف", "Profile")}</span>
              </button>
              {isDemoMode ? (
                <button
                  onClick={() => { exitDemo(); navigate("/explore", { replace: true }); }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                  title={t("إنهاء الاستكشاف", "Exit Exploration")}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("إنهاء", "Exit")}</span>
                </button>
              ) : (
                <button
                  onClick={() => base44.auth.logout("/")}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                  title={t("تسجيل الخروج", "Logout")}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("خروج", "Logout")}</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <UnifiedWorkspace />
          </div>
        </main>
      </div>
    );
  }

  // ── Public entry — two primary paths only: Sign In, Explore LIJAN.
  return (
    <div className="min-h-app bg-background flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-3">
          <BrandLogo className="h-9 w-32 shrink-0" />
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 sm:px-6 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <BrandLogo className="h-16 w-52 mx-auto mb-7" />
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              {t("مرحبًا بك في لجان™", "Welcome to LIJAN™")}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed text-balance">
              {t(
                `${BRAND.descriptorAr} — ${BRAND.taglineAr}`,
                `${BRAND.descriptorEn} — ${BRAND.taglineEn}`
              )}
            </p>
          </div>

          <ul className="mt-9 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {PILLARS.map((pillar) => (
              <li key={pillar.en} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-accent shrink-0" aria-hidden="true" />
                <span className="text-sm text-foreground">{t(pillar.ar, pillar.en)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-10 space-y-2.5">
            <button
              onClick={() => navigate("/login?returnTo=" + encodeURIComponent("/"))}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground h-12 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors sovereign-focus"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              {t("تسجيل الدخول", "Sign In")}
            </button>
            <button
              onClick={() => navigate("/explore")}
              className="w-full inline-flex items-center justify-center gap-2 border border-primary/30 text-primary bg-transparent h-12 rounded-md text-sm font-medium hover:bg-primary/5 transition-colors sovereign-focus"
            >
              <Compass className="w-4 h-4" aria-hidden="true" />
              {t("استكشاف المنصة", "Explore LIJAN")}
            </button>
          </div>

          <div className="mt-5 text-center space-y-1.5">
            <button
              type="button"
              onClick={() => navigate("/committees-registry")}
              className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors block"
            >
              {t("سجل اللجان العامة", "Public Committees Registry")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/platform-specification")}
              className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors inline-flex items-center gap-1"
            >
              <FileText className="w-3 h-3" />
              {t("المواصفات الفنية للمنصة", "Platform Technical Specification")}
            </button>
          </div>

          <div className="mt-10 flex flex-col items-center gap-4">
            <PoweredByConnection variant="dark" />
            <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
              {t("باستخدامك للمنصة فإنك توافق على الالتزام بـ", "By using this platform you agree to comply with the")}
              <button
                type="button"
                onClick={() => navigate("/governance-policies")}
                className="text-primary hover:underline font-medium mx-0.5"
              >
                {t("سياسات الحوكمة والتصنيف المؤسسي", "Governance & Institutional Classification Policies")}
              </button>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}