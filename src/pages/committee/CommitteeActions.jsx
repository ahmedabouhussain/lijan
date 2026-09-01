import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import AuthorityLens from "@/components/raqeem/AuthorityLens";
import { ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import { CheckSquare, AlertTriangle, Clock } from "lucide-react";

export default function CommitteeActions() {
  const { data } = useCommittee();
  const { t } = useLanguage();

  if (!data) return null;
  const { my_role, is_oversight, is_recused, committee } = data;
  const actions = data.registers.actions || [];
  const overdue = actions.filter((a) => isOverdue(a.deadline) && a.status !== "closed");
  const open = actions.filter((a) => !["closed", "verified"].includes(a.status));
  const completed = actions.filter((a) => ["closed", "verified"].includes(a.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("إجراءات اللجنة", "Committee Actions")}</h1>
        <span className="text-sm text-muted-foreground">({actions.length})</span>
      </div>

      {/* Authority Lens for action management */}
      <AuthorityLens
        capability="close_action"
        role={my_role}
        isOversight={is_oversight}
        isRecused={is_recused}
        committeeName={committee.name_ar || committee.name_en}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="raqeem-card p-3 text-center">
          <div className="text-lg font-bold text-foreground">{open.length}</div>
          <div className="text-[11px] text-muted-foreground">{t("مفتوحة", "Open")}</div>
        </div>
        <div className="raqeem-card p-3 text-center">
          <div className="text-lg font-bold text-amber-700">{overdue.length}</div>
          <div className="text-[11px] text-muted-foreground">{t("متأخرة", "Overdue")}</div>
        </div>
        <div className="raqeem-card p-3 text-center">
          <div className="text-lg font-bold text-emerald-700">{completed.length}</div>
          <div className="text-[11px] text-muted-foreground">{t("مكتملة", "Completed")}</div>
        </div>
      </div>

      {/* Overdue actions first */}
      {overdue.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("إجراءات متأخرة", "Overdue Actions")}
          </h3>
          <div className="raqeem-card divide-y divide-border border-l-4 border-l-amber-400">
            {overdue.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{a.owner_name}</span>
                    <Clock className="w-3 h-3" />
                    <span className="text-amber-700">{formatDate(a.deadline)}</span>
                  </div>
                </div>
                <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open actions */}
      {open.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("إجراءات مفتوحة", "Open Actions")}</h3>
          <div className="raqeem-card divide-y divide-border">
            {open.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.owner_name} · {formatDate(a.deadline)}
                  </div>
                </div>
                <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />
              </div>
            ))}
          </div>
        </div>
      )}

      {actions.length === 0 && (
        <div className="raqeem-card p-8 text-center">
          <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد إجراءات", "No actions recorded")}</p>
        </div>
      )}
    </div>
  );
}