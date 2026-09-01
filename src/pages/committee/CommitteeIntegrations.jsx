import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { Plug, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const SYSTEM_OPTIONS = [
  { value: "teams", label_ar: "Microsoft Teams", label_en: "Microsoft Teams" },
  { value: "zoom", label_ar: "Zoom", label_en: "Zoom" },
  { value: "webex", label_ar: "Webex", label_en: "Webex" },
  { value: "google_meet", label_ar: "Google Meet", label_en: "Google Meet" },
  { value: "outlook", label_ar: "Outlook", label_en: "Outlook" },
  { value: "google_calendar", label_ar: "Google Calendar", label_en: "Google Calendar" },
  { value: "sharepoint", label_ar: "SharePoint", label_en: "SharePoint" },
  { value: "google_drive", label_ar: "Google Drive", label_en: "Google Drive" },
  { value: "esign", label_ar: "E-Signature", label_en: "E-Signature" },
];

export default function CommitteeIntegrations() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("integrations");
  const { canManageIntegrations } = useCommitteeAdmin();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const orgId = data?.committee?.organization_id;

  const fetchRecords = async () => {
    try {
      const all = await base44.entities.IntegrationConfig.filter({ organization_id: orgId });
      setRecords(all || []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [orgId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("التكاملات", "Integrations", lang)}</h1>
          <span className="text-sm text-muted-foreground">({records.length})</span>
        </div>
        {canManageIntegrations && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("تكامل جديد", "Add Integration")}
          </Button>
        )}
      </div>

      {showCreate && canManageIntegrations && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("تكوين تكامل", "Configure Integration")}
          functionName="CreateCommitteeRecord"
          payload={{
            entity_type: "IntegrationConfig",
            organization_id: orgId,
            enabled: false,
          }}
          onSuccess={fetchRecords}
          submitLabel={t("حفظ", "Save")}
          fields={[
            { name: "system", label: t("النظام", "System"), type: "select", required: true, options: SYSTEM_OPTIONS },
            { name: "system_name", label: t("الاسم المعروض", "Display Name"), fullWidth: true },
            { name: "category", label: t("الفئة", "Category"), placeholder: "Video / Calendar / Storage" },
            { name: "sync_frequency", label: t("تردد المزاممة", "Sync Frequency"), type: "select", options: [
              { value: "realtime", label_ar: "فوري", label_en: "Realtime" },
              { value: "hourly", label_ar: "كل ساعة", label_en: "Hourly" },
              { value: "daily", label_ar: "يومي", label_en: "Daily" },
              { value: "manual", label_ar: "يدوي", label_en: "Manual" },
            ]},
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={Plug} title={t("لا توجد تكاملات", "No Integrations")} description={t("لم يتم تكوين أي تكاملات.", "No integrations configured.")} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map((r) => (
            <div key={r.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{r.system_name || r.system}</span>
                <StatusBadge
                  label={r.enabled ? t("مُفعّل", "Enabled") : t("معطّل", "Disabled")}
                  colorClass={r.enabled ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}
                />
              </div>
              {r.category && <p className="text-xs text-muted-foreground">{r.category}</p>}
              {r.sync_frequency && <p className="text-xs text-muted-foreground mt-1">{t("التردد", "Frequency")}: {r.sync_frequency}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}