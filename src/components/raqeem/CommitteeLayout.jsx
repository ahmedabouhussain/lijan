import React, { useState, useEffect } from "react";
import { Outlet, Link, useParams, useLocation } from "react-router-dom";
import { CommitteeProvider, useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  ChevronLeft, ChevronDown, LayoutDashboard, Users, Calendar, FileText,
  Gavel, CheckSquare, Network, BarChart3, Settings, ShieldCheck,
  Lock, UserCircle, AlertTriangle, Menu, X, ArrowLeftRight,
  ClipboardList, Package, UserCheck, PenLine, FileCheck, GitBranch,
  TrendingUp, Brain, Bot, ScrollText, BookOpen, Plug, Bell, Award,
  Users2, ShieldOff, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import PageNav from "@/components/raqeem/PageNav";
import NotificationCenter from "@/components/raqeem/NotificationCenter";
import BrandLogo from "@/components/raqeem/BrandLogo";
import { L } from "@/lib/l10n";
import BrandWordmark from "@/components/brand/BrandWordmark";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FOUNDER_EMAIL } from "@/lib/docs/catalog";

// Role-Adaptive Navigation — admin roles see all; members/observers see only what serves their role.
const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

const NAV_ITEMS = [
  { to: "", label: "الرئيسية", labelEn: "Home", shortLabel: "الرئيسية", shortLabelEn: "Home", icon: LayoutDashboard },
  { to: "/people", label: "الأشخاص والتشكيل", labelEn: "People & Formation", shortLabel: "الأشخاص", shortLabelEn: "People", icon: Users },
  { to: "/meetings", label: "الاجتماعات", labelEn: "Meetings", shortLabel: "الاجتماعات", shortLabelEn: "Meetings", icon: Calendar },
  { to: "/records", label: "السجلات الرسمية", labelEn: "Official Records", shortLabel: "السجلات", shortLabelEn: "Records", icon: FileText },
  { to: "/execution", label: "التنفيذ والمتابعة", labelEn: "Execution & Follow-up", shortLabel: "التنفيذ", shortLabelEn: "Execution", icon: CheckSquare },
  { to: "/intelligence", label: "التقارير والذاكرة", labelEn: "Reports & Memory", shortLabel: "التقارير", shortLabelEn: "Reports", icon: BarChart3 },
  { to: "/governance", label: "إدارة اللجنة", labelEn: "Committee Management", shortLabel: "الإدارة", shortLabelEn: "Manage", icon: Settings },
];

