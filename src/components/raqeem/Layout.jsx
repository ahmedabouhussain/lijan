import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Gavel,
  CheckSquare,
  Archive,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Plug,
  Lock,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "نظرة عامة", labelEn: "Overview", icon: LayoutDashboard },
  { to: "/committees", label: "اللجان", labelEn: "Committees", icon: Users },
  { to: "/calendar", label: "التقويم", labelEn: "Calendar", icon: Calendar },
  { to: "/decisions", label: "القرارات", labelEn: "Decisions", icon: Gavel },
  { to: "/execution", label: "التنفيذ", labelEn: "Execution", icon: CheckSquare },
  { to: "/memory", label: "الذاكرة المؤسسية", labelEn: "Memory", icon: Archive },
  { to: "/integrations", label: "التكاملات", labelEn: "Integrations", icon: Plug },
  { to: "/admin", label: "الإدارة", labelEn: "Administration", icon: Settings },
];

const VAULT_ITEMS = [
  { to: "/founder-vault", label: "خزنة المؤسس", labelEn: "Founder Vault", icon: Lock },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [institution, setInstitution] = useState(null);

  useEffect(() => {
    async function loadInstitution() {
      try {
        const user = await base44.auth.me();
        if (user?.institution_id) {
          const inst = await base44.entities.Institution.get(user.institution_id).catch(() => null);
          if (inst) setInstitution(inst);
        }
      } catch {
        // Non-critical
      }
    }
    loadInstitution();
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-sidebar-background" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sidebar-foreground text-lg tracking-tight">رَقِيم™</div>
            <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">RAQEEM™</div>
          </div>
        </Link>
      </div>

      {/* Institution context */}
      <div className="px-5 py-3 border-b border-sidebar-border">
        <div className="text-[10px] text-sidebar-foreground/50 uppercase tracking-wider mb-1">المؤسسة · Institution</div>
        <div className="text-sm text-sidebar-foreground font-medium truncate">
          {institution ? institution.name_ar : "المجلس الأعلى للحوكمة"}
        </div>
        {institution && <div className="text-[10px] text-sidebar-foreground/40 truncate">{institution.name_en}</div>}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to));
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Founder Vault */}
      <div className="px-3 py-2 border-t border-sidebar-border">
        {VAULT_ITEMS.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              )}
            >
              <Lock className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User profile */}
      <div className="px-3 py-2 border-t border-sidebar-border">
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
          <span>الملف الشخصي</span>
        </Link>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <div className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wider">
          Powered by CONNECTION™
        </div>
        <div className="text-[10px] text-sidebar-foreground/40 mt-0.5">
          سلطة موثقة · قرار مُسنَد · أثر محفوظ
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex" dir="rtl">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-sidebar flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-sidebar flex-col flex">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 left-4 text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-bold">رَقِيم™</span>
          </div>
          <div className="w-5" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}