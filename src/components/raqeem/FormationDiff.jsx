import React from "react";
import { Users, Plus, Minus, RefreshCw, Equal } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { MEMBER_ROLE } from "@/lib/raqeemUtils";

// FormationDiff — side-by-side visual comparison of two formation version snapshots.
// One language per page: every label follows the active language, and the block's
// direction follows the page — never a fixed RTL.
export default function FormationDiff({ versionA, versionB }) {
  const { t, lang, dir, nameOf } = useLanguage();
  if (!versionA || !versionB) return null;

  const roleLabel = (role) => {
    const entry = MEMBER_ROLE[role];
    return entry ? (lang === "ar" ? entry.ar : entry.en) : role;
  };

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
    <div className="raqeem-card p-4 space-y-4" dir={dir}>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("مقارنة نسختي التشكيل", "Formation Version Comparison")}</h3>
      </div>

      {/* Version headers */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded-md bg-secondary/40">
          <div className="font-semibold text-foreground">{t("النسخة أ", "Version A")} · #{versionA.version_number}</div>
          <div className="text-muted-foreground">{versionA.effective_date} — {versionA.end_date || t("الآن", "Present")}</div>
          {versionA.reason_for_change && <div className="text-muted-foreground truncate">{versionA.reason_for_change}</div>}
        </div>
        <div className="p-2 rounded-md bg-secondary/40">
          <div className="font-semibold text-foreground">{t("النسخة ب", "Version B")} · #{versionB.version_number}</div>
          <div className="text-muted-foreground">{versionB.effective_date} — {versionB.end_date || t("الآن", "Present")}</div>
          {versionB.reason_for_change && <div className="text-muted-foreground truncate">{versionB.reason_for_change}</div>}
        </div>
      </div>

      {!hasChanges ? (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-4">
          <Equal className="w-4 h-4" /> {t("لا توجد فروقات في التشكيل بين النسختين", "No formation differences between the two versions")}
        </div>
      ) : (
        <div className="space-y-3">
          {added.length > 0 && (
            <DiffSection icon={Plus} label={t("أعضاء أُضيفوا", "Members Added")} count={added.length} tone="success"
              items={added.map((m) => ({ name: nameOf(m, "full_name"), right: roleLabel(m.role) }))} />
          )}
          {removed.length > 0 && (
            <DiffSection icon={Minus} label={t("أعضاء أُزيلوا", "Members Removed")} count={removed.length} tone="danger"
              items={removed.map((m) => ({ name: nameOf(m, "full_name"), right: roleLabel(m.role) }))} />
          )}
          {roleChanged.length > 0 && (
            <DiffSection icon={RefreshCw} label={t("تغييرات في الأدوار", "Role Changes")} count={roleChanged.length} tone="warning"
              items={roleChanged.map((c) => ({ name: c.name, right: `${roleLabel(c.oldRole)} ← ${roleLabel(c.newRole)}` }))} />
          )}
          {unchanged.length > 0 && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
              <Equal className="w-3.5 h-3.5" /> {t(`${unchanged.length} أعضاء دون تغيير`, `${unchanged.length} members unchanged`)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DiffSection({ icon: Icon, label, count, tone, items }) {
  // Semantic state plates only — no decorative colour families.
  const toneMap = {
    success: "text-state-success-ink bg-state-success-surface",
    danger: "text-state-danger-ink bg-state-danger-surface",
    warning: "text-state-warning-ink bg-state-warning-surface",
  };
  return (
    <div>
      <div className={`text-xs font-semibold flex items-center gap-1.5 mb-1.5 px-2 py-1 rounded ${toneMap[tone]}`}>
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