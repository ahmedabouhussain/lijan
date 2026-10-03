import React, { createContext, useContext, useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { setActiveLang, nameOf, missingValueLabel } from "@/lib/l10n";
import { ameenName } from "@/lib/ameenIdentity";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const LanguageContext = createContext(null);

const STORAGE_KEY = "raqeem_lang";

export function LanguageProvider({ children }) {
  const { user } = useAuth();
  const [lang, setLangState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "ar";
    }
    return "ar";
  });

  const setLang = useCallback(
    (newLang) => {
      setLangState(newLang);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newLang);
      }
      // The choice belongs to the account, not only to this device: it survives a reload
      // and the next sign-in, on any device. A failure here never blocks the switch.
      if (user) {
        base44.auth.updateMe({ preferred_language: newLang }).catch(() => {});
      }
    },
    [user]
  );

  // Restore the language stored on the account, once, only when this device has no
  // explicit choice of its own.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    const saved = user?.data?.preferred_language;
    if (saved && !localStorage.getItem(STORAGE_KEY)) {
      restoredRef.current = true;
      setLangState(saved);
      return;
    }
    if (user) restoredRef.current = true;
  }, [user]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  // The DOM direction/language is an OUTPUT of this single source of truth.
  // Applied before paint so a page never renders in the wrong direction.
  useLayoutEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    setActiveLang(lang);
  }, [dir, lang]);

  const t = useCallback(
    (ar, en) => (lang === "ar" ? ar : en),
    [lang]
  );

  const toggleLang = useCallback(() => {
    setLang(lang === "ar" ? "en" : "ar");
  }, [lang, setLang]);

  const value = useMemo(() => ({
    lang,
    dir,
    isAr: lang === "ar",
    setLang,
    toggleLang,
    t,
    // Bilingual pair → active language only (never both, never the other language)
    pick: (ar, en) => (lang === "ar" ? ar : en),
    // Record field pair → active language only. STRICT: a value that does not exist in
    // the active language resolves to "" — the other language is never substituted.
    // Render <MissingValue /> (or missingValue) for the gap itself.
    nameOf: (record, base = "name") => nameOf(record, lang, base),
    // The active language's own notice for a value never authored in it.
    missingValue: missingValueLabel(lang),
    // Label map entry → active language only
    labelOf: (map, key, fallback = "") => {
      const entry = map?.[key];
      if (!entry) return fallback || key || "";
      return (lang === "ar" ? entry.ar : entry.en) || fallback || key;
    },
    // The ONE assistant's name in the active language («أمين» / AMEEN).
    ameen: ameenName(lang),
  }), [lang, dir, t, setLang, toggleLang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}