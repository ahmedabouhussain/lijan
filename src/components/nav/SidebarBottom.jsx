import React from "react";
import { Link } from "react-router-dom";
import { Languages, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import AgentChatPanel from "@/components/raqeem/AgentChatPanel";
import NotificationCenter from "@/components/raqeem/NotificationCenter";
import ThemeToggle from "@/components/raqeem/ThemeToggle";
import PoweredByConnection from "@/components/brand/PoweredByConnection";

// The bottom region, fixed in place under the scrolling navigation:
// the assistant's entry, then the account, then language and notifications.
// Nothing here floats over the navigation, and the assistant never hides the last item.

export default function SidebarBottom({ account = null, collapsed = false, onNavigate }) {
  const { t, lang, toggleLang } = useLanguage();

  return (
    <div className="border-t border-sidebar-border/70">
      {/* «أمين» — a full row inside the sidebar when open, a round icon when collapsed. */}
      <div className={cn("py-2.5", collapsed ? "px-3" : "px-3")}>
        <AgentChatPanel variant="nav" collapsed={collapsed} />
      </div>

      {account && (
        <div className="border-t border-sidebar-border/70 px-3 py-2.5">
          <Link
            to={account.to}
            onClick={onNavigate}
            title={collapsed ? account.name : undefined}
            className={cn(
              "flex items-center rounded-control transition-colors sovereign-focus",
              "hover:bg-white/[0.06]",
              collapsed ? "justify-center min-h-[40px]" : "gap-2.5 min-h-[44px] px-1"
            )}
          >
            <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-sidebar-foreground" aria-hidden="true" />
            </span>
            {!collapsed && (
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-sidebar-foreground truncate">{account.name}</span>
                {account.detail && (
                  <span className="block text-[11px] text-sidebar-foreground/55 truncate">{account.detail}</span>
                )}
              </span>
            )}
          </Link>
        </div>
      )}

      <div
        className={cn(
          "border-t border-sidebar-border/70 px-3 py-2.5 flex items-center",
          collapsed ? "flex-col gap-2" : "justify-between"
        )}
      >
        {collapsed ? (
          <button
            type="button"
            onClick={toggleLang}
            aria-label={t("تغيير اللغة", "Change language")}
            title={t("تغيير اللغة", "Change language")}
            className="flex items-center justify-center w-9 h-9 rounded-control text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/[0.06] transition-colors sovereign-focus"
          >
            <Languages className="w-4 h-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleLang}
            className="inline-flex items-center gap-2 min-h-[36px] rounded-control px-2 text-[12px] text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-white/[0.06] transition-colors sovereign-focus"
          >
            <Languages className="w-4 h-4" aria-hidden="true" />
            {lang === "ar" ? "English" : "العربية"}
          </button>
        )}
        <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-1")}>
          <ThemeToggle variant="nav" collapsed={collapsed} />
          <NotificationCenter />
        </div>
      </div>

      {!collapsed && (
        <div className="border-t border-sidebar-border/70 px-3 py-3">
          <PoweredByConnection variant="light" />
        </div>
      )}
    </div>
  );
}