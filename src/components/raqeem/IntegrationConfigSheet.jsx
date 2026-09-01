import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { Save, Activity } from "lucide-react";

export const MATURITY_LEVELS = {
  read: { ar: "قراءة", en: "Read", desc: "سحب البيانات للعرض فقط", color: "text-blue-700 bg-blue-50" },
  sync: { ar: "مزامنة", en: "Sync", desc: "مزامنة ثنائية الاتجاه", color: "text-amber-700 bg-amber-50" },
  write_back: { ar: "كتابة عكسية", en: "Write Back", desc: "كتابة القرارات للنظام الخارجي", color: "text-purple-700 bg-purple-50" },
  orchestrate: { ar: "تنسيق", en: "Orchestrate", desc: "تنسيق عبر أنظمة متعددة", color: "text-emerald-700 bg-emerald-50" },
};

const FREQ_OPTIONS = [
  { value: "realtime", ar: "لحظي" },
  { value: "hourly", ar: "كل ساعة" },
  { value: "daily", ar: "يومي" },
  { value: "on_demand", ar: "عند الطلب" },
  { value: "manual", ar: "يدوي" },
];

export default function IntegrationConfigSheet({ open, onOpenChange, item, existing, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        enabled: existing?.enabled || false,
        maturity_level: existing?.maturity_level || "read",
        credentials_label: existing?.credentials_label || "",
        endpoint_url: existing?.endpoint_url || "",
        sync_frequency: existing?.sync_frequency || "manual",
        graceful_degradation: existing?.graceful_degradation ?? true,
        notes: existing?.notes || "",
      });
    }
  }, [item, existing]);

  if (!item || !form) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        system: item.system,
        system_name: item.name,
        category: item.category,
        ...form,
      };
      let saved;
      if (existing?.id) {
        saved = await base44.entities.IntegrationConfig.update(existing.id, payload);
      } else {
        saved = await base44.entities.IntegrationConfig.create(payload);
      }
      await base44.entities.AuditLog.create({
        action: "update",
        entity_type: "IntegrationConfig",
        entity_id: saved.id,
        entity_title: item.name,
        description: `تهيئة التكامل: ${item.name} — ${form.enabled ? "مُفعّل" : "معطّل"} (${MATURITY_LEVELS[form.maturity_level]?.ar})`,
      });
      onSaved?.(saved);
      onOpenChange(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto" dir="rtl">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="text-base text-right">تهيئة التكامل · {item.name}</SheetTitle>
          <p className="text-xs text-muted-foreground text-right">{item.desc}</p>
        </SheetHeader>

        <div className="p-4 space-y-5">
          {/* Enable */}
          <label className="flex items-center justify-between raqeem-card p-3 cursor-pointer">
            <span className="text-sm font-medium">تفعيل التكامل</span>
            <input type="checkbox" checked={form.enabled} onChange={(e) => set("enabled", e.target.checked)} className="accent-primary w-4 h-4" />
          </label>

          {/* Maturity Level */}
          <div>
            <Label className="mb-2 block">مستوى النضج · Maturity Level</Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MATURITY_LEVELS).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set("maturity_level", k)}
                  className={`text-right p-2.5 rounded-md border transition-colors ${form.maturity_level === k ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/30"}`}
                >
                  <div className="text-sm font-medium">{v.ar}</div>
                  <div className="text-[11px] text-muted-foreground">{v.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Credentials */}
          <div>
            <Label className="mb-1.5 block">بيان بيانات الاعتماد · Credentials Label</Label>
            <Input value={form.credentials_label} onChange={(e) => set("credentials_label", e.target.value)} placeholder="مثال: Azure Key Vault · secret-teams-prod" />
          </div>

          {/* Endpoint */}
          <div>
            <Label className="mb-1.5 block">عنوان النهاية · Endpoint URL</Label>
            <Input type="url" value={form.endpoint_url} onChange={(e) => set("endpoint_url", e.target.value)} placeholder="https://…" />
          </div>

          {/* Frequency */}
          <div>
            <Label className="mb-1.5 block">تردد المزامنة · Sync Frequency</Label>
            <select value={form.sync_frequency} onChange={(e) => set("sync_frequency", e.target.value)} className="w-full h-9 px-3 rounded-md border border-input bg-card text-sm">
              {FREQ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.ar}</option>)}
            </select>
          </div>

          {/* Graceful degradation */}
          <label className="flex items-center justify-between raqeem-card p-3 cursor-pointer">
            <div>
              <span className="text-sm font-medium block">التدهور الرشيق · Graceful Degradation</span>
              <span className="text-[11px] text-muted-foreground">استمرار الحوكمة عند انقطاع المزود</span>
            </div>
            <input type="checkbox" checked={form.graceful_degradation} onChange={(e) => set("graceful_degradation", e.target.checked)} className="accent-primary w-4 h-4" />
          </label>

          {/* Notes */}
          <div>
            <Label className="mb-1.5 block">ملاحظات</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="ملاحظات التشغيل أو القيود…" />
          </div>

          <Button onClick={save} disabled={saving} className="w-full">
            <Save className="w-4 h-4" /> حفظ التهيئة
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}