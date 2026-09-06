import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

export default function LanguageSwitcher({ className }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={cn("inline-flex rounded-md border border-border overflow-hidden", className)}>
      <button
        onClick={() => setLang("ar")}
        aria-label="العربية"
        className={cn(
          "px-2.5 py-1 text-xs font-medium transition-colors",
          lang === "ar" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        عربي
      </button>
      <button
        onClick={() => setLang("en")}
        aria-label="English"
        className={cn(
          "px-2.5 py-1 text-xs font-medium transition-colors",
          lang === "en" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        EN
      </button>
    </div>
  );
}