import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Compass, Crown, FileSearch, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { resolveDemoPersona, DEMO_ROLE_LENSES } from "@/lib/demoPersonas";
import RoleLensSection from "@/components/demo/RoleLensSection";
import BrandLogo from "@/components/raqeem/BrandLogo";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import { cn } from "@/lib/utils";

// Every journey below resolves to a persona that exists in the governed persona
// registry. No card is shown for a journey that cannot actually be entered.
const JOURNEY_DEFS = [
  {
    slug: "dr-hamad",
    personaKey: "DR_HAMAD_MAJEEGHEER",
    featured: true,
    icon: Crown,
    titleAr: "تجربة متعددة اللجان",
    titleEn: "Multi-Committee Executive",
    summaryAr:
      "عضو ورئيس ونائب رئيس وأمين سر عبر اللجان الوطنية والمؤسسية، مع سياق مؤسسي أساسي واحد هو بنك قطر للتنمية.",
    summaryEn:
      "Serves as Chair, Vice-Chair, Member and Committee Secretary across national and institutional committees, with one primary organizational context: Qatar Development Bank.",
  },
  {
    slug: "auditor",
    personaKey: "FAHAD_AL_FIHAIDI",
    icon: FileSearch,
    titleAr: "المراجع والحوكمة",
    titleEn: "Auditor & Governance Reviewer",
    summaryAr: "مسار المراجعة: الوصول للقراءة والتحقق، ومتابعة الالتزام دون سلطة اعتماد.",
    summaryEn: "The review journey: read-and-verify access and compliance follow-up, without approval authority.",
  },
];

export default function ExploreGateway() {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const journeys = JOURNEY_DEFS.map((def) => ({
    ...def,
    persona: resolveDemoPersona(def.personaKey),
  })).filter((j) => j.persona);

  // A lens is only offered for a journey that is actually on this page, and only
  // because its committee is provisioned in that persona's dataset.
  const journeyKeys = new Set(journeys.map((j) => j.persona.key));
  const lenses = DEMO_ROLE_LENSES.map((lens) => ({
    lens,
    persona: resolveDemoPersona(lens.personaKey),
  })).filter((item) => item.persona && journeyKeys.has(item.persona.key));

  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={lang === "ar" ? "rtl" : "ltr"}>
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary font-medium transition-colors"
          >
            <BrandLogo className="h-8 w-28 shrink-0" />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
          <div className="flex items-center gap-2 text-accent">
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {t("استكشاف المنصة", "Explore LIJAN")}
            </span>
          </div>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            {t("استكشف كيف تعمل لجان", "Explore How LIJAN Works")}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {t(
              "اختر مسارًا مهنيًا لاستعراض المنصة ببيانات عرض معزولة، دون الوصول إلى بيانات الإنتاج.",
              "Choose a professional journey to explore the platform on isolated presentation data, with no access to production data."
            )}
          </p>

          <div className="mt-8 space-y-3">
            {journeys.map((journey) => {
              // A journey is only carded with its own icon; a missing one must never
              // leave an undefined element type, which takes the whole route down.
              const Icon = journey.icon || Compass;
              return (
                <button
                  key={journey.slug}
                  onClick={() => navigate(`/explore/${journey.slug}`)}
                  className={cn(
                    "w-full text-start raqeem-card-interactive p-5",
                    journey.featured && "border-primary/30"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "rounded-md shrink-0 flex items-center justify-center",
                        journey.featured ? "w-11 h-11 bg-primary/10" : "w-10 h-10 bg-accent/10"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", journey.featured ? "text-primary" : "text-accent")} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-semibold text-foreground">
                          {t(journey.persona.name_ar, journey.persona.name_en)}
                        </h2>
                        {journey.featured && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 font-medium">
                            <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                            {t("المسار الأبرز", "Featured")}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t(journey.titleAr, journey.titleEn)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        {t(journey.summaryAr, journey.summaryEn)}
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-primary font-medium">
                        {t("ابدأ التجربة", "Start the journey")}
                        <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <RoleLensSection
            items={lenses}
            onSelect={(lens) => {
              const persona = resolveDemoPersona(lens.personaKey);
              if (persona) navigate(`/explore/${persona.slug}?lens=${lens.key}`);
            }}
          />

          <div className="mt-10 pt-6 border-t border-border flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-xs text-muted-foreground hover:text-primary font-medium transition-colors"
            >
              {t("العودة إلى صفحة الدخول", "Back to entry")}
            </button>
            <PoweredByConnection variant="dark" />
          </div>
        </div>
      </main>
    </div>
  );
}