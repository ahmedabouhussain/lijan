import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  Plug,
  Video,
  Mail,
  Calendar,
  FileText,
  ShieldCheck,
  Building2,
  PenTool,
  Database,
  Layers,
  AlertCircle,
} from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";

const INTEGRATION_CATALOG = [
  {
    category: "الهوية والدخول · Identity",
    icon: ShieldCheck,
    items: [
      { name: "Microsoft Entra ID", system: "government_api", desc: "دخول موحد للمؤسسة" },
      { name: "Government Identity", system: "government_api", desc: "مزود هوية وطني معتمد" },
      { name: "Active Directory / SSO", system: "other", desc: "مزامنة الدليل المؤسسي" },
    ],
  },
  {
    category: "البريد والتقويم · Productivity",
    icon: Mail,
    items: [
      { name: "Microsoft 365 / Outlook", system: "outlook", desc: "بريد وتقويم مؤسسي" },
      { name: "Google Workspace", system: "gmail", desc: "بريد وتقويم" },
      { name: "Google Calendar", system: "google_calendar", desc: "مزامنة التقويم" },
    ],
  },
  {
    category: "الاجتماعات · Meetings",
    icon: Video,
    items: [
      { name: "Microsoft Teams", system: "teams", desc: "قناة اجتماعات" },
      { name: "Zoom", system: "zoom", desc: "قناة اجتماعات" },
      { name: "Cisco Webex", system: "webex", desc: "قناة اجتماعات" },
      { name: "Google Meet", system: "google_meet", desc: "قناة اجتماعات" },
      { name: "RAQEEM Secure Channel™", system: "sovereign_channel", desc: "قناة سيادية مستقبلية" },
    ],
  },
  {
    category: "المستندات · Documents",
    icon: FileText,
    items: [
      { name: "SharePoint", system: "sharepoint", desc: "مستودع مستندات" },
      { name: "Google Drive", system: "google_drive", desc: "تخزين مستندات" },
      { name: "DMS / ECM", system: "dms", desc: "نظام إدارة مستندات" },
    ],
  },
  {
    category: "أنظمة المؤسسة · Enterprise",
    icon: Building2,
    items: [
      { name: "ERP", system: "erp", desc: "موازنة والتزامات مالية" },
      { name: "HR System", system: "hr", desc: "موظفون وأقسام" },
    ],
  },
  {
    category: "التوقيع والاعتماد · Approvals",
    icon: PenTool,
    items: [
      { name: "E-Signature", system: "esign", desc: "توقيع إلكتروني معتمد" },
    ],
  },
  {
    category: "البيانات والتحليلات · Data",
    icon: Database,
    items: [
      { name: "BI Platform", system: "other", desc: "مؤشرات وأثر" },
      { name: "Government Interoperability", system: "government_api", desc: "بوابة التشغيل البيني الوطنية" },
    ],
  },
];

export default function Integrations() {
  const [loading, setLoading] = useState(true);
  const [refs, setRefs] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.ExternalReference.list("-created_date", 200);
        setRefs(data || []);
      } catch {
        setRefs([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const connectedSystems = new Set(refs.map((r) => r.external_system));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          Integration Fabric · نسيج التكامل
        </div>
        <h1 className="text-2xl font-bold text-foreground">التكاملات · Integrations</h1>
        <p className="text-sm text-muted-foreground mt-1">
          رَقِيم لا يستبدل الأنظمة الموجودة في الدولة؛ رَقِيم يجعلها تعمل معًا حول القرار المؤسسي
        </p>
      </div>

      {/* Fabric Architecture */}
      <div className="raqeem-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">معمارية النسيج · Fabric Architecture</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-center">
          <div className="raqeem-card p-4 bg-primary/5">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">RAQEEM Core</div>
            <div className="text-sm font-semibold text-primary">النظام المرجعي للحوكمة</div>
            <div className="text-xs text-muted-foreground mt-1">القرار · المحضر · الأثر · الذاكرة</div>
          </div>
          <div className="raqeem-card p-4 bg-accent/10">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Integration Fabric</div>
            <div className="text-sm font-semibold text-accent">طبقة التكامل المحايدة</div>
            <div className="text-xs text-muted-foreground mt-1">مزودون قابلون للاستبدال</div>
          </div>
          <div className="raqeem-card p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">External Systems</div>
            <div className="text-sm font-semibold text-foreground">أنظمة الجهة والدولة</div>
            <div className="text-xs text-muted-foreground mt-1">Teams · Outlook · ERP · هوية</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">مستويات التكامل:</span> ١) قراءة · ٢) مزامنة · ٣) كتابة عكسية · ٤) تنسيق عبر أنظمة متعددة
          </p>
        </div>
      </div>

      {/* Integration Health */}
      <div className="raqeem-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Plug className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">مركز صحة التكامل · Integration Health</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">جارٍ التحميل...</div>
        ) : refs.length === 0 ? (
          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            لا توجد تكاملات مُفعّلة بعد · No integrations configured
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from(connectedSystems).map((sys) => {
              const sysRefs = refs.filter((r) => r.external_system === sys);
              const healthy = sysRefs.filter((r) => r.sync_status === "synced").length;
              return (
                <div key={sys} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-sm font-medium text-foreground">{sys}</div>
                    <div className="text-xs text-muted-foreground">{sysRefs.length} مرجع · {healthy} متزامن</div>
                  </div>
                  <StatusBadge
                    label={healthy === sysRefs.length ? "سليم" : "متأخر"}
                    colorClass={healthy === sysRefs.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Catalog */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-foreground">كتالوج التكاملات · Integration Catalog</h2>
        {INTEGRATION_CATALOG.map((cat) => (
          <div key={cat.category} className="raqeem-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <cat.icon className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-foreground">{cat.category}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.items.map((item) => {
                const connected = connectedSystems.has(item.system);
                return (
                  <div key={item.name} className="border border-border rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <StatusBadge
                        label={connected ? "متصل" : "غير مُفعّل"}
                        colorClass={connected ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}