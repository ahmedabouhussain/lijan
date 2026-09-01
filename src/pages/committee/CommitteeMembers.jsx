import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { MEMBER_ROLE } from "@/lib/raqeemUtils";
import { Users } from "lucide-react";

const ROLE_ORDER = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };

export default function CommitteeMembers() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription, getEmptyState, isSectionVisible } = usePageConfig("members");

  if (!data) return null;
  const { members, committee } = data;
  const ordered = [...members].sort((a, b) => (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("أعضاء اللجنة", "Committee Members", lang)}</h1>
        <span className="text-sm text-muted-foreground">({ordered.length})</span>
      </div>
      {(() => {
        const desc = getDescription("", "", lang);
        return desc ? <p className="text-sm text-muted-foreground -mt-2">{desc}</p> : null;
      })()}

      {ordered.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{getEmptyState("لا يوجد أعضاء مسجلون", "No members registered", lang)}</p>
        </div>
      ) : (
        <div className="raqeem-card divide-y divide-border">
          {ordered.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-medium text-foreground">
                  {(m.full_name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.institution_name || "—"}
                    {m.user_email && ` · ${m.user_email}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.role === "alternate" && !m.activated && (
                  <StatusBadge label={t("بديل غير مفعّل", "Inactive Alternate")} colorClass="bg-secondary text-muted-foreground" />
                )}
                <StatusBadge label={MEMBER_ROLE[m.role]?.ar || m.role} colorClass={MEMBER_ROLE[m.role]?.color} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}