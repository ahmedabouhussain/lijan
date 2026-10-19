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
import { Image } from "@/components/ui/image";
import { BRAND } from "@/lib/brand";
import "@/styles/entryPortal.css";

// Approved public-entry artwork: the veined marble field the engraved lockup rests on,
// and the LIJAN™ mark at both scales of the entry (band and centre).
const ENTRY_MARBLE_URL =
  "https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/34dbc042e_generated_image.png";
const ENTRY_LOGO_URL =
  "https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/eb7f391e3_LijanLogo.png";

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
  const { t, lang, setLang } = useLanguage();

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

  // ── Public entry — one marble field, one engraved lockup, one plate:
  //    Sign In and Explore LIJAN remain the only two paths in.
  return (
    <div className="ep" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="ep-bg" aria-hidden="true">
        <Image src={ENTRY_MARBLE_URL} fittingType="fill" alt="" className="ep-bg-img" />
        <div className="ep-scrim" />
      </div>

      <div className="ep-in">
        <header className="ep-top">
          <Image
            src={ENTRY_LOGO_URL}
            fittingType="fit"
            alt={`${BRAND.nameAr} · ${BRAND.nameEn}`}
            className="ep-top-logo"
          />
          <div className="ep-sw" role="group" aria-label={t("اللغة", "Language")}>
            <button
              type="button"
              onClick={() => setLang("ar")}
              aria-pressed={lang === "ar"}
              className={lang === "ar" ? "on" : ""}
            >
              عربي
            </button>
            <button
              type="button"
              onClick={() => setLang("en")}
              aria-pressed={lang === "en"}
              className={lang === "en" ? "on" : ""}
            >
              EN
            </button>
          </div>
        </header>

        <main className="ep-main">
          <Image
            src={ENTRY_LOGO_URL}
            fittingType="fit"
            alt={`${BRAND.nameAr} · ${BRAND.nameEn}`}
            className="ep-hero-logo ep-e ep-d1"
          />
          <h1 className="ep-h1 ep-e ep-d2">{t("مرحبًا بك في لجان™", "Welcome to LIJAN™")}</h1>
          <div className="ep-en ep-e ep-d2" dir={lang === "ar" ? "ltr" : "rtl"}>
            {t("Welcome to LIJAN™", "مرحبًا بك في لجان™")}
          </div>
          <p className="ep-desc ep-e ep-d3">
            {t(
              "نظام تشغيل وطني متكامل لإدارة المجالس واللجان، من التأسيس والتشكيل إلى الاجتماعات والمحاضر والقرارات والتنفيذ والمتابعة والإغلاق، ضمن بيئة مؤسسية آمنة وقابلة للتدقيق تحفظ الذاكرة المؤسسية وتدعم اتخاذ القرار بذكاء منضبط.",
              "LIJAN™ is an integrated national operating system for managing councils and committees — from founding and formation to meetings, minutes, decisions, execution, follow-up and closure — within a secure, auditable institutional environment that preserves institutional memory and supports disciplined, AI-assisted decision-making."
            )}
          </p>

          <ul className="ep-pl ep-e ep-d4">
            {PILLARS.map((pillar) => (
              <li key={pillar.en}>
                <Check aria-hidden="true" />
                <span>{t(pillar.ar, pillar.en)}</span>
              </li>
            ))}
          </ul>

          <div className="ep-plate ep-e ep-d5">
            <button
              type="button"
              onClick={() => navigate("/login?returnTo=" + encodeURIComponent("/"))}
              className="ep-btn ep-btn-p"
            >
              <LogIn aria-hidden="true" />
              {t("تسجيل الدخول", "Sign In")}
            </button>
            <button type="button" onClick={() => navigate("/explore")} className="ep-btn ep-btn-s">
              <Compass aria-hidden="true" />
              {t("استكشاف المنصة", "Explore LIJAN")}
            </button>
            <span className="ep-sheen" aria-hidden="true" />
          </div>
        </main>

        <footer className="ep-ft ep-e ep-d6">
          <div className="ep-lk">
            <button type="button" onClick={() => navigate("/committees-registry")}>
              {t("سجل اللجان العامة", "Public Committees Registry")}
            </button>
            <i aria-hidden="true" />
            <button type="button" onClick={() => navigate("/platform-specification")}>
              <FileText aria-hidden="true" />
              {t("المواصفات الفنية للمنصة", "Platform Technical Specification")}
            </button>
          </div>
          <p className="ep-cons">
            {t("باستخدامك للمنصة فإنك توافق على الالتزام بـ", "By using this platform you agree to comply with the")}
            <button type="button" onClick={() => navigate("/governance-policies")}>
              {t("سياسات الحوكمة والتصنيف المؤسسي", "Governance & Institutional Classification Policies")}
            </button>
            .
          </p>
          <PoweredByConnection variant="dark" className="ep-pw" />
        </footer>
      </div>
    </div>
  );
}