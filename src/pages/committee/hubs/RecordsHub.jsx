import React from "react";
import CommitteeHubTabs from "@/components/raqeem/CommitteeHubTabs";
import CommitteeDocuments from "@/pages/committee/CommitteeDocuments";
import CommitteeMinutes from "@/pages/committee/CommitteeMinutes";
import CommitteeVoting from "@/pages/committee/CommitteeVoting";
import CommitteeDecisions from "@/pages/committee/CommitteeDecisions";
import CommitteeSignatures from "@/pages/committee/CommitteeSignatures";
import { FileText, CheckSquare, Gavel, PenLine } from "lucide-react";

export default function RecordsHub() {
  return (
    <CommitteeHubTabs
      tabs={[
        { key: "documents", label: "الوثائق", labelEn: "Documents", icon: FileText, component: CommitteeDocuments },
        { key: "minutes", label: "المحاضر", labelEn: "Minutes", icon: FileText, component: CommitteeMinutes },
        { key: "voting", label: "التصويت", labelEn: "Voting", icon: CheckSquare, component: CommitteeVoting },
        { key: "decisions", label: "القرارات", labelEn: "Decisions", icon: Gavel, component: CommitteeDecisions },
        { key: "signatures", label: "التواقيع", labelEn: "Signatures", icon: PenLine, component: CommitteeSignatures },
      ]}
    />
  );
}