import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, ArrowRight, Building2, Mail, Sparkles, Loader2, Home, LogOut, Activity } from "lucide-react";
import { QATARI_ENTITIES } from "@/lib/qatariEntities";
import EntitySearchSelect from "@/components/raqeem/EntitySearchSelect";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import DemoBanner from "@/components/raqeem/DemoBanner";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import UnifiedWorkspace from "@/components/raqeem/UnifiedWorkspace";
import { BRAND } from "@/lib/brand";

export default function EntryPortal() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const { isDemoMode, effectiveActor, enterDemo, exitDemo } = useEffectiveActor();
  const { t, lang } = useLanguage();
  const [entityId, setEntityId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showWorkspace, setShowWorkspace] = useState(false);

  const handleLogout = async () => {
    await base44.auth.logout("/");
  };

  // Pre-fill from saved profile affiliation (returning user)
  useEffect(() => {
    const saved = localStorage.getItem("lijan_profile_affiliation");
    if (saved) {
      try {
        const aff = JSON.parse(saved);
        if (aff.institution_id) setEntityId(aff.institution_id);
        if (aff.institution_email) setEmail(aff.institution_email);
      } catch {}
    }
  }, []);

  // Show spinner while auth is loading
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

  // Workspace view — shown only when user explicitly toggles it
  if (showWorkspace && hasAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
        {isDemoMode && <DemoBanner />}
        <header className="border-b border-border bg-card sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-32 overflow-hidden shrink-0">
                <Image src="https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/8c4576066_image.png" alt="LIJAN™" fittingType="fit" className="w-full h-full" />
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <LanguageSwitcher />
              <button
                onClick={() => setShowWorkspace(false)}
                className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                title={t("العودة للرئيسية", "Back to Home")}
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">{t("العودة للرئيسية", "Back to Home")}</span>
              </button>
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
                  onClick={() => { exitDemo(); setShowWorkspace(false); }}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                  title={t("إنهاء الاستكشاف", "Exit Demo")}
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("إنهاء", "Exit")}</span>
                </button>
              ) : (
                <button
                  onClick={handleLogout}
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!entityId) {
      setError(t("الرجاء اختيار الجهة المؤسسية", "Please select your institution"));
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t("الرجاء إدخال بريد إلكتروني صحيح", "Please enter a valid email"));
      return;
    }
    setSubmitting(true);
    const selected = QATARI_ENTITIES.find((x) => x.id === entityId);
    // Persist the selected institution for post-auth association
    localStorage.setItem("lijan_pending_entity", JSON.stringify(selected));
    localStorage.setItem("lijan_pending_email", email);

    // Server-side check: is this email already registered?
    let isRegistered = false;
    try {
      const res = await base44.functions.invoke("CheckUserRegistration", { email });
      isRegistered = res.data?.registered === true;
    } catch {
      // Fallback: check localStorage affiliation
      const savedAffiliation = localStorage.getItem("lijan_profile_affiliation");
      if (savedAffiliation) {
        try {
          const aff = JSON.parse(savedAffiliation);
          const emailMatch = (aff.institution_email || "").toLowerCase().trim() === email.toLowerCase().trim();
          const entityMatch = aff.institution_id === entityId;
          isRegistered = emailMatch && entityMatch;
        } catch {}
      }
    }

    if (isRegistered) {
      // Registered user → login
      navigate(`/login?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent("/")}`);
    } else {
      // Not registered → account creation / onboarding
      navigate(`/register?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent("/")}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Left: Brand panel */}
      <div className="lg:w-1/2 bg-primary text-primary-foreground flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full border-8 border-accent translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full border-8 border-accent -translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-14 w-44 overflow-hidden shrink-0">
              <Image src="https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/8c4576066_image.png" alt="LIJAN™" fittingType="fit" className="w-full h-full" />
            </div>
            <div className="leading-tight">
              <div dir="rtl" className="font-bold text-2xl tracking-tight flex items-start gap-0.5">
                {BRAND.nameAr}
                <sup className="text-xs mt-1">™</sup>
              </div>
              <div dir="ltr" className="text-xs text-primary-foreground/60 uppercase tracking-wider flex items-start gap-0.5">
                {BRAND.nameEn}
                <sup className="text-[8px] mt-0.5">™</sup>
              </div>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            بوابة الدخول المؤسسية
            <span className="block text-accent text-xl lg:text-2xl mt-2">Institutional Entry Portal</span>
          </h1>
          <p className="text-primary-foreground/70 text-sm lg:text-base leading-relaxed max-w-md">
            {BRAND.descriptorAr} — {BRAND.taglineAr}.
            <span className="block mt-1 text-primary-foreground/50 text-sm">
              {BRAND.descriptorEn} — {BRAND.taglineEn}.
            </span>
          </p>

          <div className="relative z-10 mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-foreground/10 border border-primary-foreground/20">
            <ShieldCheck className="w-3.5 h-3.5 text-accent" />
            <span className="text-xs text-primary-foreground/80">
              هوية مؤسسية واحدة لكل خدمات الحوكمة · One identity for all governance services
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-3 mt-8">
          {[
            { ar: "سلطة موثقة", en: "Governed Authority" },
            { ar: "قرار مُسنَد", en: "Evidence-Based Decisions" },
            { ar: "أثر محفوظ", en: "Preserved Impact" },
          ].map((item) => (
            <div key={item.ar} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span className="text-sm text-primary-foreground/80">{item.ar} · {item.en}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form panel */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex justify-end">
            <LanguageSwitcher />
          </div>
          <div>
            <div className="flex items-center gap-2 text-accent mb-3">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">{t("إعداد مدعوم بالذكاء الاصطناعي", "AI-Assisted Onboarding")}</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">{t("تسجيل الدخول", "Sign In")}</h2>
            <p className="text-sm text-muted-foreground">
              اختر جهتك وأدخل بريدك لبدء إنشاء اللجان · Select your entity and enter your email to begin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Entity dropdown */}
            <div>
              <Label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                الجهة المؤسسية · Institution
              </Label>
              <EntitySearchSelect
                value={entityId}
                onChange={setEntityId}
                placeholder="— ابحث أو اختر الجهة · Search or select entity —"
              />
            </div>

            {/* Email */}
            <div>
              <Label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                البريد الإلكتروني المؤسسي · Official Email
              </Label>
              <Input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.gov.qa"
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>
            )}

            {/* Match indicator */}
            {entityId && email && (() => {
              const saved = localStorage.getItem("lijan_profile_affiliation");
              if (!saved) return null;
              try {
                const aff = JSON.parse(saved);
                const match = aff.institution_id === entityId &&
                  (aff.institution_email || "").toLowerCase().trim() === email.toLowerCase().trim();
                if (match) {
                  return (
                    <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-md flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span>جهتك وبريدك مطابقان لملفك — سيتم تحويلك لتسجيل الدخول · Your entity and email match your profile — you'll be redirected to sign in</span>
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> {t("جارٍ التحويل...", "Redirecting...")}</>
              ) : (
                <>متابعة · Continue {lang === "ar" ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}</>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground mb-2">لديك حساب بالفعل؟ · Already have an account?</p>
            <button
              onClick={() => navigate("/login?returnTo=" + encodeURIComponent("/"))}
              className="text-sm text-primary hover:underline font-medium"
            >
              تسجيل الدخول · Sign in
            </button>
          </div>

          {hasAccess && !showWorkspace && (
            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setShowWorkspace(true)}
                className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Home className="w-4 h-4" />
                {isDemoMode
                  ? t("دخول مساحة العمل التجريبية", "Enter Demo Workspace")
                  : t("دخول مساحة العمل", "Enter Workspace")}
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <button
              onClick={() => {
                const demoKeys = [
                  "activeOrganizationId", "activeCommitteeId", "activeMembershipId",
                  "activeDemoPersona", "lastCommitteeRoute", "committeeQueryCache",
                  "raqeem_active_org", "raqeem_active_committee",
                ];
                demoKeys.forEach((k) => localStorage.removeItem(k));
                enterDemo();
                setShowWorkspace(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 border border-accent/40 text-accent px-5 py-3 rounded-md text-sm font-medium hover:bg-accent/10 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              استكشاف التجربة · Explore Experience
            </button>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate("/dr-hamad-experience")}
              className="w-full text-right border border-accent/40 rounded-md p-3 hover:bg-accent/5 transition-colors"
              dir={lang === "ar" ? "rtl" : "ltr"}
            >
              <div className="text-sm font-semibold text-foreground">{t("الدكتور حمد سالم مجيغير", "Dr. Hamad Salem Majeegheer")}</div>
              <div className="text-xs text-muted-foreground">{t("بنك قطر للتنمية", "Qatar Development Bank")}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  "عضو ورئيس ونائب رئيس وأمين سر عبر مجموعة من اللجان الوطنية والمؤسسية",
                  "Serving as Chair, Vice-Chair, Member and Committee Secretary across national and institutional committees"
                )}
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-accent font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                {t("دخول تجربة الدكتور حمد", "Enter Dr. Hamad's Experience")}
              </div>
            </button>
          </div>

          <div className="flex justify-center">
            <PoweredByConnection variant="dark" />
          </div>

          <div className="text-center space-y-2">
            {user?.role === "admin" && (
              <button
                type="button"
                onClick={() => navigate("/national-adoption-showcase")}
                className="block w-full text-xs text-primary hover:underline font-medium transition-colors"
              >
                {t("عرض تبنّي اللجان الوطنية والأثر", "National Committee Adoption & Impact Showcase")}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate("/committees-registry")}
              className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
            >
              {t("السجل العمومي للجان", "Public Committees Registry")}
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            باستخدامك للمنصة فإنك توافق على الالتزام بـ
            <button
              type="button"
              onClick={() => navigate("/governance-policies")}
              className="text-primary hover:underline font-medium mx-0.5"
            >
              سياسات الحوكمة والتصنيف المؤسسي
            </button>
            .
            <span className="block">
              By using this platform you agree to comply with the
              <button
                type="button"
                onClick={() => navigate("/governance-policies")}
                className="text-primary hover:underline font-medium mx-0.5"
              >
                Governance & Institutional Classification Policies
              </button>
              .
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}