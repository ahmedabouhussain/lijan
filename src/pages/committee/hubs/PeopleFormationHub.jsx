import React from "react";
import CommitteeHubTabs from "@/components/raqeem/CommitteeHubTabs";
import CommitteeMembers from "@/pages/committee/CommitteeMembers";
import CommitteeRoles from "@/pages/committee/CommitteeRoles";
import CommitteeDelegations from "@/pages/committee/CommitteeDelegations";
import CommitteeAlternates from "@/pages/committee/CommitteeAlternates";
import CommitteeRecusals from "@/pages/committee/CommitteeRecusals";
import FormationAndAmendments from "@/components/raqeem/FormationAndAmendments";
import CommitteeEstablishment from "@/pages/committee/CommitteeEstablishment";
import FormationHistory from "@/pages/committee/FormationHistory";
import { Users, Award, ArrowLeftRight, Users2, ShieldOff, GitBranch, ScrollText, History } from "lucide-react";

const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

export default function PeopleFormationHub() {
  return (
    <CommitteeHubTabs
      hubKey="people"
      hubLabel="الأشخاص والتشكيل"
      hubLabelEn="People & Formation"
      tabs={[
        { key: "members", label: "الأعضاء", labelEn: "Members", icon: Users, component: CommitteeMembers },
        { key: "roles", label: "الأدوار", labelEn: "Roles", icon: Award, component: CommitteeRoles, roles: ADMIN_ROLES },
        { key: "delegations", label: "التفويضات", labelEn: "Delegations", icon: ArrowLeftRight, component: CommitteeDelegations, roles: ADMIN_ROLES },
        { key: "alternates", label: "البدلاء", labelEn: "Alternates", icon: Users2, component: CommitteeAlternates, roles: ADMIN_ROLES },
        { key: "recusals", label: "التنحي والتعارض", labelEn: "Conflicts & Recusals", icon: ShieldOff, component: CommitteeRecusals },
        { key: "formation-amendments", label: "التشكيل والتعديلات", labelEn: "Formation & Amendments", icon: GitBranch, component: FormationAndAmendments, roles: ADMIN_ROLES },
        { key: "establishment", label: "سندات التأسيس", labelEn: "Establishment", icon: ScrollText, component: CommitteeEstablishment, roles: ADMIN_ROLES },
        { key: "formation-history", label: "سجل التشكيل", labelEn: "Formation History", icon: History, component: FormationHistory, roles: ADMIN_ROLES },
      ]}
    />
  );
}