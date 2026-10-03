import React from "react";
import { CheckCircle2 } from "lucide-react";
import { SUMMARY_INDICATORS } from "@/lib/docs/releaseLabels";

export default function DocumentationSummary({ release, isAr }) {
  if (!release) return null;

  const flagged = {
    editions: isAr ? `${release.editions} — العربية والإنجليزية` : `${release.editions} — Arabic and English`,
    pdfa: "PDF/A-2B",
    searchable: isAr ? "متاح" : "Available",
    fonts: isAr ? "مضمَّنة" : "Embedded",
    qa: isAr ? "مرفق" : "Included",
  };

  return (
    <section className="raqeem-card p-5">
      <h2 className="mb-4 text-sm font-semibold text-foreground">
        {isAr ? "ملخص الحزمة" : "Package Summary"}
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {SUMMARY_INDICATORS.map((indicator, index) => {
          const value = indicator.key ? release[indicator.key] : flagged[indicator.flag];
          return (
            <div
              key={indicator.key || indicator.flag || index}
              className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                <span className="leading-tight">{isAr ? indicator.ar : indicator.en}</span>
              </div>
              <div className="mt-1.5 font-heading text-lg font-bold tabular-nums text-foreground">
                {value ?? "—"}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}