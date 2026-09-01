import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { GitBranch, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEP_TYPE = {
  requires: { ar: "يتطلب", en: "Requires" },
  blocks: { ar: "يعيق", en: "Blocks" },
  informs: { ar: "يُبلغ", en: "Informs" },
  supersedes: { ar: "يحل محل", en: "Supersedes" },
  aligns_with: { ar: "متوافق مع", en: "Aligns With" },
};

const DEP_STATUS = {
  pending: { ar: "معلق", en: "Pending", color: "bg-amber-50 text-amber-700" },
  active: { ar: "نشط", en: "Active", color: "bg-secondary text-muted-foreground" },
  resolved: { ar: "محلول", en: "Resolved", color: "bg-emerald-50 text-emerald-700" },
  broken: { ar: "مكسور", en: "Broken", color: "bg-red-50 text-red-700" },
};

const TYPE_OPTIONS = Object.entries(DEP_TYPE).map(([value, v]) => ({ value, label_ar: v.ar, label_en: v.en }));

export default function CommitteeDependencies() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("dependencies");
  const { canManageExecution } = useCommitteeAdmin();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;

  const fetchRecords = async () => {
    if (!committeeId) return;
    try {
      const all = await base44.entities.CrossEntityDependency.list();
      const filtered = (all || []).filter((d) => d.source_committee_id === committeeId || d.target_committee_id === committeeId);
      setRecords(filtered);
    } catch { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [committeeId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("التبعيات", "Dependencies", lang)}</h1>
          <span className="text-sm text-muted-foreground">({records.length})</span>
        </div>
        {canManageExecution && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("تبعية جديدة", "New Dependency")}
          </Button>
        )}
      </div>

      {showCreate && canManageExecution && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("إنشاء تبعية", "Create Dependency")}
          functionName="CreateCommitteeRecord"
          payload={{
            entity_type: "CrossEntityDependency",
            committee_id: committeeId,
            organization_id: orgId,
            source_committee_id: committeeId,
            status: "pending",
          }}
          onSuccess={fetchRecords}
          submitLabel={t("إنشاء", "Create")}
          fields={[
            { name: "target_title", label: t("الجهة الهدف", "Target"), required: true, fullWidth: true, placeholder: "National Health Council" },
            { name: "source_title", label: t("عنوان المصدر", "Source Title"), fullWidth: true },
            { name: "dependency_type", label: t("نوع التبعية", "Type"), type: "select", options: TYPE_OPTIONS },
            { name: "notes", label: t("ملاحظات", "Notes"), type: "textarea", fullWidth: true, rows: 2 },
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={GitBranch} title={t("لا توجد تبعيات", "No Dependencies")} description={t("لم يتم تسجيل تبعيات لهذه اللجنة.", "No dependencies recorded for this committee.")} />
      ) : (
        <div className="space-y-2">
          {records.map((d) => {
            const ti = DEP_TYPE[d.dependency_type] || DEP_TYPE.requires;
            const si = DEP_STATUS[d.status] || DEP_STATUS.pending;
            return (
              <div key={d.id} className="raqeem-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">
                    <span className="font-medium">{d.source_title}</span>
                    <span className="text-muted-foreground mx-2">—{t(ti.ar, ti.en)}→</span>
                    <span className="font-medium">{d.target_title}</span>
                  </div>
                  <StatusBadge label={t(si.ar, si.en)} colorClass={si.color} />
                </div>
                {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}