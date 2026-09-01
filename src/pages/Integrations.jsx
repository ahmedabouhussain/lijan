import React, { useEffect, useMemo, useState } from "react";
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
  Settings2,
  CheckCircle2,
  Activity,
} from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import IntegrationConfigSheet, { MATURITY_LEVELS } from "@/components/raqeem/IntegrationConfigSheet";

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

const FREQ_AR = { realtime: "لحظي", hourly: "كل ساعة", daily: "يومي", on_demand: "عند الطلب", manual: "يدوي" };

export default function Integrations() {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState([]);
  const [refs, setRefs] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [cfgData, refData] = await Promise.all([
          base44.entities.IntegrationConfig.list(),
          base44.entities.ExternalReference.list("-created_date", 500),
        ]);
        setConfigs(cfgData || []);
        setRefs(refData || []);
      } catch {
        setRefs([]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const configBySystem = useMemo(() => {
    const map = {};
    configs.forEach((c) => { map[c.system] = c; });
    return map;
  }, [configs]);

  const enabledConfigs = configs.filter((c) => c.enabled);
  const mappingBySystem = useMemo(() => {
    const map = {};
    refs.forEach((r) => { map[r.external_system] = (map[r.external_system] || 0) + 1; });
    return map;
  }, [refs]);

  const maturityCounts = useMemo(() => {
    const m = { read: 0, sync: 0, write_back: 0, orchestrate: 0 };
    enabledConfigs.forEach((c) => { if (m[c.maturity_level] !== undefined) m[c.maturity_level]++; });
    return m;
  }, [enabledConfigs]);

  const onSaved = (saved) => {
    setConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      return idx >= 0 ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
    });
  };

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

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="raqeem-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase">إجمالي</span>
            <Plug className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold text-foreground">{configs.length}</div>
          <div className="text-xs text-muted-foreground">تكامل مُهيّأ</div>
        </div>
        <div className="raqeem-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase">مُفعّل</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{enabledConfigs.length}</div>
          <div className="text-xs text-muted-foreground">قيد التشغيل</div>
        </div>
        <div className="raqeem-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase">مراجع</span>
            <Layers className="w-4 h-4 text-accent" />
          </div>
          <div className="text-2xl font-bold text-foreground">{refs.length}</div>
          <div className="text-xs text-muted-foreground">ربط بين الأنظمة</div>
        </div>
        <div className="raqeem-card p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground uppercase">تنسيق</span>
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-primary">{maturityCounts.orchestrate}</div>
          <div className="text-xs text-muted-foreground">أعلى مستوى نضج</div>
        </div>
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
            <div className="text-xs text-muted-foreground mt-1">مزودون قابلون للاستبدال · تدهور رشيق</div>
          </div>
          <div className="raqeem-card p-4">
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">External Systems</div>
            <div className="text-sm font-semibold text-foreground">أنظمة الجهة والدولة</div>
            <div className="text-xs text-muted-foreground mt-1">Teams · Outlook · ERP · هوية</div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="text-xs font-semibold text-foreground mb-2">مستويات النضج · Maturity Levels</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(MATURITY_LEVELS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${v.color.split(" ")[1]}`} />
                <div>
                  <div className="text-xs font-medium">{v.ar} · {v.en}</div>
                  <div className="text-[11px] text-muted-foreground">{v.desc}</div>
                </div>
              </div>
            ))}
          </div>
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
        ) : enabledConfigs.length === 0 ? (
          <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            لا توجد تكاملات مُفعّلة بعد · No integrations enabled — فعّل تكاملاً من الكتالوج أدناه
          </div>
        ) : (
          <div className="space-y-2">
            {enabledConfigs.map((c) => {
              const count = mappingBySystem[c.system] || 0;
              const synced = refs.filter((r) => r.external_system === c.system && r.sync_status === "synced").length;
              const healthy = count === 0 || synced === count;
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">{c.system_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {MATURITY_LEVELS[c.maturity_level]?.ar} · {FREQ_AR[c.sync_frequency] || c.sync_frequency}
                        {c.last_synced_at && ` · آخر مزامنة ${new Date(c.last_synced_at).toLocaleDateString("en-GB")}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{count} مرجع</span>
                    <StatusBadge
                      label={healthy ? "سليم" : "متأخر"}
                      colorClass={healthy ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                    />
                  </div>
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
                const cfg = configBySystem[item.system];
                const enabled = cfg?.enabled;
                const mappingCount = mappingBySystem[item.system] || 0;
                return (
                  <button
                    key={item.name}
                    onClick={() => setSelected({ item, existing: cfg })}
                    className="border border-border rounded-md p-3 text-right hover:border-primary/40 hover:bg-secondary/20 transition-colors group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <div className="flex items-center gap-1.5">
                        {enabled && cfg?.maturity_level && (
                          <StatusBadge label={MATURITY_LEVELS[cfg.maturity_level]?.ar} colorClass={MATURITY_LEVELS[cfg.maturity_level]?.color} />
                        )}
                        <StatusBadge
                          label={enabled ? "متصل" : "غير مُفعّل"}
                          colorClass={enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{item.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{mappingCount} ربط</span>
                      <span className="text-[11px] text-primary flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Settings2 className="w-3 h-3" /> تهيئة
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <IntegrationConfigSheet
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        item={selected?.item}
        existing={selected?.existing}
        onSaved={onSaved}
      />
    </div>
  );
}