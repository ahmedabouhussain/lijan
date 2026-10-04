import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeftRight, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import OrganizationMark from "@/components/workgroups/OrganizationMark";
import { useLanguage } from "@/lib/LanguageContext";

// The context card answers four questions in order: which entity, which committee, how it
// stands, and what the signed-in person is here. The owning entity's approved mark leads,
// stacked — never squeezed onto one crowded line. Names are shown in the active language
// only, clamped to two lines with the full name available on hover.

export default function SidebarContextCard({ context, collapsed = false }) {
  const { lang, t } = useLanguage();
  if (!context) return null;

  const isAr = lang === "ar";
  const PortalChevron = isAr ? ChevronLeft : ChevronRight;

  if (collapsed) {
    return (
      <div className="px-3 py-3 border-b border-sidebar-border flex flex-col items-center gap-2">
        <Link
          to={context.portalTo}
          title={context.name}
          aria-label={context.name}
          className="flex items-center justify-center rounded-md sovereign-focus"
        >
          <OrganizationMark org={context.org} logoUrl={context.logoUrl} size="mobile" tone="light" />
        </Link>
        {context.switchTo && (
          <Link
            to={context.switchTo}
            title={context.switchLabel}
            aria-label={context.switchLabel}
            className="flex items-center justify-center w-9 h-9 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/5 transition-colors sovereign-focus"
          >
            <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="px-3 py-3 border-b border-sidebar-border">
      <Link
        to={context.portalTo}
        className="inline-flex items-center gap-1 text-[12px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors sovereign-focus"
      >
        <PortalChevron className="w-3.5 h-3.5" aria-hidden="true" />
        {context.portalLabel}
      </Link>

      <div className="mt-2.5 flex items-start gap-3">
        <OrganizationMark org={context.org} logoUrl={context.logoUrl} size="card" tone="light" />
        <h1
          title={context.name}
          className="text-[15px] font-semibold leading-snug text-sidebar-foreground line-clamp-2 break-words min-w-0"
        >
          {context.name}
        </h1>
      </div>

      {context.orgName && (
        <p className="mt-2 text-[12px] leading-snug text-sidebar-foreground/70 line-clamp-2 break-words">
          {context.orgName}
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {context.statusLabel && (
          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] text-sidebar-foreground">
            {context.statusLabel}
          </span>
        )}
        {context.roleLabel && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-0.5 text-[11px] text-sidebar-foreground/85">
            <UserCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {context.roleLabel}
          </span>
        )}
      </div>

      {context.recusedLabel && (
        <p className="mt-2 rounded-md bg-destructive/25 px-2 py-1 text-[11px] text-sidebar-foreground">
          {context.recusedLabel}
        </p>
      )}

      {context.switchTo && (
        <Link
          to={context.switchTo}
          className={cn(
            "mt-3 flex items-center gap-2 min-h-[40px] rounded-md px-2.5 text-[13px]",
            "text-sidebar-foreground/80 hover:bg-white/5 hover:text-sidebar-foreground transition-colors sovereign-focus"
          )}
        >
          <ArrowLeftRight className="w-4 h-4 shrink-0" aria-hidden="true" />
          {context.switchLabel}
        </Link>
      )}

      {context.sandboxLabel && (
        <p className="mt-2 text-[11px] text-accent">{context.sandboxLabel}</p>
      )}

      {!context.name && !context.orgName && (
        <p className="mt-2 text-[12px] text-sidebar-foreground/50">{t("—", "—")}</p>
      )}
    </div>
  );
}