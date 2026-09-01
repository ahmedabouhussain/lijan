import React from "react";
import { Users, ArrowLeft, Plus, Minus, RefreshCw, Equal } from "lucide-react";

const ROLE_LABELS = {
  chair: "رئيس", vice_chair: "نائب رئيس", secretary: "أمين",
  member: "عضو", alternate: "بديل", observer: "مراقب", advisor: "مستشار",
};

// FormationDiff — side-by-side visual comparison of two formation version snapshots.
// Shows added members, removed members, role changes, and unchanged members.
export default function FormationDiff({ versionA, versionB }) {
  if (!versionA || !versionB) return null;

  const parseSnapshot = (v) => {
    try { return v.formation_snapshot ? JSON.parse(v.formation_snapshot) : []; }
    catch { return []; }
  };
  const membersA = parseSnapshot(versionA);
  const membersB = parseSnapshot(versionB);

  const mapA = new Map(membersA.map((m) => [m.full_name, m]));
  const mapB = new Map(membersB.map((m) => [m.full_name, m]));
  const allNames = new Set([...mapA.keys(), ...mapB.keys()]);

  const added = [], removed = [], roleChanged = [], unchanged = [];
  for (const name of allNames) {
    const a = mapA.get(name);
    const b = mapB.get(name);
    if (!a && b) added.push(b);
    else if (a && !b) removed.push(a);
    else if (a && b && a.role !== b.role) roleChanged.push({ name, oldRole: a.role, newRole: b.role });
    else if (a && b) unchanged.push(a);
  }

  const hasChanges = added.length > 0 || removed.length > 0 || roleChanged.length > 0;

  return (
    <div className="raqeem-card p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">مقارنة نسختي التشكيل</h3>
      </div>

      {/* Version headers */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded-md bg-secondary/40">
          <div className="font-semibold text-foreground">النسخة A · #{versionA.version_number}</div>
          <div className="text-muted-foreground">{versionA.effective_date} — {versionA.end_date || "الآن"}</div>
          {versionA.reason_for_change && <div className="text-muted-foreground truncate">{versionA.reason_for_change}</div>}
        </div>
        <div className="p-2 rounded-md bg-secondary/40">
          <div className="font-semibold text-foreground">النسخة B · #{versionB.version_number}</div>
          <div className="text-muted-foreground">{versionB.effective_date} — {versionB.end_date || "الآن"}</div>
          {versionB.reason_for_change && <div className="text-muted-foreground truncate">{versionB.reason_for_change}</div>}
        </div>
      </div>

      {!hasChanges ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
          <Equal className="w-4 h-4" /> لا توجد فروقات في التشكيل بين النسختين
        </div>
      ) : (
        <div className="space-y-3">
          {added.length > 0 && (
            <DiffSection icon={Plus} label="أعضاء أُضيفوا" count={added.length} color="green"
              items={added.map((m) => ({ name: m.full_name, right: ROLE_LABELS[m.role] || m.role }))} />
          )}
          {removed.length > 0 && (
            <DiffSection icon={Minus} label="أعضاء أُزيلوا" count={removed.length} color="red"
              items={removed.map((m) => ({ name: m.full_name, right: ROLE_LABELS[m.role] || m.role }))} />
          )}
          {roleChanged.length > 0 && (
            <DiffSection icon={RefreshCw} label="تغييرات في الأدوار" count={roleChanged.length} color="amber"
              items={roleChanged.map((c) => ({ name: c.name, right: `${ROLE_LABELS[c.oldRole] || c.oldRole} ← ${ROLE_LABELS[c.newRole] || c.newRole}` }))} />
          )}
          {unchanged.length > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <Equal className="w-3.5 h-3.5" /> {unchanged.length} أعضاء دون تغيير
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffSection({ icon: Icon, label, count, color, items }) {
  const colorMap = {
    green: "text-green-700 bg-green-50",
    red: "text-destructive bg-destructive/5",
    amber: "text-amber-700 bg-amber-50",
  };
  return (
    <div>
      <div className={`text-xs font-semibold flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded ${colorMap[color]}`}>
        <Icon className="w-3.5 h-3.5" /> {label} ({count})
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded border border-border">
            <span className="font-medium">{item.name}</span>
            <span className="text-muted-foreground">{item.right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}