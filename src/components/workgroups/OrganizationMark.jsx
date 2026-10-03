// LIJAN™ — OrganizationMark: the ONE institutional mark of a work-group surface.
//
// An approved logo is rendered untouched: original aspect ratio, object-contain, on a clean
// neutral ground, never stretched, recoloured or cropped. When an institution has no approved
// asset the component renders a neutral institutional card with its initials — never a
// substitute or invented logo, and never confused with a person's portrait.

import React from "react";
import { Image } from "@/components/ui/image";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

const BOX = {
  row: "h-[22px] w-12",
  chip: "h-7 w-12",
  card: "h-9 w-16 sm:h-10 sm:w-20",
  header: "h-7 w-14 sm:h-8 sm:w-16",
  mobile: "h-7 w-14",
  hero: "h-12 w-22",
};

const MONOGRAM_BOX = {
  row: "h-[22px] w-12 text-[9px]",
  chip: "h-7 w-12 text-[10px]",
  card: "h-9 w-16 sm:h-10 sm:w-20 text-sm",
  header: "h-7 w-14 sm:h-8 sm:w-16 text-xs",
  mobile: "h-7 w-14 text-xs",
  hero: "h-12 w-22 text-base",
};

/** Initials of an institution, in its active-language name. Never a person's initials. */
function monogram(name) {
  if (!name) return "—";
  return name
    .replace(/[()]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 3)
    .map((w) => w[0])
    .join("");
}

export default function OrganizationMark({
  org,
  logoUrl,
  logoUrlOnDark,
  size = "row",
  tone = "light",
  className,
  title,
}) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const name = org ? (isAr ? org.name_ar : org.name_en) : null;
  // The mark is chosen for the ground it sits on: the reversed edition on a dark surface,
  // the primary edition otherwise, falling back to the institution's own approved record.
  const dark = tone === "dark";
  const src =
    (dark ? logoUrlOnDark || org?.logo_on_dark_url || logoUrl : logoUrl) ||
    org?.logo_url ||
    null;
  const label = title || (org ? t(`شعار ${org.name_ar}`, `${org.name_en} logo`) : "");

  if (src) {
    return (
      <span
        className={cn(
          // A clean neutral ground with breathing space: the mark keeps its own aspect ratio,
          // is never cropped, stretched or recoloured, and vectors stay vectors.
          "shrink-0 inline-flex items-center justify-center rounded border p-0.5",
          dark ? "bg-neutral-900 border-white/10" : "bg-white border-border/60",
          BOX[size] || BOX.row,
          className
        )}
      >
        <Image src={src} alt={label} fittingType="fit" className="w-full h-full object-contain" />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center justify-center rounded border border-dashed border-border bg-secondary/40 font-semibold tracking-wide text-muted-foreground",
        MONOGRAM_BOX[size] || MONOGRAM_BOX.row,
        className
      )}
      title={name || undefined}
      aria-label={name || t("جهة غير محددة", "Institution not specified")}
    >
      {monogram(name)}
    </span>
  );
}