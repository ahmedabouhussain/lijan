import React, { createContext, useContext, useState, useLayoutEffect, useCallback, useMemo } from "react";
import { setActiveLang } from "@/lib/l10n";

const LanguageContext = createContext(null);

const STORAGE_KEY = "raqeem_lang";

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || "ar";
    }
    return "ar";
  });

  const setLang = useCallback((newLang) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLang);
    }
  }, []);

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
    // Record field pair → active language only, e.g. nameOf(committee)
    nameOf: (record, base = "name") => {
      if (!record) return "";
      const ar = record[`${base}_ar`];
      const en = record[`${base}_en`];
      const chosen = lang === "ar" ? ar : en;
      if (chosen) return chosen;
      if (ar || en) return ar || en || "";
      return record[base] ?? "";
    },
    // Label map entry → active language only
    labelOf: (map, key, fallback = "") => {
      const entry = map?.[key];
      if (!entry) return fallback || key || "";
      return (lang === "ar" ? entry.ar : entry.en) || fallback || key;
    },
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