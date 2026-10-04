import React from "react";
import { Outlet, Link, useParams, useLocation } from "react-router-dom";
import { OrgProvider, useOrg } from "@/lib/OrgContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { LayoutDashboard, Users, Bell, Settings, Plus, AlertTriangle } from "lucide-react";
import PageNav from "@/components/raqeem/PageNav";
import { L } from "@/lib/l10n";
import AppShell from "@/components/nav/AppShell";
import ShellLoading from "@/components/nav/SidebarSkeleton";

const NAV_ITEMS = [
  { to: "", label: "الرئيسية", labelEn: "Home", icon: LayoutDashboard },
  { to: "/committees", label: "لجاني", labelEn: "My Committees", icon: Users },
  { to: "/notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell },
];

function OrgShell() {
  const { orgRef } = useParams();
  const location = useLocation();
  const { data, loading, error } = useOrg();
  const { t, dir } = useLanguage();
  const { user } = useAuth();

  if (loading) return <ShellLoading dir={dir} />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-app gap-3" dir={dir}>
        <div className="w-16 h-16 rounded-2xl bg-destructive/8 flex items-center justify-center ring-1 ring-destructive/15">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground max-w-sm text-center">{error}</p>
        <Link to="/" className="text-primary hover:underline text-sm font-medium">{t("العودة للرئيسية", "Back to Home")}</Link>
      </div>
    );
  }

  if (!data) return null;

  const { organization: org, portal, my_role } = data;
  const base = `/o/${orgRef}`;
  const isAdmin = my_role === "owner" || my_role === "admin";

  const toItem = (item) => {
    const to = `${base}${item.to}`;
    return {
      to,
      label: t(item.label, item.labelEn),
      icon: item.icon,
      active: location.pathname === to || (item.to !== "" && location.pathname.startsWith(to)),
    };
  };

  const groups = [
    {
      id: "portal",
      title: t("بوابة الجهة", "Organization Portal"),
      items: NAV_ITEMS.map(toItem),
    },
    isAdmin && {
      id: "admin",
      title: t("الإدارة", "Administration"),
      items: [{ to: `${base}/admin`, label: t("إدارة الجهة", "Org Administration"), icon: Settings, active: location.pathname === `${base}/admin` }],
    },
    {
      id: "account",
      title: t("الحساب", "Account"),
      items: [
        { to: "/", label: t("مساحتي", "My Workspace"), icon: LayoutDashboard, active: location.pathname === "/" },
        { to: "/create-portal", label: t("بوابة جهة جديدة", "New Organization Portal"), icon: Plus, active: location.pathname === "/create-portal" },
      ],
    },
  ].filter(Boolean);

  const context = {
    portalTo: "/",
    portalLabel: t("مساحتي", "My Workspace"),
    name: L.name(org),
    org,
    logoUrl: org.logo_url,
    orgLabel: t("الجهة", "Entity"),
    orgName: "",
    sandboxLabel: portal.sandbox_badge ? t("بيئة تجريبية", "Sandbox") : "",
  };

  const account = {
    name: user?.full_name || user?.email || "",
    detail: user?.email || "",
    to: "/profile",
  };

  return (
    <AppShell
      context={context}
      groups={groups}
      account={account}
      mobileTitle={L.name(org)}
      mainId="org-main"
      skipLabel={t("تخطَّ إلى محتوى الجهة", "Skip to entity content")}
    >
      <PageNav />
      <Outlet />
    </AppShell>
  );
}

export default function OrgLayout() {
  return (
    <OrgProvider>
      <OrgShell />
    </OrgProvider>
  );
}