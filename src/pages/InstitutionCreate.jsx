import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, ChevronRight, Check } from "lucide-react";
import { CLASSIFICATION } from "@/lib/raqeemUtils";
import { L } from "@/lib/l10n";

const INSTITUTION_TYPES = {
  ministry: { ar: "وزارة", en: "Ministry" },
  authority: { ar: "هيئة", en: "Authority" },
  council: { ar: "مجلس", en: "Council" },
  organization: { ar: "منظمة", en: "Organization" },
  agency: { ar: "وكالة", en: "Agency" },
  committee: { ar: "لجنة", en: "Committee" },
  other: { ar: "أخرى", en: "Other" },
};

const STEPS = ["الهوية", "السياسات", "العلامة والمراجعة"];

export default function InstitutionCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    type: "ministry",
    parent_authority: "",
    classification_policy: "internal",
    contact_email: "",
    contact_phone: "",
    retention_policy_years: 7,
    branding_primary_color: "#8A1538",
    logo_url: "",
    description: "",
    status: "active",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const canNext = () => {
    if (step === 0) return form.name_ar.trim() && form.name_en.trim();
    if (step === 1) return true;
    return true;
  };

  const submit = async () => {
    setSaving(true);
    try {
      const inst = await base44.entities.Institution.create(form);
      await base44.entities.AuditLog.create({
        action: "create",
        entity_type: "Institution",
        entity_id: inst.id,
        entity_title: form.name_ar,
        description: `إنشاء مؤسسة: ${form.name_ar}`,
      });
      navigate("/admin");
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">إنشاء مؤسسة · Create Institution</h1>
        <p className="text-sm text-muted-foreground mt-1">بوابة المؤسسة تُنشأ تلقائيًا بعد الإنشاء</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="raqeem-card p-6 space-y-4">
        {step === 0 && (
          <>
            <div>
              <Label className="text-xs">الاسم بالعربية *</Label>
              <Input value={form.name_ar} onChange={(e) => update("name_ar", e.target.value)} placeholder="المجلس الأعلى للحوكمة" />
            </div>
            <div>
              <Label className="text-xs">Name (English) *</Label>
              <Input value={form.name_en} onChange={(e) => update("name_en", e.target.value)} placeholder="Supreme Council for Governance" />
            </div>
            <div>
              <Label className="text-xs">نوع المؤسسة</Label>
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(INSTITUTION_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar} — {v.en}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">الجهة الأم</Label>
              <Input value={form.parent_authority} onChange={(e) => update("parent_authority", e.target.value)} placeholder="ديوان رئيس مجلس الوزراء" />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div>
              <Label className="text-xs">سياسة التصنيف الافتراضية</Label>
              <select
                value={form.classification_policy}
                onChange={(e) => update("classification_policy", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {Object.entries(CLASSIFICATION).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar} — {v.en}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">سياسة الاحتفاظ (سنوات)</Label>
              <Input type="number" value={form.retention_policy_years} onChange={(e) => update("retention_policy_years", parseInt(e.target.value) || 7)} />
            </div>
            <div>
              <Label className="text-xs">البريد الإلكتروني</Label>
              <Input type="email" value={form.contact_email} onChange={(e) => update("contact_email", e.target.value)} placeholder="contact@institution.gov.qa" />
            </div>
            <div>
              <Label className="text-xs">الهاتف</Label>
              <Input value={form.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} placeholder="+974 ..." />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label className="text-xs">رابط الشعار</Label>
              <Input value={form.logo_url} onChange={(e) => update("logo_url", e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label className="text-xs">اللون المؤسسي</Label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.branding_primary_color} onChange={(e) => update("branding_primary_color", e.target.value)} className="w-9 h-9 rounded border border-input" />
                <Input value={form.branding_primary_color} onChange={(e) => update("branding_primary_color", e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs">الوصف</Label>
              <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3} />
            </div>
            {/* Review */}
            <div className="pt-4 border-t border-border space-y-1.5">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">المراجعة</div>
              <div className="text-sm"><span className="text-muted-foreground">الاسم:</span> {form.name_ar} · {form.name_en}</div>
              <div className="text-sm"><span className="text-muted-foreground">{L.pair("النوع", "Type")}:</span> {L.label(INSTITUTION_TYPES, form.type, form.type)}</div>
              <div className="text-sm"><span className="text-muted-foreground">التصنيف:</span> {CLASSIFICATION[form.classification_policy]?.ar}</div>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => (step === 0 ? navigate("/admin") : setStep(step - 1))}>
          {step === 0 ? "إلغاء" : "السابق"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="sm" disabled={!canNext()} onClick={() => setStep(step + 1)}>
            التالي <ChevronRight className="w-4 h-4 rotate-180" />
          </Button>
        ) : (
          <Button size="sm" disabled={saving || !form.name_ar.trim()} onClick={submit}>
            {saving ? "جارٍ الإنشاء..." : "إنشاء المؤسسة"}
          </Button>
        )}
      </div>
    </div>
  );
}