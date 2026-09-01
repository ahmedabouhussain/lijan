import React, { useState } from "react";
import { Outlet, Link, useParams, useLocation } from "react-router-dom";
import { OrgProvider, useOrg } from "@/lib/OrgContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  LayoutDashboard, Users, Bell, Settings, UserCircle,
  ShieldCheck, Menu, X, AlertTriangle, Building2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import PageNav from "@/components/raqeem/PageNav";
import BrandLogo from "@/components/raqeem/BrandLogo";

const NAV_ITEMS = [
  { to: "", label: "الرئيسية", labelEn: "Home", icon: LayoutDashboard },
  { to: "/committees", label: "لجاني", labelEn: "My Committees", icon: Users },
  { to: "/notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell },
];

function OrgShell() {
  const { orgRef } = useParams();
  const location = useLocation();
  const { data, loading, error } = useOrg();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen flex-col gap-3">
        <AlertTriangle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link to="/" className="text-primary hover:underline text-sm">{t("العودة للرئيسية", "Back to Home")}</Link>
      </div>
    );
  }

  if (!data) return null;

  const { organization: org, portal, my_role, my_membership } = data;
  const base = `/o/${orgRef}`;
  const isAdmin = my_role === "owner" || my_role === "admin";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#F9F6F2" }}>
            <BrandLogo className="w-full h-full" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sidebar-foreground text-lg tracking-tight">رَقِيم™</div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">RAQEEM™</div>
          </div>
        </Link>
      </div>

      {/* Organization context */}
      <div className="px-5 py-3 border-b border-sidebar-border">
        <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider mb-1">{t("المنظمة", "Organization")}</div>
        <div className="text-sm text-sidebar-foreground font-medium truncate">{org.name_ar || org.name_en}</div>
        <div className="text-[10px] text-sidebar-foreground/40 truncate">{org.name_en}</div>
        {portal.sandbox_badge && (
          <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[10px] bg-amber-900/30 text-amber-200">
            {t("بيئة تجريبية", "Sandbox")}
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const to = `${base}${item.to}`;
          const active = location.pathname === to || (item.to !== "" && location.pathname.startsWith(to));
          return (
            <Link
              key={item.to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{t(item.label, item.labelEn)}</span>
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-3 pb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {t("الإدارة", "Administration")}
            </div>
            <Link
              to={`${base}/admin`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                location.pathname === `${base}/admin`
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>{t("إدارة المنظمة", "Org Administration")}</span>
            </Link>
          </>
        )}
      </nav>

      {/* Profile + Create Portal */}
      <div className="px-3 py-2 border-t border-sidebar-border space-y-1">
        <Link
          to="/create-portal"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>{t("بوابة منظمة جديدة", "New Organization Portal")}</span>
        </Link>
        <Link
          to="/profile"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            location.pathname === "/profile"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
          )}
        >
          <UserCircle className="w-4 h-4 shrink-0" />
          <span>{t("الملف الشخصي", "My Profile")}</span>
        </Link>
      </div>

      <div className="px-5 py-2 border-t border-sidebar-border">
        <LanguageSwitcher />
      </div>
      <div className="px-5 py-3 border-t border-sidebar-border">
        <div className="text-[10px] text-sidebar-foreground/40">{t("سلطة موثقة · قرار مُسنَد · أثر محفوظ", "Governed Authority · Evidence-Based Decisions · Preserved Impact")}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex" dir={document.documentElement.dir}>
      <aside className="hidden lg:flex w-64 shrink-0 bg-sidebar flex-col">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar flex-col flex">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 left-4 text-sidebar-foreground/60 hover:text-sidebar-foreground">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center" style={{ background: "#F9F6F2" }}>
              <BrandLogo className="w-full h-full" />
            </div>
            <span className="font-bold text-sm">{org.name_ar || org.name_en}</span>
          </div>
          <div className="w-5" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <PageNav />
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default function OrgLayout() {
  return (
    <OrgProvider>
      <OrgShell />
    </OrgProvider>
  );
}