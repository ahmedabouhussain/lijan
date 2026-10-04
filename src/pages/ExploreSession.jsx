import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Compass } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { resolvePersonaBySlug, resolveRoleLens, roleLensPath } from "@/lib/demoPersonas";
import BrandLogo from "@/components/raqeem/BrandLogo";

// Direct, stable route for every exploration persona: /explore/<slug>
// It starts the SAME governed exploration session the gateway uses — there is no
// second session mechanism, and no client-side impersonation.
export default function ExploreSession() {
  const { personaSlug } = useParams();
  const navigate = useNavigate();
  const { isDemoMode, enterDemo } = useEffectiveActor();
  const { t, lang } = useLanguage();
  const persona = resolvePersonaBySlug(personaSlug);
  // ?lens=chair|secretary|member — a lens only decides where the session OPENS.
  // It never grants authority: the role is the one the server resolves from the membership.
  const lens = resolveRoleLens(new URLSearchParams(window.location.search).get("lens"));
  const [sessionRequested, setSessionRequested] = useState(false);
  const [sessionFailed, setSessionFailed] = useState(false);
  const started = useRef(false);

  // The session is requested from the server; landing happens only once it is ACTIVE, so an
  // exploration surface never renders as an anonymous visitor.
  useEffect(() => {
    if (!persona || started.current) return;
    started.current = true;
    enterDemo(persona.key)
      .then((session) => {
        if (!session) setSessionFailed(true);
        setSessionRequested(true);
      })
      .catch(() => {
        setSessionFailed(true);
        setSessionRequested(true);
      });
  }, [persona, enterDemo]);

  // Land only once the governed session is active, so the landing committee resolves as
  // the persona instead of as an anonymous visitor.
  useEffect(() => {
    if (!sessionRequested || !isDemoMode) return;
    const target = lens && lens.personaKey === persona?.key ? roleLensPath(lens) : "/";
    navigate(target, { replace: true });
  }, [sessionRequested, isDemoMode, lens, persona, navigate]);

  if (!persona || (sessionFailed && !isDemoMode)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir={lang === "ar" ? "rtl" : "ltr"}>
        <BrandLogo className="h-12 w-40 mb-6" />
        <h1 className="text-lg font-semibold text-foreground">
          {persona
            ? t("تعذّر فتح جلسة الاستكشاف", "The exploration session could not be opened")
            : t("مسار الاستكشاف غير متاح", "This exploration journey is not available")}
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