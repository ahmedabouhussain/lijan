import React, { useState, useMemo } from "react";
import { Users, Gavel, ShieldAlert, ArrowRight, X, Plus, UserCog } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { MEMBER_ROLE, AUTHORITY_LEVELS, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";

const ROLE_COLORS = {
  chair: { bg: "bg-primary", text: "text-primary-foreground", ring: "ring-primary" },
  vice_chair: { bg: "bg-primary/80", text: "text-primary-foreground", ring: "ring-primary" },
  secretary: { bg: "bg-accent", text: "text-accent-foreground", ring: "ring-accent" },
  member: { bg: "bg-secondary", text: "text-secondary-foreground", ring: "ring-border" },
  observer: { bg: "bg-muted", text: "text-muted-foreground", ring: "ring-border" },
  advisor: { bg: "bg-muted", text: "text-muted-foreground", ring: "ring-border" },
};

const AUTHORITY_LAYERS = [
  { level: "decision", label: "سلطة القرار · Decision", icon: Gavel },
  { level: "approval", label: "سلطة الاعتماد · Approval", icon: ShieldAlert },
  { level: "execution", label: "سلطة التنفيذ · Execution", icon: UserCog },
  { level: "oversight", label: "سلطة الرقابة · Oversight", icon: Users },
  { level: "advisory", label: "سلطة الاستشارة · Advisory", icon: Users },
];

export default function AuthorityGraph({ committee, members, delegations, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "delegation", from_member_name: "", to_member_name: "", scope: "", reason: "", start_date: "", end_date: "" });
  const [saving, setSaving] = useState(false);

  const activeDelegations = delegations.filter((d) => d.status === "active");
  const activeRecusals = activeDelegations.filter((d) => d.type === "recusal");

  // Group members by authority level
  const layeredMembers = useMemo(() => {
    const map = {};
    AUTHORITY_LAYERS.forEach((l) => (map[l.level] = []));
    members.forEach((m) => {
      const level = m.authority_level || "decision";
      if (map[level]) map[level].push(m);
    });
    // Chair always goes to decision layer if not already placed
    return map;
  }, [members]);

  const recusedNames = new Set(activeRecusals.map((r) => r.from_member_name));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.AuthorityDelegation.create({
        committee_id: committee.id,
        ...form,
        from_member_role: members.find((m) => m.full_name === form.from_member_name)?.role || "member",
        to_member_role: members.find((m) => m.full_name === form.to_member_name)?.role || "member",
        status: "active",
      });
      await base44.entities.AuditLog.create({
        action: "create",
        entity_type: "AuthorityDelegation",
        entity_title: `${form.type}: ${form.from_member_name} → ${form.to_member_name || "—"}`,
        description: form.reason || form.scope || "",
      });
      setShowForm(false);
      setForm({ type: "delegation", from_member_name: "", to_member_name: "", scope: "", reason: "", start_date: "", end_date: "" });
      onChanged?.();
    } catch (err) {
      console.error(err);
    }
    setSaving(false);
  };

  const revoke = async (id) => {
    await base44.entities.AuthorityDelegation.update(id, { status: "revoked" });
    onChanged?.();
  };

  return (
    <div className="raqeem-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" /> رسم السلطة · Authority Graph
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">من يوصي ويقرر وينفذ ويراقب — مع التفويض والتنحي</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-dark"
        >
          <Plus className="w-3.5 h-3.5" /> تفويض / تنحي
        </button>
      </div>

      {/* Delegation form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 border border-border rounded-md p-4 space-y-3 bg-secondary/20">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">النوع</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="delegation">تفويض سلطة · Delegation</option>
                <option value="recusal">تنحي · Recusal</option>
                <option value="proxy">نيابة · Proxy</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">من · From</label>
              <select
                required
                value={form.from_member_name}
                onChange={(e) => setForm({ ...form, from_member_name: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">اختر العضو...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.full_name}>{m.full_name} ({MEMBER_ROLE[m.role]?.ar || m.role})</option>
                ))}
              </select>
            </div>
            {form.type !== "recusal" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">إلى · To</label>
                <select
                  required={form.type !== "recusal"}
                  value={form.to_member_name}
                  onChange={(e) => setForm({ ...form, to_member_name: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">اختر العضو...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.full_name}>{m.full_name} ({MEMBER_ROLE[m.role]?.ar || m.role})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">من تاريخ</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">إلى تاريخ</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">{form.type === "recusal" ? "سبب التنحي" : "نطاق التفويض · Scope"}</label>
            <input
              required
              value={form.type === "recusal" ? form.reason : form.scope}
              onChange={(e) => setForm({ ...form, [form.type === "recusal" ? "reason" : "scope"]: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              placeholder={form.type === "recusal" ? "سبب التنحي عن القرار..." : "نطاق الصلاحية المفوّضة..."}
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-dark disabled:opacity-50">
              {saving ? "جارٍ الحفظ..." : "تسجيل"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-md border border-border text-xs font-medium hover:bg-secondary">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Visual Authority Layers */}
      <div className="space-y-3">
        {AUTHORITY_LAYERS.map((layer) => {
          const layerMembers = layeredMembers[layer.level] || [];
          if (layerMembers.length === 0 && layer.level !== "decision") return null;
          const Icon = layer.icon;
          return (
            <div key={layer.level} className="border border-border rounded-md p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">{layer.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {layerMembers.length === 0 ? (
                  <span className="text-xs text-muted-foreground/60">—</span>
                ) : (
                  layerMembers.map((m) => {
                    const isRecused = recusedNames.has(m.full_name);
                    const colors = ROLE_COLORS[m.role] || ROLE_COLORS.member;
                    return (
                      <div
                        key={m.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium ${colors.bg} ${colors.text} ${isRecused ? "ring-2 ring-destructive opacity-60 line-through" : ""}`}
                        title={isRecused ? "متَنحٍّ" : AUTHORITY_LEVELS?.[m.authority_level]?.ar || m.authority_level}
                      >
                        {m.full_name}
                        {isRecused && <X className="w-3 h-3" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Active delegations & recusals */}
      {activeDelegations.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <h3 className="text-xs font-semibold text-muted-foreground mb-2">التفويضات والتنحي النشطة</h3>
          <div className="space-y-2">
            {activeDelegations.map((d) => (
              <div key={d.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${d.type === "recusal" ? "bg-red-50 text-destructive" : "bg-primary/10 text-primary"}`}>
                  {d.type === "recusal" ? <X className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">
                    {d.type === "recusal" ? (
                      <>{d.from_member_name} <span className="text-muted-foreground">متَنحٍّ</span></>
                    ) : (
                      <>{d.from_member_name} <ArrowRight className="w-3 h-3 inline mx-1" /> {d.to_member_name}</>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {d.scope || d.reason || "—"}
                    {d.end_date && ` · حتى ${formatDate(d.end_date)}`}
                  </div>
                </div>
                <StatusBadge label={d.type === "recusal" ? "تنحي" : d.type === "proxy" ? "نيابة" : "تفويض"} colorClass={d.type === "recusal" ? "text-destructive bg-red-50" : "text-primary bg-primary/10"} />
                <button onClick={() => revoke(d.id)} className="text-xs text-muted-foreground hover:text-destructive px-1.5">إلغاء</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}