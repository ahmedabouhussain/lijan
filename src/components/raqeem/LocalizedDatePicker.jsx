import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * LocalizedDatePicker — wraps native date input with proper Arabic UX.
 * Fixes: "mm/dd/yyyy" placeholder showing in Arabic mode.
 * Shows visible date format hint and uses lang attribute for browser localization.
 */
export default function LocalizedDatePicker({
  value,
  onChange,
  label,
  required,
  disabled,
  className,
  min,
  max,
  id,
}) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-foreground flex items-center gap-1">
          <Calendar className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="date"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          min={min}
          max={max}
          lang={isAr ? "ar" : "en"}
          className={cn(
            "flex h-10 w-full rounded-control border border-input bg-card px-3 py-1 text-sm shadow-elevation-1 transition-colors duration-150 ease-sovereign placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
            isAr && "text-right",
            className
          )}
          aria-label={label || (isAr ? "اختر التاريخ" : "Select date")}
        />
      </div>
      {isAr && !value && (
        <p className="text-[10px] text-muted-foreground" aria-hidden="true">
          التنسيق: يوم/شهر/سنة
        </p>
      )}
    </div>
  );
}