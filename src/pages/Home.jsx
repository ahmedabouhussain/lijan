import React from "react";
import { ShieldCheck, Gavel, FileText, Users, ShieldAlert } from "lucide-react";
import { useGovernanceData, GOVERNANCE_ROLES } from "@/components/raqeem/home/shared";
import GovernanceOverview from "@/components/raqeem/home/GovernanceOverview";

const ROLE_ICONS = {
  executive: ShieldCheck,
  chair: Gavel,
  secretary: FileText,
  member: Users,
  auditor: ShieldAlert,
};

export default function Home() {
  const { loading, ...data } = useGovernanceData();
  const { user } = data;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const governanceRole = user?.governance_role || "member";
  const RoleIcon = ROLE_ICONS[governanceRole] || Users;
  const roleLabel = GOVERNANCE_ROLES[governanceRole] || GOVERNANCE_ROLES.member;

  return <GovernanceOverview data={data} roleLabel={roleLabel} RoleIcon={RoleIcon} />;
}