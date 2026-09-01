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
  Users2, ShieldOff, UserCog, History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import PageNav from "@/components/raqeem/PageNav";
import BrandLogo from "@/components/raqeem/BrandLogo";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";

const NAV_GROUPS = [
  {
    label: "نظرة عامة", labelEn: "Overview",
    items: [{ to: "", label: "الرئيسية", labelEn: "Home", icon: LayoutDashboard }],
  },
  {
    label: "الأشخاص", labelEn: "People",
    items: [
      { to: "/members", label: "الأعضاء", labelEn: "Members", icon: Users },
      { to: "/formation", label: "تحديثات التشكيل", labelEn: "Formation Updates", icon: UserCog },
      { to: "/roles", label: "الأدوار", labelEn: "Roles", icon: Award },
      { to: "/delegations", label: "التفويضات", labelEn: "Delegations", icon: ArrowLeftRight },
      { to: "/alternates", label: "البدلاء", labelEn: "Alternates", icon: Users2 },
      { to: "/recusals", label: "التنحي والتعارض", labelEn: "Conflicts & Recusals", icon: ShieldOff },
    ],
  },
  {
    label: "الاجتماعات", labelEn: "Meetings",
    items: [
      { to: "/meetings", label: "الاجتماعات", labelEn: "Meetings", icon: Calendar },
      { to: "/calendar", label: "التقويم", labelEn: "Calendar", icon: Calendar },
      { to: "/agenda", label: "جدول الأعمال", labelEn: "Agenda", icon: ClipboardList },
      { to: "/packs", label: "حزم الاجتماعات", labelEn: "Meeting Packs", icon: Package },
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
    label: "التنفيذ", labelEn: "Execution",
    items: [
      { to: "/actions", label: "الإجراءات", labelEn: "Actions", icon: CheckSquare },
      { to: "/evidence", label: "الأدلة", labelEn: "Evidence", icon: FileCheck },
      { to: "/risks", label: "المخاطر", labelEn: "Risks", icon: Network },
      { to: "/dependencies", label: "التبعيات", labelEn: "Dependencies", icon: GitBranch },
      { to: "/escalations", label: "التصعيدات", labelEn: "Escalations", icon: TrendingUp },
    ],
  },
  {
    label: "الذكاء والتقارير", labelEn: "Intelligence & Reporting",
    items: [
      { to: "/reports", label: "التقارير", labelEn: "Reports", icon: BarChart3 },
      { to: "/memory", label: "ذاكرة اللجنة", labelEn: "Committee Memory", icon: Brain },
      { to: "/ai", label: "ذكاء اللجنة", labelEn: "Committee AI", icon: Bot },
      { to: "/audit", label: "التدقيق", labelEn: "Audit Trail", icon: ShieldCheck },
    ],
  },
  {
    label: "الحوكمة والدستور", labelEn: "Governance & Constitution",
    items: [
      { to: "/establishment", label: "التأسيس والسندات", labelEn: "Establishment", icon: ScrollText },
      { to: "/formation-history", label: "سجل التشكيل", labelEn: "Formation History", icon: History },
      { to: "/amendments", label: "التعديلات المحوَّكة", labelEn: "Amendments", icon: GitBranch },
    ],
  },
  {
    label: "إدارة اللجنة", labelEn: "Administration",
    items: [
      { to: "/mandate", label: "الصلاحية", labelEn: "Mandate", icon: ScrollText },
      { to: "/governance-rules", label: "قواعد الحوكمة", labelEn: "Governance Rules", icon: BookOpen },
      { to: "/integrations", label: "التكاملات", labelEn: "Integrations", icon: Plug },
      { to: "/notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell },
      { to: "/closure", label: "إغلاق اللجنة", labelEn: "Closure", icon: Lock },
      { to: "/settings", label: "الإعدادات", labelEn: "Settings", icon: Settings },
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

  const { committee, my_role, is_oversight, is_recused } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;

  const roleLabel = is_oversight
    ? t("إشراف قراءة فقط", "Oversight (Read-Only)")
    : t(
        { chair: "رئيس", vice_chair: "نائب الرئيس", secretary: "أمين السر", member: "عضو", alternate: "بديل", observer: "مراقب", advisor: "مستشار" }[my_role] || my_role,
        { chair: "Chair", vice_chair: "Vice Chair", secretary: "Secretary", member: "Member", alternate: "Alternate", observer: "Observer", advisor: "Advisor" }[my_role] || my_role
      );

  const toggleGroup = (label) => setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 py-2.5 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded overflow-hidden flex items-center justify-center shrink-0" style={{ background: "#F9F6F2" }}>
            <BrandLogo className="w-full h-full" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-sidebar-foreground text-sm tracking-tight">رَقِيم™</div>
          </div>
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

      {/* Navigation with progressive disclosure */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const collapsed = collapsedGroups[group.label];
          // Auto-expand if any item in this group is active
          const hasActive = group.items.some((item) => {
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
              {show && group.items.map((item) => {
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

      {/* Language + Footer */}
      <div className="px-4 py-2 border-t border-sidebar-border">
        <LanguageSwitcher />
      </div>
      <div className="px-4 py-3 border-t border-sidebar-border">
        <div className="text-[10px] text-sidebar-foreground/40">{t("رَقِيم™ · نظام التشغيل المؤسسي", "RAQEEM™ · Institutional OS")}</div>
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
            <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center" style={{ background: "#F9F6F2" }}>
              <BrandLogo className="w-full h-full" />
            </div>
            <span className="font-bold text-sm">{committee.name_ar || committee.name_en}</span>
          </div>
          <Link to={`/o/${orgRef}`} className="text-primary">
            <ChevronLeft className="w-5 h-5" />
          </Link>
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