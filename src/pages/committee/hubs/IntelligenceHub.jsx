import React from "react";
import CommitteeHubTabs from "@/components/raqeem/CommitteeHubTabs";
import ProductCatalog from "@/pages/committee/ProductCatalog";
import ReportCenter from "@/pages/committee/ReportCenter";
import CommitteeMemory from "@/pages/committee/CommitteeMemory";
import CommitteeAI from "@/pages/committee/CommitteeAI";
import CommitteeAudit from "@/pages/committee/CommitteeAudit";
import { Package, BarChart3, Brain, Bot, ShieldCheck } from "lucide-react";

const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

export default function IntelligenceHub() {
  return (
    <CommitteeHubTabs
      tabs={[
        { key: "products", label: "مصنع المنتجات", labelEn: "Product Factory", icon: Package, component: ProductCatalog, roles: ADMIN_ROLES },
        { key: "reports", label: "مركز التقارير", labelEn: "Report Center", icon: BarChart3, component: ReportCenter },
        { key: "memory", label: "ذاكرة اللجنة", labelEn: "Committee Memory", icon: Brain, component: CommitteeMemory },
        { key: "ai", label: "ذكاء اللجنة", labelEn: "Committee AI", icon: Bot, component: CommitteeAI, roles: ADMIN_ROLES },
        { key: "audit", label: "التدقيق", labelEn: "Audit Trail", icon: ShieldCheck, component: CommitteeAudit, roles: ADMIN_ROLES },
      ]}
    />
  );
}