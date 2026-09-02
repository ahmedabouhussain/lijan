import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import EmptyState from "@/components/raqeem/EmptyState";
import PageHeader from "@/components/raqeem/PageHeader";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import {
  Plug, Plus, Video, Mail, Calendar, Cloud, FileSignature,
  Wifi, WifiOff, Clock, AlertTriangle, CheckCircle2, RefreshCw, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const SYSTEM_META = {
  teams: { icon: Video, label_ar: "Microsoft Teams", label_en: "Microsoft Teams", category: "فيديو واجتماعات", requires_oauth: true, provider: "microsoft_graph" },
  zoom: { icon: Video, label_ar: "Zoom", label_en: "Zoom", category: "فيديو واجتماعات", requires_oauth: false },
  webex: { icon: Video, label_ar: "Webex", label_en: "Webex", category: "فيديو واجتماعات", requires_oauth: false },
  google_meet: { icon: Video, label_ar: "Google Meet", label_en: "Google Meet", category: "فيديو واجتماعات", requires_oauth: false },
  outlook: { icon: Mail, label_ar: "Outlook", label_en: "Outlook", category: "بريد وتقويم", requires_oauth: true, provider: "microsoft_graph" },
  google_calendar: { icon: Calendar, label_ar: "Google Calendar", label_en: "Google Calendar", category: "بريد وتقويم", requires_oauth: true, provider: "googlecalendar" },
  sharepoint: { icon: Cloud, label_ar: "SharePoint", label_en: "SharePoint", category: "تخزين ومستندات", requires_oauth: true, provider: "microsoft_graph" },
  google_drive: { icon: Cloud, label_ar: "Google Drive", label_en: "Google Drive", category: "تخزين ومستندات", requires_oauth: true, provider: "googledrive" },
  esign: { icon: FileSignature, label_ar: "توقيع إلكتروني", label_en: "E-Signature", category: "توقيع واعتماد", requires_oauth: false },
};

const CONNECTION_STATES = {
  not_configured: { ar: "غير مهيأ", en: "Not Configured", icon: WifiOff, color: "bg-secondary text-muted-foreground" },
  awaiting_authorization: { ar: "بانتظار التفويض", en: "Configured — Awaiting Authorization", icon: Clock, color: "bg-amber-50 text-amber-700" },
  connected: { ar: "متصل", en: "Connected", icon: CheckCircle2, color: "bg-emerald-50 text-emerald-700" },
  degraded: { ar: "الاتصال متدهور", en: "Degraded", icon: AlertTriangle, color: "bg-orange-50 text-orange-700" },
  expired: { ar: "انتهت الصلاحية", en: "Expired", icon: Clock, color: "bg-red-50 text-red-700" },
  failed: { ar: "فشل الاتصال", en: "Failed", icon: WifiOff, color: "bg-destructive/10 text-destructive" },
  disabled: { ar: "معطّل", en: "Disabled", icon: Settings2, color: "bg-secondary text-muted-foreground" },
};

function resolveConnectionState(record, systemKey) {
  const meta = SYSTEM_META[systemKey];
  if (!record) return "not_configured";
  if (!record.enabled) return "disabled";
  if (meta?.requires_oauth) {
    // OAuth-based integrations require admin consent — not yet authorized
    return "awaiting_authorization";
  }
  // Non-OAuth integrations are "connected" if enabled
  return record.last_synced_at ? "connected" : "awaiting_authorization";
}

export default function CommitteeIntegrations() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("integrations");
  const { canManageIntegrations } = useCommitteeAdmin();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const orgId = data?.committee?.organization_id;

  const fetchRecords = async () => {
    try {
      const all = await base44.entities.IntegrationConfig.filter({ organization_id: orgId });
      setRecords(all || []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [orgId]);

  const recordsBySystem = {};
  (records || []).forEach((r) => { recordsBySystem[r.system] = r; });

  const availableSystems = Object.keys(SYSTEM_META);

  if (!data) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Plug}
        title={getTitle("التكاملات", "Integrations", lang)}
        subtitle={getDescription("ربط المنصة مع الأنظمة الخارجية", "Connect the platform with external systems", lang)}
        badge={<span className="text-sm text-muted-foreground">({availableSystems.length})</span>}
      />

      <div className="raqeem-card p-3 flex items-start gap-2.5 bg-primary/5 border-primary/15">
        <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-foreground/80 leading-relaxed">
          {lang === "ar"
            ? "التكاملات التي تتطلب تفويض OAuth (مثل Teams وOutlook) تُعرض كـ«بانتظار التفويض» حتى يمنح مسؤول المؤسسة الموافقة. لا يتم الإدعاء بالاتصال قبل اختباره فعليًا."
            : "OAuth-based integrations (Teams, Outlook) show as 'Awaiting Authorization' until an org admin grants consent. We never claim a connection is live without testing it."}
        </p>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableSystems.map((systemKey) => {
            const meta = SYSTEM_META[systemKey];
            const Icon = meta.icon;
            const record = recordsBySystem[systemKey];
            const state = resolveConnectionState(record, systemKey);
            const stateMeta = CONNECTION_STATES[state];
            const StateIcon = stateMeta.icon;

            return (
              <div key={systemKey} className="raqeem-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {lang === "ar" ? meta.label_ar : meta.label_en}
                      </h3>
                      <p className="text-xs text-muted-foreground">{meta.category}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium whitespace-nowrap ${stateMeta.color}`}>
                    <StateIcon className="w-3.5 h-3.5" aria-hidden="true" />
                    {lang === "ar" ? stateMeta.ar : stateMeta.en}
                  </span>
                </div>

                {record?.notes && (
                  <p className="text-xs text-muted-foreground">{record.notes}</p>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1 border-t border-border">
                  {record?.last_synced_at ? (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" aria-hidden="true" />
                      {t("آخر مزامنة", "Last sync")}: {new Date(record.last_synced_at).toLocaleDateString(lang === "ar" ? "ar" : "en")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" aria-hidden="true" />
                      {t("لا توجد مزامنة بعد", "No sync yet")}
                    </span>
                  )}
                  {record?.sync_frequency && (
                    <span>· {record.sync_frequency}</span>
                  )}
                </div>

                {state === "awaiting_authorization" && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                    {lang === "ar"
                      ? "هذا التكامل مهيأ لكنه ينتظر تفويض المسؤول. التواصل مع مسؤول المؤسسة لمنح الموافقة."
                      : "This integration is configured but awaiting admin consent. Contact your organization admin to authorize."}
                  </div>
                )}

                {canManageIntegrations && state === "not_configured" && (
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                    <Plus className="w-3.5 h-3.5" />
                    {t("تهيئة التكامل", "Configure Integration")}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}