import React from "react";
import { Link } from "react-router-dom";
import { Image } from "@/components/ui/image";
import { BRAND_LOGO_URL } from "@/lib/brand";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * PlatformBrandLogo — the single official LIJAN™ logo component.
 * Renders the approved brand lockup (Arabic name + English name + emblem + Powered by CONNECTION™).
 * Use this everywhere the platform identity must appear — sidebars, headers, auth pages, errors, print.
 *
 * Props:
 *  size: "mobile" | "standard" | "large"  (controls max-width)
 *  placement: "sidebar" | "header" | "auth" | "print"  (controls surface treatment)
 *  locale: "ar" | "en"  (auto-detected from LanguageContext if omitted)
 *  linked: boolean  (wraps in <Link to="/"> when true, default true)
 */
const SIZE_WIDTHS = {
  mobile: 140,
  standard: 175,
  large: 300,
};

export default function PlatformBrandLogo({
  size = "standard",
  placement = "sidebar",
  locale,
  linked = true,
  className,
}) {
  const { lang } = useLanguage();
  const effectiveLocale = locale || lang;
  const isAr = effectiveLocale === "ar";

  const altText = isAr
    ? "لجان — نظام تشغيل المجالس واللجان الوطنية، مدعوم من CONNECTION"
    : "LIJAN — National Councils & Committees Operating System, Powered by CONNECTION";

  const maxWidth = SIZE_WIDTHS[size] || SIZE_WIDTHS.standard;

  // The logo has black text + maroon emblem on a transparent background.
  // On dark surfaces (maroon sidebar) we add a white surface so text stays legible.
  const needsLightSurface = placement === "sidebar";

  const logoEl = (
    <div
      className={cn(
        "inline-flex items-center",
        needsLightSurface && "bg-white rounded-md px-2 py-1.5",
        className
      )}
      style={{ maxWidth: `${maxWidth}px` }}
    >
      <Image
        src={BRAND_LOGO_URL}
        alt={altText}
        fittingType="fit"
        className="w-full h-auto"
      />
    </div>
  );

  if (!linked) return logoEl;

  return (
    <Link
      to="/"
      aria-label={isAr ? "العودة إلى الرئيسية" : "Go to home"}
      className="inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {logoEl}
    </Link>
  );
}