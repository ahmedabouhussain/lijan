// LIJAN™ — Institutional organization identity.
//
// ONE display unit for an institution: its approved mark directly beside the organization name,
// resolved from the central registry (or the organization record) — never from a committee name
// and never hardcoded per screen. The mark is delegated to OrganizationMark, so every surface
// shows an institution the same way: the approved asset untouched, or a neutral institutional
// card with its initials. A fabricated or substituted logo is never rendered.

import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import OrganizationMark from "@/components/workgroups/OrganizationMark";
import { cn } from "@/lib/utils";

export default function OrganizationIdentity({
  org,
  size = "row",
  showName = true,
  className,
  nameClassName,
  logoUrl,
}) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const name = org ? (isAr ? org.name_ar : org.name_en) : null;

  return (
    <span className={cn("inline-flex items-center gap-2 min-w-0 align-middle", className)}>
      <OrganizationMark org={org} logoUrl={logoUrl} size={size} />
      {showName && name && <span className={cn("truncate", nameClassName)}>{name}</span>}
    </span>
  );
}