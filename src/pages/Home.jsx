import React from "react";
import { ShieldCheck, Gavel, FileText, Users, ShieldAlert } from "lucide-react";
import { useGovernanceData, GOVERNANCE_ROLES } from "@/components/raqeem/home/shared";
import ExecutiveHome from "@/components/raqeem/home/ExecutiveHome";
import ChairHome from "@/components/raqeem/home/ChairHome";
import SecretaryHome from "@/components/raqeem/home/SecretaryHome";
import MemberHome from "@/components/raqeem/home/MemberHome";
import AuditorHome from "@/components/raqeem/home/AuditorHome";

const ROLE_COMPONENTS = {
  executive: ExecutiveHome,
  chair: ChairHome,
  secretary: SecretaryHome,
  member: MemberHome,
  auditor: AuditorHome,
};

const ROLE_ICONS = {
  executive: ShieldCheck,
  chair: Gavel,
  secretary: FileText,
  member: Users,
  auditor: ShieldAlert,
};

export default function Home() {
  const { loading, ...data } = useGovernanceData();
  const { user, institution } = data;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const governanceRole = user?.governance_role || "member";
  const RoleComponent = ROLE_COMPONENTS[governanceRole] || MemberHome;
  const RoleIcon = ROLE_ICONS[governanceRole] || Users;
  const roleLabel = GOVERNANCE_ROLES[governanceRole] || GOVERNANCE_ROLES.member;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {institution ? `${institution.name_ar} · ${institution.name_en}` : "المجلس الأعلى للحوكمة · Supreme Council for Governance"}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">{roleLabel.ar} · {roleLabel.en}</h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
            <RoleIcon className="w-3 h-3" /> {roleLabel.en} Home
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {governanceRole === "executive" && "نظرة استراتيجية على صحة اللجان والمخاطر والقرارات التنفيذية"}
          {governanceRole === "chair" && "إدارة الأعمال والقرارات والتصعيدات والحوكمة"}
          {governanceRole === "secretary" && "تنظيم الاجتماعات وجداول الأعمال والمتابعات"}
          {governanceRole === "member" && "اجتماعاتك ووثائقك ومهامك وتصويتاتك"}
          {governanceRole === "auditor" && "اكتمال التدقيق وفجوات التتبع وحزم التدقيق"}
        </p>
      </div>

      <RoleComponent data={data} />
    </div>
  );
}