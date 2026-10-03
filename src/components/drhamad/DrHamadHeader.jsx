import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Home } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { DR_HAMAD_PERSONA } from "@/lib/drHamadPersona";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";

export default function DrHamadHeader({ contextLine }) {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  return (
    <header className="border-b border-border bg-card sticky top-0 z-30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3" dir={lang === "ar" ? "rtl" : "ltr"}>
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">
            {lang === "ar" ? DR_HAMAD_PERSONA.name_ar : DR_HAMAD_PERSONA.name_en}
          </div>
          <div className="text-xs text-muted-foreground">
            {lang === "ar" ? DR_HAMAD_PERSONA.primary_org_ar : DR_HAMAD_PERSONA.primary_org_en}
          </div>
          {contextLine && (
            <div className="text-[11px] text-primary mt-0.5">{contextLine}</div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="w-3 h-3" /> {t("بيانات تجريبية لأغراض العرض", "Synthetic Demonstration Data")}
          </span>
          <LanguageSwitcher />
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">{t("العودة للرئيسية", "Home")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}