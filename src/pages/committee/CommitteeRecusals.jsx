import React, { useState } from "react";
import { useCommitteeScopedData } from "@/hooks/useCommitteeScoped";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { ShieldOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CommitteeRecusals() {
  const { records, loading, reload } = useCommitteeScopedData("Recusal");
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription, getEmptyState } = usePageConfig("recusals");
  const { canManageGovernance } = useCommitteeAdmin();
  const [showCreate, setShowCreate] = useState(false);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;
  const members = data?.members || [];
  const MEMBER_OPTIONS = members.map((m) => ({ value: m.full_name, label_ar: m.full_name, label_en: m.full_name }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldOff className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("التنحي وتضارب المصالح", "Recusals & Conflicts", lang)}</h1>
        </div>
        {canManageGovernance && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("إقرار تعارض", "Declare Conflict")}
          </Button>
        )}
      </div>
      {(() => {
        const desc = getDescription("", "", lang);
        return desc ? <p className="text-sm text-muted-foreground -mt-2">{desc}</p> : null;
      })()}

      {showCreate && canManageGovernance && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("إقرار تعارف مصالح", "Declare Conflict of Interest")}
          functionName="DeclareConflict"
          payload={{ committee_id: committeeId, organization_id: orgId }}
          onSuccess={reload}
          submitLabel={t("تسجيل", "Record")}
          fields={[
            { name: "member_name", label: t("العضو", "Member"), type: "select", required: true, options: MEMBER_OPTIONS },
            { name: "reason", label: t("السبب", "Reason"), type: "textarea", required: true, fullWidth: true, rows: 3 },
            { name: "affected_item", label: t("البند المتأثر", "Affected Item"), fullWidth: true, placeholder: "Decision #2026/14" },
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={ShieldOff} title={t("لا توجد تنحيات", "No Recusals")} description={t("لم يتم تسجيل أي تنحي أو تضارب مصالح.", "No recusals or conflicts of interest recorded.")} />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{r.member_name}</span>
                <StatusBadge
                  label={r.status === "active" ? t("نشط", "Active") : t("مرفوع", "Lifted")}
                  colorClass={r.status === "active" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}
                />
              </div>
              {r.reason && <p className="text-xs text-muted-foreground">{t("السبب", "Reason")}: {r.reason}</p>}
              {r.start_time && <p className="text-xs text-muted-foreground mt-1">{t("من", "From")}: {r.start_time}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}