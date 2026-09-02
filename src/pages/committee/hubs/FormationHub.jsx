import React from "react";
import CommitteeHubTabs from "@/components/raqeem/CommitteeHubTabs";
import CommitteeFormation from "@/pages/committee/CommitteeFormation";
import CommitteeEstablishment from "@/pages/committee/CommitteeEstablishment";
import FormationHistory from "@/pages/committee/FormationHistory";
import CommitteeAmendments from "@/pages/committee/CommitteeAmendments";
import { GitBranch, ScrollText, History } from "lucide-react";

const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

export default function FormationHub() {
  return (
    <CommitteeHubTabs
      tabs={[
        { key: "formation", label: "التشكيل", labelEn: "Formation", icon: GitBranch, component: CommitteeFormation, roles: ADMIN_ROLES },
        { key: "establishment", label: "التأسيس والسندات", labelEn: "Establishment", icon: ScrollText, component: CommitteeEstablishment, roles: ADMIN_ROLES },
        { key: "formation-history", label: "سجل التشكيل", labelEn: "Formation History", icon: History, component: FormationHistory, roles: ADMIN_ROLES },
        { key: "amendments", label: "التعديلات", labelEn: "Amendments", icon: GitBranch, component: CommitteeAmendments, roles: ADMIN_ROLES },
      ]}
    />
  );
}