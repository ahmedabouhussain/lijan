import React from "react";
import CommitteeHubTabs from "@/components/raqeem/CommitteeHubTabs";
import CommitteeMandate from "@/pages/committee/CommitteeMandate";
import CommitteeGovernanceRules from "@/pages/committee/CommitteeGovernanceRules";
import CommitteeIntegrations from "@/pages/committee/CommitteeIntegrations";
import CommitteeNotifications from "@/pages/committee/CommitteeNotifications";
import CommitteeClosure from "@/pages/committee/CommitteeClosure";
import CommitteeSettings from "@/pages/committee/CommitteeSettings";
import GovernanceSurfaceRegistry from "@/pages/committee/GovernanceSurfaceRegistry";
import { ScrollText, BookOpen, Plug, Bell, Lock, Settings, ShieldCheck } from "lucide-react";

const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

export default function GovernanceHub() {
  return (
    <CommitteeHubTabs
      hubKey="governance"
      hubLabel="إدارة اللجنة"
      hubLabelEn="Committee Management"
      tabs={[
        { key: "mandate", label: "الصلاحية", labelEn: "Mandate", icon: ScrollText, component: CommitteeMandate },
        { key: "governance-rules", label: "قواعد الحوكمة", labelEn: "Governance Rules", icon: BookOpen, component: CommitteeGovernanceRules, roles: ADMIN_ROLES },
        { key: "surfaces", label: "سجل الأسطح المحكومة", labelEn: "Governed Surface Registry", icon: ShieldCheck, component: GovernanceSurfaceRegistry },
        { key: "integrations", label: "التكاملات", labelEn: "Integrations", icon: Plug, component: CommitteeIntegrations, roles: ADMIN_ROLES },
        { key: "notifications", label: "الإشعارات", labelEn: "Notifications", icon: Bell, component: CommitteeNotifications, roles: ADMIN_ROLES },
        { key: "settings", label: "الإعدادات", labelEn: "Settings", icon: Settings, component: CommitteeSettings, roles: ADMIN_ROLES },
        { key: "closure", label: "إغلاق اللجنة", labelEn: "Closure", icon: Lock, component: CommitteeClosure, roles: ["chair", "vice_chair"] },
      ]}
    />
  );
}