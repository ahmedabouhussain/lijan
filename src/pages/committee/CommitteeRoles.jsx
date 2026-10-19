import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { Award, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const ROLE_INFO = {
  chair: { ar: "الرئيس", en: "Chair", color: "bg-primary/10 text-primary" },
  vice_chair: { ar: "نائب الرئيس", en: "Vice Chair", color: "bg-primary/10 text-primary" },
  secretary: { ar: "أمين السر", en: "Secretary", color: "bg-secondary text-secondary-foreground" },
  committee_administrator: { ar: "مدير اللجنة", en: "Committee Admin", color: "bg-accent/20 text-foreground" },
  member: { ar: "عضو", en: "Member", color: "bg-secondary text-secondary-foreground" },
  alternate: { ar: "بديل", en: "Alternate", color: "bg-amber-50 text-amber-700" },
  observer: { ar: "مراقب", en: "Observer", color: "bg-secondary text-muted-foreground" },
  advisor: { ar: "مستشار", en: "Advisor", color: "bg-secondary text-muted-foreground" },
};

const AUTH_INFO = {
  decision: { ar: "قرار", en: "Decision" },
  approval: { ar: "اعتماد", en: "Approval" },
  execution: { ar: "تنفيذ", en: "Execution" },
  oversight: { ar: "إشراف", en: "Oversight" },
  escalation: { ar: "تصعيد", en: "Escalation" },
  advisory: { ar: "استشاري", en: "Advisory" },
};

const ROLE_OPTIONS = [
  { value: "chair", label_ar: "الرئيس", label_en: "Chair" },
  { value: "vice_chair", label_ar: "نائب الرئيس", label_en: "Vice Chair" },
  { value: "secretary", label_ar: "أمين السر", label_en: "Secretary" },
  { value: "committee_administrator", label_ar: "مدير اللجنة", label_en: "Committee Administrator" },
  { value: "member", label_ar: "عضو", label_en: "Member" },
  { value: "observer", label_ar: "مراقب", label_en: "Observer" },
  { value: "advisor", label_ar: "مستشار", label_en: "Advisor" },
  { value: "alternate", label_ar: "بديل", label_en: "Alternate" },
];

export default function CommitteeRoles() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("roles");
  const { canManageMembership } = useCommitteeAdmin();
  const [showCreate, setShowCreate] = useState(false);

  if (!data) return <TableSkeleton rows={4} />;
  const members = data.members || [];
  const committee = data.committee;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Award}
        title={getTitle("الأدوار والصلاحيات", "Roles & Authorities", lang)}
        subtitle={getDescription("", "", lang) || undefined}
        actions={canManageMembership && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t("تعيين دور", "Assign Role")}
          </Button>
        )}
      />

      {showCreate && canManageMembership && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("تعيين دور جديد", "Assign New Role")}
          functionName="InviteCommitteeMember"
          payload={{ committee_id: committee.id }}
          onSuccess={reload}
          submitLabel={t("تعيين", "Assign")}
          fields={[
            { name: "full_name", label: t("الاسم الكامل", "Full Name"), required: true, fullWidth: true, placeholder: "Dr. Sara Al-Kuwari" },
            { name: "email", label: t("البريد الإلكتروني", "Email"), type: "email", required: true, fullWidth: true },
            { name: "role", label: t("الدور", "Role"), type: "select", required: true, options: ROLE_OPTIONS },
            { name: "institution_name", label: t("المؤسسة", "Institution"), placeholder: "Ministry of Health" },
          ]}
        />
      )}

      {/* One table contract for the whole platform: shared header height, logical
          alignment (text-start, never a hard-coded side) and a quiet row hover. */}
      <div className="raqeem-card p-2 sm:p-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("العضو", "Member")}</TableHead>
              <TableHead>{t("الدور", "Role")}</TableHead>
              <TableHead>{t("مستوى الصلاحية", "Authority Level")}</TableHead>
              <TableHead>{t("حق التصويت", "Voting Right")}</TableHead>
              <TableHead>{t("المؤسسة", "Institution")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const ri = ROLE_INFO[m.role] || ROLE_INFO.member;
              const ai = AUTH_INFO[m.authority_level] || AUTH_INFO.decision;
              return (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.full_name || m.full_name_ar}</TableCell>
                  <TableCell><StatusBadge label={t(ri.ar, ri.en)} colorClass={ri.color} /></TableCell>
                  <TableCell className="text-muted-foreground">{t(ai.ar, ai.en)}</TableCell>
                  <TableCell>{m.voting_right ? "✓" : "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.institution_name || "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}