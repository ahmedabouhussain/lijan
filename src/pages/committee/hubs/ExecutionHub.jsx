import React from "react";
import CommitteeHubTabs from "@/components/raqeem/CommitteeHubTabs";
import CommitteeActions from "@/pages/committee/CommitteeActions";
import CommitteeEvidence from "@/pages/committee/CommitteeEvidence";
import CommitteeRisks from "@/pages/committee/CommitteeRisks";
import CommitteeDependencies from "@/pages/committee/CommitteeDependencies";
import CommitteeEscalations from "@/pages/committee/CommitteeEscalations";
import CommitteeWorkstreams from "@/pages/committee/CommitteeWorkstreams";
import { CheckSquare, FileCheck, Network, GitBranch, TrendingUp, Layers } from "lucide-react";

const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

export default function ExecutionHub() {
  return (
    <CommitteeHubTabs
      hubKey="execution"
      hubLabel="التنفيذ والمتابعة"
      hubLabelEn="Execution & Follow-up"
      tabs={[
        { key: "actions", label: "الإجراءات", labelEn: "Actions", icon: CheckSquare, component: CommitteeActions },
        { key: "workstreams", label: "مجموعات العمل", labelEn: "Work Groups", icon: Layers, component: CommitteeWorkstreams },
        { key: "evidence", label: "الأدلة", labelEn: "Evidence", icon: FileCheck, component: CommitteeEvidence },
        { key: "risks", label: "المخاطر", labelEn: "Risks", icon: Network, component: CommitteeRisks, roles: ADMIN_ROLES },
        { key: "dependencies", label: "التبعيات", labelEn: "Dependencies", icon: GitBranch, component: CommitteeDependencies, roles: ADMIN_ROLES },
        { key: "escalations", label: "التصعيدات", labelEn: "Escalations", icon: TrendingUp, component: CommitteeEscalations, roles: ADMIN_ROLES },
      ]}
    />
  );
}