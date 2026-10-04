import React, { useState, useEffect } from "react";
import { Outlet, Link, useParams, useLocation } from "react-router-dom";
import { CommitteeProvider, useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  ChevronLeft, ChevronDown, LayoutDashboard, Users, Calendar, FileText,
  CheckSquare, BarChart3, Settings,
  Lock, UserCircle, AlertTriangle, Menu, X, ArrowLeftRight,
  ClipboardList, BookOpen, Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import PageNav from "@/components/raqeem/PageNav";
import NotificationCenter from "@/components/raqeem/NotificationCenter";
import BrandLogo from "@/components/raqeem/BrandLogo";
import OrganizationIdentity from "@/components/raqeem/OrganizationIdentity";
import { L } from "@/lib/l10n";
import BrandWordmark from "@/components/brand/BrandWordmark";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FOUNDER_EMAIL } from "@/lib/docs/catalog";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import PersonaContextPath from "@/components/demo/PersonaContextPath";

// Role-Adaptive Navigation — admin roles see all; members/observers see only what serves their role.

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
  const { isDemoMode, demoPersonaKey } = useEffectiveActor();

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
      <div className="min-h-app bg-background flex" dir={dir}>
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
    // ONE shell, four DISTINCT situations. Every one of them states what happened, why,
    // what the user can do now, and who can resolve it if they hold no authority.
    // A raw backend string is never shown.
    const raw = String(error || "");
    const isAccessDenied = /401|403|unauthor|forbidden|denied|غير مصرح|صلاحية/i.test(raw);
    const isServiceLimited = /network|fetch|timeout|offline|unavailable|اتصال|الخدمة/i.test(raw);
    const state = !committeeRef
      ? {
          icon: ClipboardList,
          plate: "bg-accent/8 ring-accent/15",
          ink: "text-accent",
          title: t("يجب اختيار لجنة", "Select a committee first"),
          why: t("لم يحدد الرابط الحالي أي لجنة.", "The current link does not specify a committee."),
          next: t("افتح اللجنة من مساحة العمل أو من بوابة المنظمة.", "Open the committee from the workspace or the organization portal."),
        }
      : isAccessDenied
      ? {
          icon: Lock,
          plate: "bg-destructive/8 ring-destructive/15",
          ink: "text-destructive",
          title: t("لا تملك صلاحية الوصول إلى هذه اللجنة", "You do not have access to this committee"),
          why: t("لا توجد عضوية مسندة إلى حسابك في هذه اللجنة، أو تم سحب الصلاحية.", "No membership is assigned to your account in this committee, or the grant was withdrawn."),
          next: t("اطلب إسناد العضوية من مدير اللجنة أو من مسؤول الجهة.", "Ask the committee administrator or your organization administrator to assign your membership."),
        }
      : isServiceLimited
      ? {
          icon: Plug,
          plate: "bg-accent/8 ring-accent/15",
          ink: "text-accent",
          retry: true,
          title: t("تعذّر الوصول إلى الخدمة", "The service could not be reached"),
          why: t("الاتصال غير مستقر أو الخدمة محدودة مؤقتًا. لا تُعرض أي بيانات محفوظة محليًا.", "The connection is unstable, or the service is temporarily limited. No locally cached records are shown."),
          next: t("أعد المحاولة بعد استقرار الاتصال.", "Retry once the connection is stable."),
        }
      : {
          icon: AlertTriangle,
          plate: "bg-destructive/8 ring-destructive/15",
          ink: "text-destructive",
          title: t("هذه اللجنة غير متاحة في النطاق الحالي", "This committee is not available in the current scope"),
          why: t("قد يكون الرابط قديمًا أو يخص لجنة خارج اللجان المسندة إليك.", "The link may be outdated, or point to a committee outside the ones assigned to you."),
          next: t("افتح اللجنة من مساحة العمل أو من بوابة المنظمة.", "Open the committee from the workspace or the organization portal."),
        };
    return (
      <div className="flex flex-col items-center justify-center min-h-app gap-3 px-4" dir={dir}>
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center ring-1", state.plate)}>
          <state.icon className={cn("w-7 h-7", state.ink)} aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-foreground max-w-md text-center">{state.title}</p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{state.why}</p>
        <p className="text-xs text-muted-foreground max-w-md text-center">{state.next}</p>
        {state.retry ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-primary hover:underline text-sm font-medium sovereign-focus"
          >
            {t("إعادة المحاولة", "Retry")}
          </button>
        ) : (
          <Link to={`/o/${orgRef}`} className="text-primary hover:underline text-sm font-medium">
            {t("العودة للبوابة", "Back to Portal")}
          </Link>
        )}
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
          aria-expanded={!infoCollapsed}
          className="w-full flex items-center justify-between sovereign-focus"
        >
          <h1 className="text-sm font-bold text-sidebar-foreground leading-tight">{L.name(committee)}</h1>
          <ChevronDown className={cn("w-4 h-4 text-sidebar-foreground/40 transition-transform shrink-0", infoCollapsed ? "" : "rotate-180")} />
        </button>
        {!infoCollapsed && (
          <>
            <p className="text-[11px] text-sidebar-foreground/50 mt-0.5">{committee.name_en}</p>
            {/* The institution that owns this committee — never the committee name itself */}
            {data?.owning_org && (
              <span className="mt-1.5 flex items-center gap-1.5 min-w-0">
                <span className="text-[10px] text-sidebar-foreground/40 shrink-0">
                  {t("الجهة المالكة للجنة", "Committee Owning Entity")}:
                </span>
                <OrganizationIdentity
                  org={data.owning_org}
                  size="row"
                  nameClassName="text-[11px] text-sidebar-foreground/70 truncate"
                />
              </span>
            )}
            <div className="flex items-center gap-2 mt-2">
              <StatusBadge label={L.label(COMMITTEE_STATUS, committee.status, committee.status)} colorClass={COMMITTEE_STATUS[committee.status]?.color} size="sm" />
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-sidebar-accent/30 text-sidebar-accent-foreground">
                <UserCircle className="w-3 h-3" />
                {roleLabel}
              </span>
            </div>
            {is_recused && (
              <div className="mt-2 px-2 py-1 rounded bg-red-900/30 text-[11px] text-red-200">
                {t("متنحٍّ من هذه اللجنة", "Recused from this committee")}
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
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] transition-colors mb-0.5",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" aria-hidden="true" />
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
    <div className="min-h-app bg-background flex" dir={dir}>
      {/* Keyboard users reach the workspace content without traversing the whole sidebar */}
      <a
        href="#committee-main"
        className="sr-only focus:not-sr-only focus:block focus:m-3 focus:px-4 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground focus:text-sm focus:font-medium"
      >
        {t("تخطَّ إلى محتوى اللجنة", "Skip to committee content")}
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 bg-sidebar flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 bg-sidebar flex-col flex max-h-app overflow-y-auto safe-top safe-bottom">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label={t("إغلاق قائمة التنقل", "Close navigation menu")}
              className="absolute top-3 left-3 text-sidebar-foreground/60 hover:text-sidebar-foreground z-10 sovereign-focus"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label={t("فتح قائمة التنقل", "Open navigation menu")}
            className="p-1.5 rounded-md sovereign-focus"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center" style={{ background: "#FFFFFF" }}>
              <BrandLogo className="w-full h-full" />
            </div>
            <span className="font-bold text-sm">{L.name(committee)}</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Link
              to={`/o/${orgRef}`}
              aria-label={t("بوابة المنظمة", "Organization Portal")}
              className="text-primary sovereign-focus"
            >
              <ChevronLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main id="committee-main" className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
            <PageNav />
            {isDemoMode && demoPersonaKey === "DR_HAMAD_MAJEEGHEER" && <PersonaContextPath />}
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border safe-bottom safe-x">
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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-md min-w-[44px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
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