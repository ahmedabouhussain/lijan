import React from "react";
import { Image } from "@/components/ui/image";
import { BRAND_LOGO_URL } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Reusable RAQEEM logo — renders the official brand mark at any size.
// fittingType="fit" (contain, default) preserves the full logo; "fill" crops.
export default function BrandLogo({ className, fittingType = "fit", ...props }) {
  return (
    <Image
      src={BRAND_LOGO_URL}
      alt="رَقِيم · RAQEEM"
      fittingType={fittingType}
      className={cn(className)}
      {...props}
    />
  );
}