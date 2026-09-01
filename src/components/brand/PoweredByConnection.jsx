import React from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

// "Powered by CONNECTION™" — parent endorsement line.
// Uses explicit LTR container to protect the ™ mark from bidi reversal.
export default function PoweredByConnection({ className, variant = "light" }) {
  const isLight = variant === "light";
  return (
    <div
      dir="ltr"
      className={cn(
        "text-[10px] tracking-wide leading-tight",
        isLight ? "text-sidebar-foreground/50" : "text-muted-foreground",
        className
      )}
    >
      Powered by <span style={{ color: BRAND.primaryColor, fontWeight: 600 }}>CONNECTION</span>
      <sup className="text-[8px]">™</sup>
    </div>
  );
}