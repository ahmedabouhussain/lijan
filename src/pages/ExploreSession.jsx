import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, Compass, RefreshCw } from "lucide-react";
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
  const [sessionFailed, setSessionFailed] = useState(false);
  const [opening, setOpening] = useState(false);
  const startedRef = useRef(false);

  // The session is requested from the server; landing happens only once it is ACTIVE, so an
  // exploration surface never renders as an anonymous visitor.
  //
  // A single lost call (a cold function start, a token refresh in flight) must never leave the
  // visitor on a dead page: the request is attempted twice, and a visitor who still fails can
  // ask again — the route they are on is not a one-way door.
  const openSession = useCallback(async () => {
    if (!persona) return;
    setOpening(true);
    setSessionFailed(false);
    let session = null;
    for (let attempt = 0; attempt < 2 && !session; attempt++) {
      try {
        session = await enterDemo(persona.key);
      } catch {
        session = null;
      }
    }
    setOpening(false);
    if (!session) setSessionFailed(true);
  }, [persona, enterDemo]);

  useEffect(() => {
    if (!persona || startedRef.current) return;
    startedRef.current = true;
    openSession();
  }, [persona, openSession]);

  // Land only once the governed session is active, so the landing committee resolves as
  // the persona instead of as an anonymous visitor.
  useEffect(() => {
    if (!isDemoMode || !persona) return;
    const target = lens && lens.personaKey === persona.key ? roleLensPath(lens) : "/";
    navigate(target, { replace: true });
  }, [isDemoMode, persona, lens, navigate]);

  if (!persona || (sessionFailed && !isDemoMode)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6" dir={lang === "ar" ? "rtl" : "ltr"}>
        <BrandLogo className="h-12 w-40 mb-6" />
        <h1 className="text-lg font-semibold text-foreground">
          {persona
            ? t("تعذّر فتح جلسة الاستكشاف", "The exploration session could not be opened")
            : t("مسار الاستكشاف غير متاح", "This exploration journey is not available")}
        </h1>
        {persona && (
          <button
            type="button"
            onClick={openSession}
            disabled={opening}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium disabled:opacity-50 sovereign-focus"
          >
            {opening ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
            )}
            {t("إعادة المحاولة", "Try again")}
          </button>
        )}
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