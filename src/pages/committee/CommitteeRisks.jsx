import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, isOverdue } from "@/lib/raqeemUtils";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { L } from "@/lib/l10n";

const RISK_LEVEL = {
  low: { ar: "منخفض", en: "Low", color: "bg-emerald-50 text-emerald-700" },
  medium: { ar: "متوسط", en: "Medium", color: "bg-amber-50 text-amber-700" },
  high: { ar: "عالي", en: "High", color: "bg-red-50 text-red-700" },
  critical: { ar: "حرج", en: "Critical", color: "bg-red-100 text-red-800" },
};

const LEVEL_OPTIONS = [
  { value: "low", label_ar: "منخفض", label_en: "Low" },
  { value: "medium", label_ar: "متوسط", label_en: "Medium" },
  { value: "high", label_ar: "عالي", label_en: "High" },
  { value: "critical", label_ar: "حرج", label_en: "Critical" },
];

export default function CommitteeRisks() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("risks");
  const { canManageExecution } = useCommitteeAdmin();
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;

  const fetchRisks = async () => {
    if (!committeeId) return;
    try {
      const all = await base44.entities.Action.filter({ committee_id: committeeId });
      // Risks are tracked as high-priority actions with a risk tag
      const riskRecords = (all || []).filter((a) => a.priority === "critical" || a.tags?.includes("risk"));
      setRisks(riskRecords);
    } catch { setRisks([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRisks(); }, [committeeId]);

  if (!data) return <TableSkeleton rows={4} />;
  const delegations = data.registers?.delegations || [];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Network}
        title={getTitle("المخاطر والتبعيات", "Risks & Dependencies", lang)}
        badge={<span className="text-sm text-muted-foreground">({risks.length})</span>}
        actions={canManageExecution && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t("مخاطرة جديدة", "New Risk")}
          </Button>
        )}
      />

      {showCreate && canManageExecution && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("تسجيل مخاطرة", "Register Risk")}
          functionName="CreateCommitteeRecord"
          payload={{
            entity_type: "Action",
            committee_id: committeeId,
            organization_id: orgId,
            status: "assigned",
            priority: "critical",
            tags: "risk",
          }}
          onSuccess={fetchRisks}
          submitLabel={t("تسجيل", "Register")}
          fields={[
            { name: "title", label: t("عنوان المخاطرة", "Risk Title"), required: true, fullWidth: true, placeholder: "Budget overrun risk" },
            { name: "title_ar", label: t("العنوان بالعربية", "Title (Arabic)"), fullWidth: true },
            { name: "owner_name", label: t("المسؤول", "Owner"), required: true, placeholder: "Risk Owner" },
            { name: "deadline", label: t("موعد المعالجة", "Resolution Deadline"), type: "date" },
            { name: "blocker", label: t("الوصف", "Description"), type: "textarea", fullWidth: true, rows: 2 },
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : risks.length === 0 ? (
        <>
          <div className="raqeem-card p-4">
            <h3 className="text-sm font-semibold mb-3">{t("التفويضات النشطة", "Active Delegations")} ({delegations.length})</h3>
            {delegations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد تفويضات نشطة", "No active delegations")}</p>
            ) : (
              <div className="space-y-2">
                {delegations.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium text-foreground">{d.from_member_name} → {d.to_member_name}</div>
                      <div className="text-xs text-muted-foreground">{d.scope || d.reason}</div>
                    </div>
                    <span className="text-xs text-muted-foreground">{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <EmptyState icon={Network} title={t("لا توجد مخاطر مسجلة", "No Risks Registered")} description={t("لم يتم تسجيل مخاطر لهذه اللجنة.", "No risks registered for this committee.")} />
        </>
      ) : (
        <div className="space-y-2">
          {risks.map((r) => {
            const ri = RISK_LEVEL[r.priority] || RISK_LEVEL.medium;
            return (
              <div key={r.id} className="raqeem-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{L.title(r)}</span>
                  <StatusBadge label={t(ri.ar, ri.en)} colorClass={ri.color} />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{t("المسؤول", "Owner")}: {r.owner_name}</div>
                  {r.deadline && <div>{t("الموعد النهائي", "Deadline")}: {formatDate(r.deadline)} {isOverdue(r.deadline) && <span className="text-red-600">({t("متأخر", "overdue")})</span>}</div>}
                  {r.blocker && <div>{r.blocker}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}