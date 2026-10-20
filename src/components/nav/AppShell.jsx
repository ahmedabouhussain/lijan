import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import { setShellSidebarPresence } from "@/lib/sidebarPresence";
import { useSidebarShell } from "@/components/nav/useSidebarShell";
import AppSidebar from "@/components/nav/AppSidebar";
import NotificationCenter from "@/components/raqeem/NotificationCenter";

// AppShell — the shared shell for every governed context (committee workspace, organization
// portal, work groups). It owns one sidebar, keeps it in the layout flow on desktop and over
// the content below that, and adapts the content area to the sidebar's real width so nothing
// is ever covered.

export default function AppShell({
  context = null,
  groups = [],
  account = null,
  mobileTitle = "",
  mobileBackTo = null,
  mobileBackLabel = "",
  bottomNav = null,
  mainId = "shell-main",
  skipLabel,
  children,
}) {
  const { dir, lang, t } = useLanguage();
  const { collapsed, toggleCollapsed, isDesktop, overlayOpen, openOverlay, closeOverlay } = useSidebarShell();
  const location = useLocation();
  const isAr = lang === "ar";
  const BackIcon = isAr ? ChevronLeft : ChevronRight;

  // A chosen destination always closes the panel, and the context is preserved.
  useEffect(() => {
    closeOverlay();
  }, [location.pathname, closeOverlay]);

  // While a shell is mounted it owns the assistant's entry point.
  useEffect(() => {
    setShellSidebarPresence(true);
    return () => setShellSidebarPresence(false);
  }, []);

  return (
    <div className="min-h-app bg-background flex" dir={dir}>
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:block focus:m-3 focus:px-4 focus:py-2 focus:rounded-control focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium"
      >
        {skipLabel || t("تخطَّ إلى المحتوى", "Skip to content")}
      </a>

      {/* Desktop — in the layout flow, so the content adapts instead of being covered. */}
      {isDesktop && (
        <aside className="hidden lg:flex shrink-0">
          <AppSidebar
            context={context}
            groups={groups}
            account={account}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>
      )}

      {/* Tablet & phone — a full-height panel over the content, with a scrim and Escape. */}
      {!isDesktop && overlayOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/45 backdrop-blur-[2px]" onClick={closeOverlay} aria-hidden="true" />
          <AppSidebar
            overlay
            context={context}
            groups={groups}
            account={account}
            onClose={closeOverlay}
            onNavigate={closeOverlay}
            className="relative max-h-app safe-top safe-bottom shadow-overlay"
          />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-card">
          <button
            type="button"
            onClick={openOverlay}
            aria-label={t("فتح قائمة التنقل", "Open navigation menu")}
            className="flex items-center justify-center w-10 h-10 rounded-control text-foreground hover:bg-muted transition-colors sovereign-focus"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <span className="min-w-0 flex-1 text-center text-[14px] font-semibold truncate">{mobileTitle}</span>
          <div className="flex items-center gap-1 shrink-0">
            <NotificationCenter />
            {mobileBackTo && (
              <Link
                to={mobileBackTo}
                aria-label={mobileBackLabel}
                title={mobileBackLabel}
                className="flex items-center justify-center w-10 h-10 rounded-control text-primary hover:bg-muted transition-colors sovereign-focus"
              >
                <BackIcon className="w-5 h-5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </header>

        <main
          id={mainId}
          className={cn("flex-1 overflow-y-auto", bottomNav && "pb-20 lg:pb-0")}
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">{children}</div>
        </main>
      </div>

      {bottomNav}
    </div>
  );
}