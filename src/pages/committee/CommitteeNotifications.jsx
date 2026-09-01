import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import EmptyState from "@/components/raqeem/EmptyState";
import { Bell, Plus, Power } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CommitteeNotifications() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("notifications");
  const { canManageNotifications } = useCommitteeAdmin();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const committeeId = data?.committee?.id;
  const orgId = data?.committee?.organization_id;

  const fetchConfigs = async () => {
    try {
      const all = await base44.entities.NotificationConfig.filter({ organization_id: orgId });
      setConfigs(all || []);
    } catch { setConfigs([]); }
    setLoading(false);
  };

  useEffect(() => { fetchConfigs(); }, [orgId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("إعدادات الإشعارات", "Notification Settings", lang)}</h1>
          <span className="text-sm text-muted-foreground">({configs.length})</span>
        </div>
        {canManageNotifications && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("قاعدة جديدة", "New Rule")}
          </Button>
        )}
      </div>

      {showCreate && canManageNotifications && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("إنشاء قاعدة إشعار", "Create Notification Rule")}
          functionName="CreateCommitteeRecord"
          payload={{
            entity_type: "NotificationConfig",
            organization_id: orgId,
            committee_id: committeeId,
            enabled: true,
          }}
          onSuccess={fetchConfigs}
          submitLabel={t("إنشاء", "Create")}
          fields={[
            { name: "config_key", label: t("مفتاح القاعدة", "Rule Key"), required: true, fullWidth: true, placeholder: "meeting_reminder_24h" },
            { name: "event_type", label: t("نوع الحدث", "Event Type"), required: true, placeholder: "meeting_scheduled" },
            { name: "channel", label: t("القناة", "Channel"), type: "select", options: [
              { value: "email", label_ar: "بريد", label_en: "Email" },
              { value: "in_app", label_ar: "داخل التطبيق", label_en: "In-App" },
              { value: "sms", label_ar: "رسالة قصيرة", label_en: "SMS" },
            ]},
            { name: "template_ar", label: t("النموذج العربي", "Arabic Template"), type: "textarea", fullWidth: true, rows: 2 },
            { name: "template_en", label: t("النموذج الإنجليزي", "English Template"), type: "textarea", fullWidth: true, rows: 2 },
          ]}
        />
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : configs.length === 0 ? (
        <EmptyState icon={Bell} title={t("لا توجد إعدادات", "No Settings")} description={t("لم يتم تكوين إعدادات الإشعارات.", "No notification settings configured.")} />
      ) : (
        <div className="space-y-2">
          {configs.map((c) => (
            <div key={c.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">{c.config_key?.replace(/_/g, " ") || "Rule"}</h3>
                <span className={`text-xs px-2 py-0.5 rounded ${c.enabled ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground"}`}>
                  {c.enabled ? t("مُفعّل", "Enabled") : t("معطّل", "Disabled")}
                </span>
              </div>
              {c.event_type && <p className="text-xs text-muted-foreground">{t("الحدث", "Event")}: {c.event_type}</p>}
              {c.channel && <p className="text-xs text-muted-foreground">{t("القناة", "Channel")}: {c.channel}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}