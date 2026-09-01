import React from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

// Compact LIJAN wordmark for sidebars and mobile headers.
// Uses separate RTL/LTR spans to protect ™ placement from bidi reversal.
// variant: "light" (on maroon/dark) | "dark" (on white/light)
export default function BrandWordmark({ className, variant = "light", showDescriptor = false }) {
  const isLight = variant === "light";
  const primary = isLight ? "text-sidebar-foreground" : "text-foreground";
  const secondary = isLight ? "text-sidebar-foreground/60" : "text-muted-foreground";

  return (
    <div className={cn("leading-tight", className)}>
      {/* Arabic name with ™ — RTL container */}
      <div dir="rtl" className="flex items-start gap-0.5">
        <span className={cn("font-bold tracking-tight", primary)} style={{ fontSize: "1rem" }}>
          {BRAND.nameAr}
        </span>
        <sup className={cn("text-[9px] mt-0.5", secondary)}>{BRAND.trademark}</sup>
      </div>
      {/* English name with ™ — LTR container */}
      <div dir="ltr" className="flex items-start gap-0.5">
        <span className={cn("text-[10px] uppercase tracking-[0.15em] font-medium", secondary)}>
          {BRAND.nameEn}
          <sup className="text-[7px] ml-0.5">{BRAND.trademark}</sup>
        </span>
      </div>
      {showDescriptor && (
        <div className={cn("text-[9px] mt-1 leading-tight", secondary)}>
          {BRAND.descriptorEn}
        </div>
      )}
    </div>
  );
}