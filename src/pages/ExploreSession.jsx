import React, { useEffect, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Compass } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { resolvePersonaBySlug } from "@/lib/demoPersonas";
import BrandLogo from "@/components/raqeem/BrandLogo";

// Direct, stable route for every exploration persona: /explore/<slug>
// It starts the SAME governed exploration session the gateway uses — there is no
// second session mechanism, and no client-side impersonation.
export default function ExploreSession() {
  const { personaSlug } = useParams();
  const navigate = useNavigate();
  const { enterDemo } = useEffectiveActor();
  const { t, lang } = useLanguage();
  const persona = resolvePersonaBySlug(personaSlug);
  const started = useRef(false);

  useEffect(() => {
    if (!persona || started.current) return;
    started.current = true;
    enterDemo(persona.key);
    navigate("/", { replace: true });
  }, [persona, enterDemo, navigate]);

  if (!persona) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir={lang === "ar" ? "rtl" : "ltr"}>
        <BrandLogo className="h-12 w-40 mb-6" />
        <h1 className="text-lg font-semibold text-foreground">
          {t("مسار الاستكشاف غير متاح", "This exploration journey is not available")}
        </h1>
        <Link to="/explore" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
          <Compass className="w-4 h-4" aria-hidden="true" />
          {t("استكشاف المنصة", "Explore LIJAN")}
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          {t("جارٍ فتح جلسة الاستكشاف…", "Opening the exploration session…")}
        </p>
      </div>
    </div>
  );
}