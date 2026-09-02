import React, { useState } from "react";
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
import BrandWordmark from "@/components/brand/BrandWordmark";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";

// Role-Adaptive Navigation — admin roles see all; members/observers see only what serves their role.
const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

const NAV_GROUPS = [
  {
    label: "الرئيسية", labelEn: "Home",
    items: [{ to: "", label: "الرئيسية", labelEn: "Home", icon: LayoutDashboard }],
  },
  {
    label: "الأشخاص والتشكيل", labelEn: "People & Formation",
    items: [
      { to: "/members", label: "الأعضاء", labelEn: "Members", icon: Users },
      { to: "/formation", label: "التشكيل", labelEn: "Formation", icon: GitBranch, roles: ADMIN_ROLES },
      { to: "/establishment", label: "التأسيس والسندات", labelEn: "Establishment", icon: ScrollText, roles: ADMIN_ROLES },
      { to: "/formation-history", label: "سجل التشكيل", labelEn: "Formation History", icon: History, roles: ADMIN_ROLES },
      { to: "/amendments", label: "التعديلات", labelEn: "Amendments", icon: GitBranch, roles: ADMIN_ROLES },
      { to: "/roles", label: "الأدوار", labelEn: "Roles", icon: Award, roles: ADMIN_ROLES },
      { to: "/delegations", label: "التفويضات", labelEn: "Delegations", icon: ArrowLeftRight, roles: ADMIN_ROLES },
      { to: "/alternates", label: "البدلاء", labelEn: "Alternates", icon: Users2, roles: ADMIN_ROLES },
      { to: "/recusals", label: "التنحي والتعارض", labelEn: "Conflicts & Recusals", icon: ShieldOff },
    ],
  },
  {
    label: "الاجتماعات", labelEn: "Meetings",
    items: [
      { to: "/meetings", label: "الاجتماعات", labelEn: "Meetings", icon: Calendar },
      { to: "/calendar", label: "التقويم", labelEn: "Calendar", icon: Calendar },
      { to: "/agenda", label: "جدول الأعمال", labelEn: "Agenda", icon: ClipboardList },
      { to: "/packs", label: "حزم الاجتماعات", labelEn: "Meeting Packs", icon: Package, roles: ADMIN_ROLES },
      { to: "/attendance", label: "الحضور", labelEn: "Attendance", icon: UserCheck },
    ],
  },
  {
    label: "السجلات الرسمية", labelEn: "Official Records",
    items: [
      { to: "/documents", label: "الوثائق", labelEn: "Documents", icon: FileText },
      { to: "/minutes", label: "المحاضر", labelEn: "Minutes", icon: FileText },
      { to: "/voting", label: "التصويت", labelEn: "Voting", icon: CheckSquare },
      { to: "/decisions", label: "القرارات", labelEn: "Decisions", icon: Gavel },
      { to: "/signatures", label: "التواقيع", labelEn: "Signatures", icon: PenLine },
    ],
  },
  {
    label: "التنفيذ والمتابعة", labelEn: "Execution & Follow-up",
    items: [
      { to: "/actions", label: "الإجراءات", labelEn: "Actions", icon: CheckSquare },
      { to: "/evidence", label: "الأدلة", labelEn: "Evidence", icon: FileCheck },
      { to: "/risks", label: "المخاطر", labelEn: "Risks", icon: Network, roles: ADMIN_ROLES },
      { to: "/dependencies", label: "التبعيات", labelEn: "Dependencies", icon: GitBranch, roles: ADMIN_ROLES },
      { to: "/escalations", label: "التصعيدات", labelEn: "Escalations", icon: TrendingUp, roles: ADMIN_ROLES },
    ],
  },
  {
    label: "الذكاء والتقارير", labelEn: "Intelligence & Reports",
    items: [
      { to: "/products", label: "مصنع المنتجات", labelEn: "Product Factory", icon: Package, roles: ADMIN_ROLES },
      { to: "/reports", label: "مركز التقارير", labelEn: "Report Center", icon: BarChart3 },
      { to: "/memory", label: "ذاكرة اللجنة", labelEn: "Committee Memory", icon: Brain },
      { to: "/ai", label: "ذكاء اللجنة", labelEn: "Committee AI", icon: Bot, roles: ADMIN_ROLES },
      { to: "/audit", label: "التدقيق", labelEn: "Audit Trail", icon: ShieldCheck, roles: ADMIN_ROLES },
    ],
  },
  {
    label: "الحوكمة والإدارة", labelEn: "Governance & Administration",
    items: [
      { to: "/mandate", label: "الصلاحية", labelEn: "Mandate", icon: ScrollText },
      { to: "/governance-rules", label: "قواعد الحوكمة", labelEn: "Governance Rules", icon: BookOpen, roles: ADMIN_ROLES },
      { to: "/integrations", label: "التكاملات", labelEn: "Integrations", icon: Plug, roles: ADMIN_ROLES },
      { to: "/notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell, roles: ADMIN_ROLES },
      { to: "/closure", label: "إغلاق اللجنة", labelEn: "Closure", icon: Lock, roles: ["chair", "vice_chair"] },
      { to: "/settings", label: "الإعدادات", labelEn: "Settings", icon: Settings, roles: ADMIN_ROLES },
    ],
  },
];

function CommitteeShell() {
  const { orgRef, committeeRef } = useParams();
  const location = useLocation();
  const { data, loading, error } = useCommittee();
  const { t } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

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
        <Link to={`/o/${orgRef}`} className="text-primary hover:underline text-sm">
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

  const toggleGroup = (label) => setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

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

      {/* Committee identity */}
      <div className="px-4 py-3 border-b border-sidebar-border">
        <Link to={`/o/${orgRef}`} className="flex items-center gap-1.5 text-xs text-sidebar-foreground/50 mb-2 hover:text-sidebar-foreground/80">
          <ChevronLeft className="w-3 h-3" />
          {t("بوابة المنظمة", "Organization Portal")}
        </Link>
        <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">{committee.name_ar || committee.name_en}</h1>
        <p className="text-[11px] text-sidebar-foreground/50 mt-0.5">{committee.name_en}</p>
        <div className="flex items-center gap-2 mt-2">
          <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} size="sm" />
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
        {/* Switch Committee */}
        <Link
          to={`/o/${orgRef}/committees`}
          className="mt-2 flex items-center gap-1.5 text-[11px] text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors"
        >
          <ArrowLeftRight className="w-3 h-3" />
          {t("تبديل اللجنة", "Switch Committee")}
        </Link>
      </div>

      {/* Navigation with progressive disclosure — role-adaptive */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          // Filter items by role — members/observers don't see admin tools
          const visibleItems = group.items.filter((item) => {
            if (!item.roles) return true;
            return item.roles.includes(my_role);
          });
          if (visibleItems.length === 0) return null;

          const collapsed = collapsedGroups[group.label];
          // Auto-expand if any visible item in this group is active
          const hasActive = visibleItems.some((item) => {
            const to = item.to === "" ? base : `${base}${item.to}`;
            return item.to === "" ? location.pathname === base : (location.pathname === to || location.pathname.startsWith(to + "/"));
          });
          const show = !collapsed || hasActive;
          return (
            <div key={group.label} className="mb-2">
              <button
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40 hover:text-sidebar-foreground/60"
              >
                <span>{t(group.label, group.labelEn)}</span>
                <ChevronDown className={cn("w-3 h-3 transition-transform", show ? "" : "-rotate-90")} />
              </button>
              {show && visibleItems.map((item) => {
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
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
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
            </div>
          );
        })}
      </nav>

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
    <div className="min-h-screen bg-background flex" dir={document.documentElement.dir}>
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
            <span className="font-bold text-sm">{committee.name_ar || committee.name_en}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Link to={`/o/${orgRef}`} className="text-primary">
              <ChevronLeft className="w-5 h-5" />
            </Link>
          </div>
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

export default function CommitteeLayout() {
  return (
    <CommitteeProvider>
      <CommitteeShell />
    </CommitteeProvider>
  );
}