function CommitteeShell() {
  const { orgRef, committeeRef } = useParams();
  const location = useLocation();
  const { data, loading, error } = useCommittee();
  const { t, dir } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [infoCollapsed, setInfoCollapsed] = useState(false);
  const [showDocHub, setShowDocHub] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const isFounder = user?.email === FOUNDER_EMAIL;
    if (isFounder) { setShowDocHub(true); return; }
    base44.entities.FeatureFlag.filter({ key: "showDocumentationHubInSidebar" })
      .then((flags) => {
        const flag = flags[0];
        setShowDocHub(flag ? flag.enabled !== false : true);
      })
      .catch(() => setShowDocHub(true));
  }, [user?.email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex" dir={dir}>
        <aside className="hidden lg:flex w-60 shrink-0 bg-sidebar flex-col">
          <div className="px-4 py-2.5 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-sidebar-accent/20 sovereign-shimmer" />
              <div className="h-4 w-20 bg-sidebar-foreground/15 rounded sovereign-shimmer" />
            </div>
          </div>
          <div className="px-4 py-3 border-b border-sidebar-border space-y-2">
            <div className="h-4 w-full bg-sidebar-foreground/15 rounded sovereign-shimmer" />
            <div className="h-3 w-2/3 bg-sidebar-foreground/10 rounded sovereign-shimmer" />
          </div>
          <nav className="flex-1 px-3 py-3 space-y-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-8 bg-sidebar-foreground/10 rounded-md sovereign-shimmer" />
            ))}
          </nav>
        </aside>
        <div className="flex-1 flex flex-col">
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4">
            <div className="h-6 w-48 bg-muted/70 rounded-md sovereign-shimmer" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="raqeem-card p-5 space-y-3">
                  <div className="h-4 w-32 bg-muted/70 rounded-md sovereign-shimmer" />
                  <div className="h-3 w-full bg-muted/70 rounded-md sovereign-shimmer" />
                  <div className="h-3 w-3/4 bg-muted/70 rounded-md sovereign-shimmer" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3">
        <div className="w-16 h-16 rounded-2xl bg-destructive/8 flex items-center justify-center ring-1 ring-destructive/15">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground max-w-sm text-center">{error}</p>
        <Link to={`/o/${orgRef}`} className="text-primary hover:underline text-sm font-medium">
          {t("العودة للبوابة", "Back to Portal")}
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { committee, my_role, is_recused } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;

  const roleLabel = t(
    { chair: "رئيس اللجنة", vice_chair: "نائب الرئيس", secretary: "أمين السر", committee_administrator: "مدير اللجنة", member: "عضو", alternate: "بديل", observer: "مراقب", advisor: "مستشار" }[my_role] || my_role,
    { chair: "Committee Chair", vice_chair: "Vice Chair", secretary: "Secretary", committee_administrator: "Committee Administrator", member: "Member", alternate: "Alternate", observer: "Observer", advisor: "Advisor" }[my_role] || my_role
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-2.5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#FFFFFF" }}>
            <BrandLogo className="w-full h-full" />
          </div>
          <BrandWordmark variant="light" className="text-sm" />
        </Link>
      </div>

      {/* Committee identity — collapsible */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <Link to={`/o/${orgRef}`} className="flex items-center gap-1.5 text-xs text-sidebar-foreground/50 mb-2 hover:text-sidebar-foreground/80">
          <ChevronLeft className="w-3 h-3" />
          {t("بوابة المنظمة", "Organization Portal")}
        </Link>
        <button
          onClick={() => setInfoCollapsed(!infoCollapsed)}
          className="w-full flex items-center justify-between"
        >
          <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">{L.name(committee)}</h1>
          <ChevronDown className={cn("w-4 h-4 text-sidebar-foreground/40 transition-transform shrink-0", infoCollapsed ? "" : "rotate-180")} />
        </button>
        {!infoCollapsed && (
          <>
            <p className="text-[11px] text-sidebar-foreground/50 mt-0.5">{committee.name_en}</p>
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge label={L.label(COMMITTEE_STATUS, committee.status, committee.status)} colorClass={COMMITTEE_STATUS[committee.status]?.color} size="sm" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-sidebar-accent/30 text-sidebar-accent-foreground">
                <UserCircle className="w-3 h-3" />
                {roleLabel}
              </span>
            </div>
            {is_recused && (
              <div className="mt-2 px-2 py-1 rounded bg-red-900/30 text-[11px] text-red-200">
                {t("متتنحّ من هذه اللجنة", "Recused from this committee")}
              </div>
            )}
            <Link
              to={`/o/${orgRef}/committees`}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
            >
              <ArrowLeftRight className="w-3 h-3" />
              {t("تبديل اللجنة", "Switch Committee")}
            </Link>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          if (item.roles && !item.roles.includes(my_role)) return null;
          const to = item.to === "" ? base : `${base}${item.to}`;
          const active = item.to === ""
            ? location.pathname === base
            : location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <Link
              key={item.to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors mb-0.5",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{t(item.label, item.labelEn)}</span>
            </Link>
          );
        })}

        {/* Documentation Hub — bottom of sidebar (FeatureFlag controlled) */}
        {showDocHub && (
          <>
            <div className="my-2 border-t border-sidebar-border/50" />
            <Link
              to={`${base}/documentation`}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors mb-0.5",
                location.pathname === `${base}/documentation`
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
              )}
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>{t("مركز الوثائق والعروض", "Documentation & Executive Pack")}</span>
            </Link>
          </>
        )}
      </nav>

      {/* User profile */}
      {(() => {
        const myMembership = (data.my_memberships || [])[0];
        const displayName = L.name(myMembership, "full_name") || user?.full_name || user?.email || "";
        const displayEmail = user?.email || "";
        return (
          <div className="px-4 py-2.5 border-t border-sidebar-border flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent/30 flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-sidebar-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</div>
              <div className="text-[10px] text-sidebar-foreground/50 truncate">{displayEmail}</div>
            </div>
          </div>
        );
      })()}

      {/* Language + Notifications + Footer */}
      <div className="px-4 py-2 border-t border-sidebar-border flex items-center justify-between">
        <LanguageSwitcher />
        <NotificationCenter />
      </div>
      <div className="px-4 py-3 border-t border-sidebar-border space-y-1">
        <div className="text-[10px] text-sidebar-foreground/40">{t("نظام تشغيل المجالس واللجان الوطنية", "National Councils & Committees OS")}</div>
        <PoweredByConnection variant="light" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex" dir={dir}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-sidebar flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-sidebar flex-col flex max-h-screen overflow-y-auto">
            <button onClick={() => setMobileOpen(false)} className="absolute top-3 left-3 text-sidebar-foreground/60 hover:text-sidebar-foreground z-10">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center" style={{ background: "#FFFFFF" }}>
              <BrandLogo className="w-full h-full" />
            </div>
            <span className="font-bold text-sm">{L.name(committee)}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Link to={`/o/${orgRef}`} className="text-primary">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <PageNav />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border">
        <div className="flex items-center justify-around px-1 py-1 max-w-md mx-auto">
          {NAV_ITEMS.map((item) => {
            const to = item.to === "" ? base : `${base}${item.to}`;
            const active = item.to === ""
              ? location.pathname === base
              : location.pathname === to || location.pathname.startsWith(to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md min-w-[44px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] leading-tight">{t(item.shortLabel || item.label, item.shortLabelEn || item.labelEn)}</span>
              </Link>
            );
          })}
        </div>
      </nav>

    </div>
  );
}

export default function CommitteeLayout() {
  return (
    <CommitteeProvider>
      <CommitteeShell />
    </CommitteeProvider>
  );
}