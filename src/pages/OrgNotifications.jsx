import React, { useState, useEffect } from "react";
import { useOrg } from "@/lib/OrgContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { Bell } from "lucide-react";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate } from "@/lib/raqeemUtils";

export default function OrgNotifications() {
  const { data } = useOrg();
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.organization?.id) return;
    base44.entities.AuditEvent.filter({ organization_id: data.organization.id })
      .then((res) => setRecords((res || []).slice(0, 50)))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [data?.organization?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("الإشعارات", "Notifications")}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={Bell} title={t("لا توجد إشعارات", "No Notifications")} description={t("لم يتم تسجيل أي إشعارات.", "No notifications recorded.")} />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="raqeem-card p-3 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-500" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium capitalize">{r.action}</div>
                {r.entity_title && <p className="text-xs text-muted-foreground">{r.entity_title}</p>}
                {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                <div className="text-[11px] text-muted-foreground mt-1">{r.actor_name ? `${r.actor_name} · ` : ""}{formatDate(r.created_date)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}