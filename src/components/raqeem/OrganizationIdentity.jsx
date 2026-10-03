// LIJAN™ — Institutional organization identity.
//
// ONE display unit for an institution: its approved logo directly beside the organization
// name, resolved from the organization record (logo_url) — never from a committee name and
// never hardcoded per screen. A neutral institutional icon is used only when an organization
// genuinely has no approved logo.
//
// The logo keeps its original aspect ratio (object-contain), sits on a clean neutral ground,
// and carries no shadow, outline, gradient, filter or coloured icon box.

import React from "react";
import { Building2 } from "lucide-react";
import { Image } from "@/components/ui/image";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

// Recommended maximum heights: section header 32px, committee row 22–24px,
// organization profile card 40px, mobile section header 28px.
const LOGO_BOX = {
  header: "h-7 max-h-7 w-14 sm:h-8 sm:max-h-8 sm:w-16",
  mobile: "h-7 max-h-7 w-14",
  card: "h-9 max-h-9 w-16 sm:h-10 sm:max-h-10 sm:w-20",
  row: "h-[22px] max-h-[22px] w-12",
};

const FALLBACK_BOX = {
  header: "w-8 h-8",
  mobile: "w-7 h-7",
  card: "w-10 h-10",
  row: "w-[22px] h-[22px]",
};

export default function OrganizationIdentity({
  org,
  size = "row",
  showName = true,
  className,
  nameClassName,
}) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const name = org ? (isAr ? org.name_ar : org.name_en) : null;
  const alt = org ? t(`شعار ${org.name_ar}`, `${org.name_en} logo`) : "";

  return (
    <span className={cn("inline-flex items-center gap-2 min-w-0 align-middle", className)}>
      {org?.logo_url ? (
        <Image
          src={org.logo_url}
          alt={alt}
          fittingType="fit"
          className={cn("shrink-0 rounded bg-white", LOGO_BOX[size] || LOGO_BOX.row)}
        />
      ) : (
        <span
          className={cn(
            "shrink-0 rounded bg-secondary/60 flex items-center justify-center",
            FALLBACK_BOX[size] || FALLBACK_BOX.row
          )}
          aria-hidden="true"
        >
          <Building2 className={cn("text-muted-foreground", size === "row" ? "w-3 h-3" : "w-4 h-4")} />
        </span>
      )}
      {showName && name && <span className={cn("truncate", nameClassName)}>{name}</span>}
    </span>
  );
}