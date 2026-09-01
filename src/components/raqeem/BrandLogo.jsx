import React from "react";
import { Image } from "@/components/ui/image";
import { BRAND_LOGO_URL, BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Reusable LIJAN logo — renders the official brand mark at any size.
// fittingType="fit" (contain, default) preserves the full logo; "fill" crops.
export default function BrandLogo({ className, fittingType = "fit", ...props }) {
  return (
    <Image
      src={BRAND_LOGO_URL}
      alt={`${BRAND.nameAr} · ${BRAND.nameEn}`}
      fittingType={fittingType}
      className={cn(className)}
      {...props}
    />
  );
}