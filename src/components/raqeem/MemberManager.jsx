import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, X } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { MEMBER_ROLE, CLASSIFICATION } from "@/lib/raqeemUtils";

const AUTHORITY_LEVELS = {
  decision: { ar: "قرار", en: "Decision" },
  approval: { ar: "اعتماد", en: "Approval" },
  execution: { ar: "تنفيذ", en: "Execution" },
  oversight: { ar: "إشراف", en: "Oversight" },
  escalation: { ar: "تصعيد", en: "Escalation" },
  advisory: { ar: "استشاري", en: "Advisory" },
};

export default function MemberManager({ committeeId, members, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    full_name_ar: "",
    email: "",
    role: "member",
    authority_level: "decision",
    institution_name: "",
    status: "active",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const add = async () => {
    if (!form.full_name.trim() && !form.full_name_ar.trim()) return;
    setSaving(true);
    try {
      await base44.entities.CommitteeMember.create({ ...form, committee_id: committeeId });
      await base44.entities.AuditLog.create({
        action: "create",
        entity_type: "CommitteeMember",
        entity_title: form.full_name_ar || form.full_name,
        description: `إضافة عضو للجنة`,
        authority_context: form.role,
      });
      setForm({ full_name: "", full_name_ar: "", email: "", role: "member", authority_level: "decision", institution_name: "", status: "active" });
      setShowForm(false);
      onChanged();
    } catch {
    }
    setSaving(false);
  };

  const remove = async (m) => {
    await base44.entities.CommitteeMember.update(m.id, { status: "inactive" });
    await base44.entities.AuditLog.create({
      action: "update",
      entity_type: "CommitteeMember",
      entity_id: m.id,
      entity_title: m.full_name_ar || m.full_name,
      description: "إنهاء عضوية",
    });
    onChanged();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground">{members.filter((m) => m.status !== "inactive").length} نشط</span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <UserPlus className="w-3.5 h-3.5" /> {showForm ? "إخفاء" : "إضافة عضو"}
        </button>
      </div>

      {showForm && (
        <div className="border border-border rounded-md p-4 mb-3 space-y-3 relative">
          <button onClick={() => setShowForm(false)} className="absolute top-3 left-3 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">الاسم بالعربية</Label>
              <Input value={form.full_name_ar} onChange={(e) => update("full_name_ar", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Full Name (English)</Label>
              <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">الدور</Label>
              <select value={form.role} onChange={(e) => update("role", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {Object.entries(MEMBER_ROLE).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar} — {v.en}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">مستوى السلطة</Label>
              <select value={form.authority_level} onChange={(e) => update("authority_level", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                {Object.entries(AUTHORITY_LEVELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.ar} — {v.en}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label className="text-xs">المؤسسة المُمثلة</Label>
            <Input value={form.institution_name} onChange={(e) => update("institution_name", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">البريد الإلكتروني</Label>
            <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <Button size="sm" onClick={add} disabled={saving || (!form.full_name.trim() && !form.full_name_ar.trim())}>
            {saving ? "جارٍ الإضافة..." : "إضافة العضو"}
          </Button>
        </div>
      )}

      <div className="space-y-1">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{m.full_name_ar || m.full_name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {m.institution_name && `${m.institution_name} · `}
                {AUTHORITY_LEVELS[m.authority_level]?.ar || m.authority_level}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge
                label={MEMBER_ROLE[m.role]?.ar || m.role}
                colorClass={m.status === "inactive" ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"}
              />
              {m.status !== "inactive" && (
                <button onClick={() => remove(m)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}