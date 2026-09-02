import React from "react";
import CommitteeHubTabs from "@/components/raqeem/CommitteeHubTabs";
import CommitteeReports from "@/pages/committee/CommitteeReports";
import ReportCenter from "@/pages/committee/ReportCenter";
import ProductCatalog from "@/pages/committee/ProductCatalog";
import CommitteeMemory from "@/pages/committee/CommitteeMemory";
import CommitteeAI from "@/pages/committee/CommitteeAI";
import CommitteeAudit from "@/pages/committee/CommitteeAudit";
import { BarChart3, FileText, Package, Brain, Bot, ShieldCheck } from "lucide-react";

const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

export default function IntelligenceHub() {
  return (
    <CommitteeHubTabs
      hubKey="intelligence"
      hubLabel="التقارير والذاكرة"
      hubLabelEn="Reports & Memory"
      tabs={[
        { key: "executive-summary", label: "الملخص التنفيذي", labelEn: "Executive Summary", icon: BarChart3, component: CommitteeReports },
        { key: "reports", label: "تقارير اللجنة", labelEn: "Committee Reports", icon: FileText, component: ReportCenter },
        { key: "products", label: "مركز الوثائق", labelEn: "Document Center", icon: Package, component: ProductCatalog, roles: ADMIN_ROLES },
        { key: "memory", label: "ذاكرة اللجنة", labelEn: "Committee Memory", icon: Brain, component: CommitteeMemory },
        { key: "ai", label: "ذكاء اللجنة", labelEn: "Committee AI", icon: Bot, component: CommitteeAI, roles: ADMIN_ROLES },
        { key: "audit", label: "التدقيق", labelEn: "Audit Trail", icon: ShieldCheck, component: CommitteeAudit, roles: ADMIN_ROLES },
      ]}
    />
  );
}