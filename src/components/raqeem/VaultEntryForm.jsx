import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

const TYPE_DEFAULTS = {
  adr: { codePrefix: "ADR", category: "Architecture" },
  book_chapter: { codePrefix: "CH", category: "Founder Book" },
  non_negotiable: { codePrefix: "NN", category: "Doctrine" },
  moat: { codePrefix: "MOAT", category: "Strategy" },
  roadmap_item: { codePrefix: "MS", category: "Roadmap" },
};

export default function VaultEntryForm({ type, onCreated, onCancel }) {
  const defaults = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.adr;
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    entry_type: type,
    code: "",
    title: "",
    title_ar: "",
    category: defaults.category,
    content: "",
    status: type === "roadmap_item" ? "planned" : "active",
    sequence: 0,
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await base44.entities.FounderVaultEntry.create(form);
      onCreated();
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="raqeem-card p-5 relative">
      <button
        onClick={onCancel}
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
      >
        <X className="w-4 h-4" />
      </button>
      <h3 className="text-sm font-semibold text-foreground mb-4">إضافة جديدة · New Entry</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">الرمز · Code</Label>
            <Input value={form.code} onChange={(e) => update("code", e.target.value)} placeholder={`${defaults.codePrefix}-00X`} />
          </div>
          <div>
            <Label className="text-xs">التصنيف · Category</Label>
            <Input value={form.category} onChange={(e) => update("category", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">العنوان بالعربية</Label>
          <Input value={form.title_ar} onChange={(e) => update("title_ar", e.target.value)} placeholder="العنوان" />
        </div>
        <div>
          <Label className="text-xs">Title (English)</Label>
          <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Title" />
        </div>
        <div>
          <Label className="text-xs">المحتوى · Content</Label>
          <Textarea value={form.content} onChange={(e) => update("content", e.target.value)} rows={4} placeholder="التفاصيل..." />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            إلغاء
          </Button>
          <Button size="sm" onClick={submit} disabled={saving || !form.title.trim()}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </Button>
        </div>
      </div>
    </div>
  );
}