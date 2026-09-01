import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { GripVertical, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

// AdminEditForm — the configuration editing form with AR/EN tabs.
export default function AdminEditForm({ config, onChange, tab }) {
  const { t } = useLanguage();
  if (!config) return null;

  const set = (field, value) => onChange({ ...config, [field]: value });
  const setSection = (idx, field, value) => {
    const sections = [...(config.sections || [])];
    sections[idx] = { ...sections[idx], [field]: value };
    onChange({ ...config, sections });
  };
  const addSection = () => {
    const sections = [...(config.sections || []), { key: `section_${Date.now()}`, title_ar: "", title_en: "", visible: true, order: (config.sections || []).length }];
    onChange({ ...config, sections });
  };
  const removeSection = (idx) => {
    const sections = (config.sections || []).filter((_, i) => i !== idx);
    onChange({ ...config, sections });
  };
  const moveSection = (idx, dir) => {
    const sections = [...(config.sections || [])];
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[idx], sections[target]] = [sections[target], sections[idx]];
    sections.forEach((s, i) => (s.order = i));
    onChange({ ...config, sections });
  };

  return (
    <div className="space-y-5">
      {/* Titles */}
      <div className="raqeem-card p-4 space-y-3">
        <h3 className="raqeem-section-title">{t("العنوان", "Title")}</h3>
        {tab === "ar" ? (
          <Input value={config.title_ar || ""} onChange={(e) => set("title_ar", e.target.value)} placeholder="عنوان الصفحة بالعربية" />
        ) : (
          <Input value={config.title_en || ""} onChange={(e) => set("title_en", e.target.value)} placeholder="Page title in English" />
        )}
      </div>

      {/* Description */}
      <div className="raqeem-card p-4 space-y-3">
        <h3 className="raqeem-section-title">{t("الوصف والإرشاد", "Description & Guidance")}</h3>
        {tab === "ar" ? (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">{t("الوصف", "Description")}</Label>
              <Textarea value={config.description_ar || ""} onChange={(e) => set("description_ar", e.target.value)} rows={2} placeholder="وصف مختصر للصفحة" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("إرشادات داخلية", "Inline Guidance")}</Label>
              <Textarea value={config.guidance_ar || ""} onChange={(e) => set("guidance_ar", e.target.value)} rows={2} placeholder="إرشادات تظهر للمستخدمين" />
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-xs text-muted-foreground">{t("الوصف", "Description")}</Label>
              <Textarea value={config.description_en || ""} onChange={(e) => set("description_en", e.target.value)} rows={2} placeholder="Brief page description" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("إرشادات داخلية", "Inline Guidance")}</Label>
              <Textarea value={config.guidance_en || ""} onChange={(e) => set("guidance_en", e.target.value)} rows={2} placeholder="Guidance shown to users" />
            </div>
          </>
        )}
      </div>

      {/* Empty State */}
      <div className="raqeem-card p-4 space-y-3">
        <h3 className="raqeem-section-title">{t("رسالة الحالة الفارغة", "Empty State Message")}</h3>
        {tab === "ar" ? (
          <Input value={config.empty_state_ar || ""} onChange={(e) => set("empty_state_ar", e.target.value)} placeholder="رسالة تظهر عند عدم وجود بيانات" />
        ) : (
          <Input value={config.empty_state_en || ""} onChange={(e) => set("empty_state_en", e.target.value)} placeholder="Message shown when no data exists" />
        )}
      </div>

      {/* Visibility */}
      <div className="raqeem-card p-4 space-y-3">
        <h3 className="raqeem-section-title">{t("الظهور", "Visibility")}</h3>
        <div className="flex items-center justify-between">
          <Label>{t("الصفحة ظاهرة", "Page Visible")}</Label>
          <Switch checked={config.visible !== false} onCheckedChange={(v) => set("visible", v)} />
        </div>
        <div className="flex items-center justify-between">
          <Label>{t("ظاهرة في الشريط الجانبي", "Sidebar Visible")}</Label>
          <Switch checked={config.sidebar_visible !== false} onCheckedChange={(v) => set("sidebar_visible", v)} />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">{t("ترتيب الشريط الجانبي", "Sidebar Order")}</Label>
          <Input type="number" value={config.sidebar_order || 0} onChange={(e) => set("sidebar_order", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      {/* Sections */}
      <div className="raqeem-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="raqeem-section-title">{t("الأقسام", "Sections")}</h3>
          <button onClick={addSection} className="text-xs text-primary hover:underline flex items-center gap-1">
            <Plus className="w-3 h-3" /> {t("إضافة قسم", "Add Section")}
          </button>
        </div>
        {(config.sections || []).length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">{t("لا توجد أقسام مخصصة", "No custom sections")}</p>
        ) : (
          <div className="space-y-2">
            {(config.sections || []).map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-secondary/30">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveSection(idx, -1)} className="text-muted-foreground hover:text-foreground" disabled={idx === 0}>
                    <GripVertical className="w-3 h-3 rotate-180" />
                  </button>
                  <button onClick={() => moveSection(idx, 1)} className="text-muted-foreground hover:text-foreground" disabled={idx === (config.sections || []).length - 1}>
                    <GripVertical className="w-3 h-3" />
                  </button>
                </div>
                <Input
                  value={tab === "ar" ? s.title_ar : s.title_en}
                  onChange={(e) => setSection(idx, tab === "ar" ? "title_ar" : "title_en", e.target.value)}
                  placeholder={tab === "ar" ? "اسم القسم" : "Section title"}
                  className="flex-1 h-8 text-sm"
                />
                <button onClick={() => setSection(idx, "visible", s.visible !== false)} className="p-1.5 text-muted-foreground hover:text-foreground">
                  {s.visible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => removeSection(idx)} className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}