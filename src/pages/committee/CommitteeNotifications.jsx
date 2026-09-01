import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { Bell } from "lucide-react";
import EmptyState from "@/components/raqeem/EmptyState";

export default function CommitteeNotifications() {
  const { t } = useLanguage();
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.NotificationConfig.list()
      .then((res) => setConfigs(res || []))
      .catch(() => setConfigs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("إعدادات الإشعارات", "Notification Settings")}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : configs.length === 0 ? (
        <EmptyState icon={Bell} title={t("لا توجد إعدادات", "No Settings")} description={t("لم يتم تكوين إعدادات الإشعارات.", "No notification settings configured.")} />
      ) : (
        <div className="space-y-2">
          {configs.map((c) => (
            <div key={c.id} className="raqeem-card p-4">
              <h3 className="text-sm font-medium capitalize mb-2">{c.config_key.replace(/_/g, " ")}</h3>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(c.payload, null, 2)}</pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}