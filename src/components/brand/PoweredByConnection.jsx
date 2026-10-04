import React from "react";
import { cn } from "@/lib/utils";
import { Image } from "@/components/ui/image";
import {
  BRAND,
  CONNECTION_LOGO_URL,
  CONNECTION_WEBSITE_URL,
  CONNECTION_WEBSITE_LABEL,
} from "@/lib/brand";

// "Powered by CONNECTION™" — the parent platform endorsement, linked to the parent site.
// On light surfaces (platform footers) it carries the approved lockup and the site address; on the
// maroon sidebar it stays as white-on-maroon type, because the lockup is a dark wordmark and would
// not read there. An explicit LTR container protects the ™ mark from bidi reversal.
export default function PoweredByConnection({ className, variant = "light" }) {
  const isLight = variant === "light";
  return (
    <a
      href={CONNECTION_WEBSITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      dir="ltr"
      title={`CONNECTION™ — ${CONNECTION_WEBSITE_LABEL}`}
      className={cn(
        "group inline-flex flex-col items-center gap-2 sovereign-focus rounded-md",
        className
      )}
    >
      {!isLight && (
        <Image
          src={CONNECTION_LOGO_URL}
          alt="CONNECTION™ — Protocol & Mega Events Platform"
          fittingType="fit"
          className="h-10 w-56 max-w-full transition-opacity group-hover:opacity-90"
        />
      )}
      <span
        className={cn(
          "text-[10px] tracking-wide leading-tight",
          isLight ? "text-sidebar-foreground/50" : "text-muted-foreground"
        )}
      >
        Powered by{" "}
        <span style={{ color: BRAND.primaryColor, fontWeight: 600 }}>CONNECTION</span>
        <sup className="text-[8px]">™</sup>
      </span>
      {!isLight && (
        <span className="text-[10px] text-primary/80 underline-offset-2 group-hover:text-primary group-hover:underline">
          {CONNECTION_WEBSITE_LABEL}
        </span>
      )}
    </a>
  );
}