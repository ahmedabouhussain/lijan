import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ChevronDown, ArrowLeft, Building2, Mail, Sparkles, Loader2, Home, LogOut } from "lucide-react";
import { QATARI_ENTITIES, ENTITY_CATEGORIES, getEntitiesByCategory } from "@/lib/qatariEntities";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import BrandLogo from "@/components/raqeem/BrandLogo";
import BrandWordmark from "@/components/brand/BrandWordmark";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import UnifiedWorkspace from "@/components/raqeem/UnifiedWorkspace";
import { BRAND } from "@/lib/brand";

export default function EntryPortal() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, user } = useAuth();
  const { t, lang } = useLanguage();
  const [entityId, setEntityId] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

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

  const grouped = getEntitiesByCategory();

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

  // Authenticated users → show unified workspace with all their orgs + committees
  if (isAuthenticated && user) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
        {/* Top bar */}
        <header className="border-b border-border bg-card sticky top-0 z-30">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-md overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#FFFFFF" }}>
                <BrandLogo className="w-full h-full" />
              </div>
              <BrandWordmark variant="dark" className="hidden sm:block" />
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                title={t("الرئيسية", "Home")}
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">{t("الرئيسية", "Home")}</span>
              </button>
              <button
                onClick={() => navigate("/profile")}
                className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                title={t("الملف الشخصي", "Profile")}
              >
                <span className="text-xs text-muted-foreground hidden md:block">{user.email}</span>
                <span className="sm:hidden">{t("الملف", "Profile")}</span>
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-2.5 py-1.5 rounded-md font-medium transition-colors"
                title={t("تسجيل الخروج", "Logout")}
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("خروج", "Logout")}</span>
              </button>
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
      setError("الرجاء اختيار الجهة المؤسسية · Please select your institution");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("الرجاء إدخال بريد إلكتروني صحيح · Please enter a valid email");
      return;
    }
    setSubmitting(true);
    const selected = QATARI_ENTITIES.find((x) => x.id === entityId);
    // Persist the selected institution for post-auth association
    localStorage.setItem("lijan_pending_entity", JSON.stringify(selected));
    localStorage.setItem("lijan_pending_email", email);

    // Check if this entity+email matches a saved profile affiliation → go to login
    const savedAffiliation = localStorage.getItem("lijan_profile_affiliation");
    if (savedAffiliation) {
      try {
        const aff = JSON.parse(savedAffiliation);
        const emailMatch = (aff.institution_email || "").toLowerCase().trim() === email.toLowerCase().trim();
        const entityMatch = aff.institution_id === entityId;
        if (emailMatch && entityMatch) {
          // Returning user with matching affiliation → login
          navigate(`/login?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent("/")}`);
          return;
        }
      } catch {}
    }

    // New user or mismatch → register
    navigate(`/register?email=${encodeURIComponent(email)}&returnTo=${encodeURIComponent("/")}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row" dir="rtl">
      {/* Left: Brand panel */}
      <div className="lg:w-1/2 bg-primary text-primary-foreground flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full border-8 border-accent translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full border-8 border-accent -translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-md overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#FFFFFF" }}>
              <BrandLogo className="w-full h-full" />
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
            نظام تشغيل المجالس واللجان الوطنية — من الصلاحية إلى الأثر.
            <span className="block mt-1 text-primary-foreground/50 text-sm">
              {BRAND.descriptorEn} — From Mandate to Impact.
            </span>
          </p>
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
          <div>
            <div className="flex items-center gap-2 text-accent mb-3">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">AI-Assisted Onboarding</span>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">تسجيل الدخول</h2>
            <p className="text-sm text-muted-foreground">
              اختر جهتك وأدخل بريدك لبدء إنشاء اللجان · Select your entity and enter your email to begin
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Entity dropdown */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                الجهة المؤسسية · Institution
              </label>
              <div className="relative">
                <select
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="w-full appearance-none px-3 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring pr-9"
                >
                  <option value="">— اختر الجهة · Select entity —</option>
                  {Object.entries(grouped).map(([catKey, entities]) => (
                    <optgroup key={catKey} label={`${ENTITY_CATEGORIES[catKey].ar} — ${ENTITY_CATEGORIES[catKey].en}`}>
                      {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.ar} — {entity.en}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 left-3 pointer-events-none" />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                البريد الإلكتروني المؤسسي · Official Email
              </label>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@institution.gov.qa"
                className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-md text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> جارٍ التحويل...</>
              ) : (
                <>متابعة · Continue <ArrowLeft className="w-4 h-4" /></>
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

          <div className="flex justify-center">
            <PoweredByConnection variant="dark" />
          </div>

          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            باستخدامك للمنصة فإنك توافق على الالتزام بسياسات الحوكمة والتصنيف المؤسسي.
            <span className="block">By using this platform you agree to comply with institutional governance and classification policies.</span>
          </p>
        </div>
      </div>
    </div>
  );
}