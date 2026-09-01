import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import { Plug } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

export default function CommitteeIntegrations() {
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("integrations");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.IntegrationConfig.list()
      .then((res) => setRecords(res || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Plug className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("التكاملات", "Integrations", lang)}</h1>
      </div>
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
                  colorClass={r.enabled ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-muted-foreground"}
                />
              </div>
              {r.category && <p className="text-xs text-muted-foreground">{r.category}</p>}
              <div className="text-xs text-muted-foreground mt-1">
                {t("مستوى النضج", "Maturity")}: {r.maturity_level} · {t("التردد", "Frequency")}: {r.sync_frequency}
              </div>
              {r.graceful_degradation && (
                <div className="text-xs text-emerald-600 mt-1">{t("✓ تدهور تدريجي", "✓ Graceful degradation")}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}