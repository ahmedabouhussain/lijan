import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Home, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";

/**
 * StickyPageNav — lightweight sticky navigation bar for standalone pages
 * (not inside CommitteeLayout/OrgLayout). Provides Back + Home buttons
 * consistent with PageNav's visual language.
 */
export default function StickyPageNav({ crumbs = [] }) {
  const navigate = useNavigate();
    const { t, lang } = useLanguage();
  const isRTL = lang === "ar";
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const allCrumbs = [{ label: t("لِجان", "LIJAN"), to: "/" }, ...crumbs];

  return (
    <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between gap-2 px-1 py-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-x-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
            aria-label={t("رجوع", "Back")}
          >
            <BackIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{t("رجوع", "Back")}</span>
          </button>

          <div className="flex items-center gap-1 min-w-0">
            {allCrumbs.map((crumb, idx) => {
              const isLast = idx === allCrumbs.length - 1;
              return (
                <React.Fragment key={crumb.to + idx}>
                  {idx > 0 && (
                    <ChevronLeft className={cn("w-3 h-3 text-muted-foreground/40 shrink-0", isRTL && "rotate-180")} />
                  )}
                  {isLast ? (
                    <span className="text-sm font-medium text-foreground truncate max-w-[120px] sm:max-w-[200px]">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.to}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors truncate max-w-[80px] sm:max-w-none"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          title={t("الرئيسية", "Home")}
        >
          <Home className="w-4 h-4" />
          <span className="hidden md:inline">{t("الرئيسية", "Home")}</span>
        </Link>
      </div>
    </div>
  );
}