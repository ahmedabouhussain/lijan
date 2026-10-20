import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import BrandLogo from "@/components/raqeem/BrandLogo";
import SidebarContextCard from "@/components/nav/SidebarContextCard";
import SidebarNav from "@/components/nav/SidebarNav";
import SidebarBottom from "@/components/nav/SidebarBottom";

// AppSidebar — the ONE sidebar surface for the whole platform.
//
// Four regions, in a fixed order: the platform header, the committee context card, the
// grouped navigation (the only scrolling region), and the fixed bottom region that holds
// «أمين», the account and the language/notification controls.

export default function AppSidebar({
  context = null,
  groups = [],
  account = null,
  collapsed = false,
  overlay = false,
  onToggleCollapse,
  onClose,
  onNavigate,
  className,
}) {
  const { lang, t } = useLanguage();
  const isAr = lang === "ar";
  const CollapseIcon = isAr ? ChevronRight : ChevronLeft;

  return (
    <div
      className={cn(
        "flex flex-col bg-sidebar text-sidebar-foreground overflow-hidden",
        "border-e border-sidebar-border/70 shadow-elevation-2",
        collapsed ? "w-[76px]" : "w-[296px]",
        className
      )}
    >
      {/* 1 — Platform header: the official mark, the platform name in the active
          language only, and the collapse control. */}
      <div className="shrink-0 lijan-hairline">
        <div className={cn("flex items-center py-3.5", collapsed ? "flex-col gap-2 px-3" : "gap-2.5 px-3")}>
          <Link
            to="/"
            title={isAr ? "لجان" : "LIJAN"}
            className="w-9 h-9 rounded-control overflow-hidden flex items-center justify-center shrink-0 sovereign-focus bg-card"
          >
            <BrandLogo className="w-full h-full" />
          </Link>
          {!collapsed && (
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-sidebar-foreground truncate">
              {t("لجان", "LIJAN")}
            </span>
          )}
          {overlay ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={t("إغلاق قائمة التنقل", "Close navigation menu")}
              title={t("إغلاق قائمة التنقل", "Close navigation menu")}
              className="flex items-center justify-center w-8 h-8 rounded-control text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/[0.06] transition-colors duration-150 ease-sovereign sovereign-focus"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-expanded={!collapsed}
              aria-label={collapsed ? t("توسيع الشريط", "Expand sidebar") : t("طي الشريط", "Collapse sidebar")}
              title={collapsed ? t("توسيع الشريط", "Expand sidebar") : t("طي الشريط", "Collapse sidebar")}
              className="flex items-center justify-center w-8 h-8 rounded-control text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/[0.06] transition-colors duration-150 ease-sovereign sovereign-focus"
            >
              <CollapseIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* 2 — Context card: which committee, which entity, what the person is here. */}
      <div className="shrink-0">
        <SidebarContextCard context={context} collapsed={collapsed} />
      </div>

      {/* 3 — Grouped navigation: the only scrolling region. */}
      <SidebarNav
        groups={groups}
        collapsed={collapsed}
        onNavigate={onNavigate}
        label={t("تنقل مساحة اللجنة", "Workspace navigation")}
      />

      {/* 4 — Bottom region, fixed. */}
      <div className="shrink-0">
        <SidebarBottom account={account} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </div>
  );
}