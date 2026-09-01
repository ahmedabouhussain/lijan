import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Building2, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const ORG_TYPES = [
  { value: "ministry", label: "وزارة · Ministry" },
  { value: "authority", label: "هيئة · Authority" },
  { value: "council", label: "مجلس · Council" },
  { value: "organization", label: "منظمة · Organization" },
  { value: "agency", label: "وكالة · Agency" },
  { value: "committee", label: "لجنة · Committee" },
  { value: "other", label: "أخرى · Other" },
];

export default function CreatePortal() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name_ar: "",
    name_en: "",
    type: "ministry",
    slug: "",
    branding_primary_color: "#8A1538",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name_ar.trim() || !form.name_en.trim() || !form.slug.trim()) {
      setError("الاسم العربي والإنجليزي والعنوان مطلوبة");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("ProvisionOrganizationPortal", form);
      const data = res.data || res;
      if (data.error) {
        setError(data.error);
      } else {
        navigate(data.portal_url);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر إنشاء البوابة");
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12" dir="rtl">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">إنشاء بوابة منظمة</h1>
          <p className="text-sm text-muted-foreground">Register your organization portal · ستحصل على دور مالك المنظمة</p>
        </div>

        <div className="raqeem-card p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name_ar">اسم المنظمة (عربي) *</Label>
              <Input id="name_ar" value={form.name_ar} onChange={(e) => update("name_ar", e.target.value)} placeholder="المجلس الأعلى للحوكمة" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name_en">Organization Name (English) *</Label>
              <Input id="name_en" value={form.name_en} onChange={(e) => update("name_en", e.target.value)} placeholder="Supreme Council for Governance" dir="ltr" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="type">نوع المنظمة · Organization Type</Label>
            <select
              value={form.type}
              onChange={(e) => update("type", e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {ORG_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">عنوان البوابة · Portal Address *</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/o/</span>
              <Input id="slug" value={form.slug} onChange={(e) => update("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} placeholder="my-organization" dir="ltr" />
            </div>
            <p className="text-xs text-muted-foreground">سيُستخدم معرف فريد دائم في العنوان لمنع التضارب</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="color">اللون الرئيسي · Primary Color</Label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.branding_primary_color} onChange={(e) => update("branding_primary_color", e.target.value)} className="w-12 h-9 rounded border border-input" />
              <Input value={form.branding_primary_color} onChange={(e) => update("branding_primary_color", e.target.value)} dir="ltr" className="flex-1" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">الوصف · Description</Label>
            <Textarea id="description" value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="وصف موجز للمنظمة" rows={3} />
          </div>

          <div className="p-3 rounded-md bg-secondary/40 text-xs text-muted-foreground leading-relaxed">
            بإنشائك البوابة، توافق على شروط الاستخدام التجريبي. ستظهر علامة "بيئة تجريبية" حتى يتم التحقق الرسمي.
          </div>

          <Button onClick={submit} disabled={submitting} className="w-full h-10 inline-flex items-center justify-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 rotate-180" />}
            {submitting ? "جارٍ الإنشاء..." : "إنشاء البوابة"}
          </Button>
        </div>
      </div>
    </div>
  );
}