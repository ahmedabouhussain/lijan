import React, { useState } from "react";
import { useCommitteeScopedData } from "@/hooks/useCommitteeScoped";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import { ArrowRightLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/raqeem/EmptyState";

export default function CommitteeDelegations() {
  const { records, loading, reload } = useCommitteeScopedData("Delegation");
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription, getEmptyState } = usePageConfig("delegations");
  const { canManageGovernance } = useCommitteeAdmin();
  const [showCreate, setShowCreate] = useState(false);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;
  const members = data?.members || [];

  const MEMBER_OPTIONS = members.map((m) => ({
    value: m.full_name,
    label_ar: m.full_name,
    label_en: m.full_name,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ArrowRightLeft}
        title={getTitle("تفويضات الصلاحية", "Authority Delegations", lang)}
        actions={canManageGovernance && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t("تفويض جديد", "New Delegation")}
          </Button>
        )}
      />
      {(() => {
        const desc = getDescription("", "", lang);
        return desc ? <p className="text-sm text-muted-foreground -mt-2">{desc}</p> : null;
      })()}

      {showCreate && canManageGovernance && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("تفويض صلاحية", "Delegate Authority")}
          functionName="DelegateAuthority"
          payload={{ committee_id: committeeId, organization_id: orgId }}
          onSuccess={reload}
          submitLabel={t("تفويض", "Delegate")}
          fields={[
            { name: "from_member_name", label: t("المُفوِّض", "From"), type: "select", required: true, options: MEMBER_OPTIONS },
            { name: "to_member_name", label: t("المُفوَّض إليه", "To"), type: "select", required: true, options: MEMBER_OPTIONS },
            { name: "scope", label: t("نطاق التفويض", "Scope"), fullWidth: true, placeholder: "Sign budget approvals up to 500K QAR" },
            { name: "reason", label: t("السبب", "Reason"), type: "textarea", fullWidth: true, rows: 2 },
            { name: "start_date", label: t("تاريخ البداية", "Start Date"), type: "date" },
            { name: "end_date", label: t("تاريخ النهاية", "End Date"), type: "date" },
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title={getEmptyState("لا توجد تفويضات", "No Delegations", lang)} description={t("لم يتم تسجيل أي تفويض صلاحية لهذه اللجنة.", "No authority delegations recorded for this committee.")} />
      ) : (
        <div className="space-y-2">
          {records.map((d) => (
            <div key={d.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="font-medium">{d.from_member_name}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="font-medium">{d.to_member_name}</span>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                  {d.status === "active" ? t("نشط", "Active") : t("منتهي", "Expired")}
                </span>
              </div>
              {d.scope && <p className="text-xs text-muted-foreground mt-2">{t("النطاق", "Scope")}: {d.scope}</p>}
              {d.reason && <p className="text-xs text-muted-foreground mt-1">{t("السبب", "Reason")}: {d.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}