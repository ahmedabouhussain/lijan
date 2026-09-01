import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Plus, X, Save, Check } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { CLASSIFICATION, COMMITTEE_TYPES, MEMBER_ROLE } from "@/lib/raqeemUtils";

const DEFAULT_ROLE_MATRIX = [
  { role: "chair", ar: "الرئيس", access: ["إدارة الاجتماعات", "اعتماد المحاضر", "تصويت حاسم", "التصعيد"] },
  { role: "vice_chair", ar: "نائب الرئيس", access: ["نيابة الرئيس", "تصويت", "اعتماد المحاضر بالنيابة"] },
  { role: "secretary", ar: "الأمين", access: ["إدارة جدول الأعمال", "تحرير المحاضر", "تتبع الإجراءات", "التصعيد"] },
  { role: "member", ar: "عضو", access: ["تصويت", "عرض الوثائق", "اقتراح بنود"] },
  { role: "observer", ar: "مراقب", access: ["عرض فقط", "بدون تصويت"] },
  { role: "advisor", ar: "مستشار", access: ["تقديم المشورة", "بدون تصويت"] },
];

const DEFAULT_CLASSIFICATION = Object.entries(CLASSIFICATION).map(([k, v]) => ({ key: k, ar: v.ar, en: v.en }));
const DEFAULT_COMMITTEE_TYPES = Object.entries(COMMITTEE_TYPES).map(([k, v]) => ({ key: k, ar: v.ar, en: v.en }));

function TagEditor({ tags, onChange, placeholder }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-secondary text-foreground">
          {t}
          <button onClick={() => onChange(tags.filter((x) => x !== t))} className="text-muted-foreground hover:text-destructive">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <div className="inline-flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="text-xs px-2 py-0.5 rounded-md border border-dashed border-input bg-transparent w-28 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button onClick={add} className="text-muted-foreground hover:text-primary"><Plus className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

export default function PermissionsAdmin() {
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState(DEFAULT_ROLE_MATRIX);
  const [classifications, setClassifications] = useState(DEFAULT_CLASSIFICATION);
  const [committeeTypes, setCommitteeTypes] = useState(DEFAULT_COMMITTEE_TYPES);
  const [saving, setSaving] = useState(null);
  const [savedKey, setSavedKey] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const records = await base44.entities.GovernanceConfig.list();
        const map = {};
        (records || []).forEach((r) => { map[r.config_key] = r; });
        if (map.role_matrix) setRoles(map.role_matrix.payload?.roles || DEFAULT_ROLE_MATRIX);
        if (map.classification) setClassifications(map.classification.payload?.items || DEFAULT_CLASSIFICATION);
        if (map.committee_types) setCommitteeTypes(map.committee_types.payload?.items || DEFAULT_COMMITTEE_TYPES);
      } catch {
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveSection = async (key, payload) => {
    setSaving(key);
    try {
      const existing = await base44.entities.GovernanceConfig.filter({ config_key: key });
      if (existing && existing.length) {
        await base44.entities.GovernanceConfig.update(existing[0].id, { payload });
      } else {
        await base44.entities.GovernanceConfig.create({ config_key: key, payload });
      }
      await base44.entities.AuditLog.create({
        action: "update",
        entity_type: "GovernanceConfig",
        entity_title: key,
        description: "تحديث إعدادات الصلاحيات",
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {
    } finally {
      setSaving(null);
    }
  };

  const updateRole = (idx, patch) => setRoles((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const removeRole = (idx) => setRoles((r) => r.filter((_, i) => i !== idx));
  const addRole = () => setRoles((r) => [...r, { role: `custom_${Date.now()}`, ar: "دور جديد", access: [] }]);

  const updateItem = (list, setList, idx, patch) => setList(list.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  const removeItem = (list, setList, idx) => setList(list.filter((_, i) => i !== idx));
  const addItem = (list, setList) => setList([...list, { key: `custom_${Date.now()}`, ar: "جديد", en: "New" }]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground">الإدارة</Link>
        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="font-semibold">الصلاحيات · Permissions</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">الصلاحيات · Permissions</h1>
        <p className="text-sm text-muted-foreground mt-1">مصفوفة الصلاحيات والتصنيفات والتحكم في الوصول — قابلة للتحرير</p>
      </div>

      {/* Role Matrix */}
      <div className="raqeem-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold">مصفوفة الأدوار · Role Matrix</h3>
          <div className="flex items-center gap-2">
            <button onClick={addRole} className="text-xs flex items-center gap-1 text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> دور</button>
            <button onClick={() => saveSection("role_matrix", { roles })} disabled={saving === "role_matrix"} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {savedKey === "role_matrix" ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} حفظ
            </button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {roles.map((r, idx) => (
            <div key={idx} className="px-5 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
              <div className="sm:w-32 flex items-center gap-1.5 shrink-0">
                <input value={r.ar} onChange={(e) => updateRole(idx, { ar: e.target.value })} className="text-sm font-medium bg-transparent border-b border-transparent hover:border-input focus:border-input focus:outline-none px-0.5 w-full" />
                <button onClick={() => removeRole(idx)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex-1">
                <TagEditor tags={r.access} onChange={(access) => updateRole(idx, { access })} placeholder="صلاحية…" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Classification & Committee Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="raqeem-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">مستويات التصنيف · Classification Levels</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => addItem(classifications, setClassifications)} className="text-xs flex items-center gap-1 text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> مستوى</button>
              <button onClick={() => saveSection("classification", { items: classifications })} disabled={saving === "classification"} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {savedKey === "classification" ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} حفظ
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {classifications.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <input value={c.en} onChange={(e) => updateItem(classifications, setClassifications, idx, { en: e.target.value })} className="flex-1 bg-transparent border-b border-transparent hover:border-input focus:border-input focus:outline-none px-0.5 text-muted-foreground" />
                <input value={c.ar} onChange={(e) => updateItem(classifications, setClassifications, idx, { ar: e.target.value })} className="flex-1 text-right bg-transparent border-b border-transparent hover:border-input focus:border-input focus:outline-none px-0.5 font-medium" />
                <button onClick={() => removeItem(classifications, setClassifications, idx)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>

        <div className="raqeem-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">أنواع اللجان · Committee Types</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => addItem(committeeTypes, setCommitteeTypes)} className="text-xs flex items-center gap-1 text-primary hover:underline"><Plus className="w-3.5 h-3.5" /> نوع</button>
              <button onClick={() => saveSection("committee_types", { items: committeeTypes })} disabled={saving === "committee_types"} className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {savedKey === "committee_types" ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} حفظ
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {committeeTypes.map((c, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm">
                <input value={c.en} onChange={(e) => updateItem(committeeTypes, setCommitteeTypes, idx, { en: e.target.value })} className="flex-1 bg-transparent border-b border-transparent hover:border-input focus:border-input focus:outline-none px-0.5 text-muted-foreground" />
                <input value={c.ar} onChange={(e) => updateItem(committeeTypes, setCommitteeTypes, idx, { ar: e.target.value })} className="flex-1 text-right bg-transparent border-b border-transparent hover:border-input focus:border-input focus:outline-none px-0.5 font-medium" />
                <button onClick={() => removeItem(committeeTypes, setCommitteeTypes, idx)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}