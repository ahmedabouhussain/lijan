import React from "react";
import { Outlet, Link, useParams, useLocation } from "react-router-dom";
import { CommitteeProvider, useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import {
  LayoutDashboard, Users, Calendar, FileText, CheckSquare, BarChart3,
  Settings, Lock, AlertTriangle, ClipboardList, BookOpen, Plug, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageNav from "@/components/raqeem/PageNav";
import { L } from "@/lib/l10n";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { FOUNDER_EMAIL } from "@/lib/docs/catalog";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { getWorkGroupCapabilities } from "@/lib/workGroupPermissions";
import PersonaContextPath from "@/components/demo/PersonaContextPath";
import AppShell from "@/components/nav/AppShell";
import ShellLoading from "@/components/nav/SidebarSkeleton";

// Role-Adaptive Navigation — admin roles see all; members/observers see only what serves
// their role. Groups are the platform's own three areas, in a fixed order.

const NAV_ITEMS = [
  { to: "", group: "workspace", label: "الرئيسية", labelEn: "Home", shortLabel: "الرئيسية", shortLabelEn: "Home", icon: LayoutDashboard },
  { to: "/people", group: "workspace", label: "الأشخاص والتشكيل", labelEn: "People & Formation", shortLabel: "الأشخاص", shortLabelEn: "People", icon: Users },
  { to: "/meetings", group: "workspace", label: "الاجتماعات", labelEn: "Meetings", shortLabel: "الاجتماعات", shortLabelEn: "Meetings", icon: Calendar },
  { to: "/records", group: "workspace", label: "السجلات الرسمية", labelEn: "Official Records", shortLabel: "السجلات", shortLabelEn: "Records", icon: FileText },
  { to: "/execution", group: "execution", label: "التنفيذ والمتابعة", labelEn: "Execution & Follow-up", shortLabel: "التنفيذ", shortLabelEn: "Execution", icon: CheckSquare },
  { to: "/intelligence", group: "execution", label: "التقارير والذاكرة", labelEn: "Reports & Memory", shortLabel: "التقارير", shortLabelEn: "Reports", icon: BarChart3 },
  { to: "/governance", group: "execution", label: "إدارة اللجنة", labelEn: "Committee Management", shortLabel: "الإدارة", shortLabelEn: "Manage", icon: Settings },
];

const GROUP_TITLES = {
  workspace: ["مساحة اللجنة", "Committee Workspace"],
  execution: ["التنفيذ والحوكمة", "Execution & Governance"],
  knowledge: ["المعرفة والوثائق", "Knowledge & Documentation"],
};

function CommitteeShell() {
  const { orgRef, committeeRef } = useParams();
  const location = useLocation();
  const { data, loading, error } = useCommittee();
  const { t, dir } = useLanguage();
  const { user } = useAuth();
  const { isDemoMode, demoPersonaKey } = useEffectiveActor();
  const [showDocHub, setShowDocHub] = React.useState(true);

  React.useEffect(() => {
    const isFounder = user?.email === FOUNDER_EMAIL;
    if (isFounder) { setShowDocHub(true); return; }
    base44.entities.FeatureFlag.filter({ key: "showDocumentationHubInSidebar" })
      .then((flags) => {
        const flag = flags[0];
        setShowDocHub(flag ? flag.enabled !== false : true);
      })
      .catch(() => setShowDocHub(true));
  }, [user?.email]);

  if (loading) return <ShellLoading dir={dir} />;

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

  const { committee, my_role, is_recused, owning_org } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  // The role shown is the one stored on the membership in THIS committee — never inferred
  // from a job title or a person's name.
  const roleLabel = t(
    { chair: "رئيس اللجنة", vice_chair: "نائب الرئيس", secretary: "أمين السر", committee_administrator: "مدير اللجنة", member: "عضو", alternate: "بديل", observer: "مراقب", advisor: "مستشار" }[my_role] || my_role,
    { chair: "Committee Chair", vice_chair: "Vice Chair", secretary: "Secretary", committee_administrator: "Committee Administrator", member: "Member", alternate: "Alternate", observer: "Observer", advisor: "Advisor" }[my_role] || my_role
  );

  const permitted = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(my_role));
  const toItem = (item) => {
    const to = item.to === "" ? base : `${base}${item.to}`;
    return {
      to,
      label: t(item.label, item.labelEn),
      icon: item.icon,
      active: item.to === "" ? location.pathname === base : isActive(to),
    };
  };

  // Knowledge & Documentation — only what this actor may actually open is listed.
  const knowledgeItems = [];
  if (showDocHub) {
    knowledgeItems.push({
      to: `${base}/documentation`,
      label: t("مركز الوثائق والعروض", "Documentation & Executive Pack"),
      icon: BookOpen,
      active: isActive(`${base}/documentation`),
    });
  }
  const workGroupCaps = getWorkGroupCapabilities({
    committeeRole: my_role,
    isPlatformAdmin: user?.role === "admin",
  });
  if (workGroupCaps.canViewGroup) {
    knowledgeItems.push({
      to: `${base}/work-groups`,
      label: t("مجموعات العمل", "Work Groups"),
      icon: Layers,
      active: isActive(`${base}/work-groups`),
    });
  }

  const groups = [
    { id: "workspace", title: t(GROUP_TITLES.workspace[0], GROUP_TITLES.workspace[1]), items: permitted.filter((i) => i.group === "workspace").map(toItem) },
    { id: "execution", title: t(GROUP_TITLES.execution[0], GROUP_TITLES.execution[1]), items: permitted.filter((i) => i.group === "execution").map(toItem) },
    { id: "knowledge", title: t(GROUP_TITLES.knowledge[0], GROUP_TITLES.knowledge[1]), items: knowledgeItems },
  ].filter((group) => group.items.length > 0);

  const myMembership = (data.my_memberships || [])[0];

  const context = {
    portalTo: `/o/${orgRef}`,
    portalLabel: t("بوابة المنظمة", "Organization Portal"),
    name: L.name(committee),
    org: owning_org || null,
    logoUrl: owning_org?.logo_url || committee.logo_url,
    orgLabel: t("الجهة المالكة للجنة", "Committee Owning Entity"),
    orgName: owning_org ? L.name(owning_org) : "",
    statusLabel: L.label(COMMITTEE_STATUS, committee.status, ""),
    roleLabel,
    recusedLabel: is_recused ? t("متنحٍّ من هذه اللجنة", "Recused from this committee") : "",
    switchTo: `/o/${orgRef}/committees`,
    switchLabel: t("تبديل اللجنة", "Switch Committee"),
  };

  const account = {
    name: L.name(myMembership, "full_name") || user?.full_name || user?.email || "",
    detail: user?.email || "",
    to: "/profile",
  };

  const bottomNav = (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border safe-bottom safe-x">
      <div className="flex items-center justify-around px-1 py-1 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const to = item.to === "" ? base : `${base}${item.to}`;
          const active = item.to === "" ? location.pathname === base : isActive(to);
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
  );

  return (
    <AppShell
      context={context}
      groups={groups}
      account={account}
      mobileTitle={L.name(committee)}
      mobileBackTo={`/o/${orgRef}`}
      mobileBackLabel={t("بوابة المنظمة", "Organization Portal")}
      bottomNav={bottomNav}
      mainId="committee-main"
      skipLabel={t("تخطَّ إلى محتوى اللجنة", "Skip to committee content")}
    >
      <PageNav />
      {isDemoMode && demoPersonaKey === "DR_HAMAD_MAJEEGHEER" && <PersonaContextPath />}
      <Outlet />
    </AppShell>
  );
}

export default function CommitteeLayout() {
  return (
    <CommitteeProvider>
      <CommitteeShell />
    </CommitteeProvider>
  );
}