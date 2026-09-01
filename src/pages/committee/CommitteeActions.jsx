import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import { CheckSquare, AlertTriangle } from "lucide-react";

export default function CommitteeActions() {
  const { data } = useCommittee();
  const { t } = useLanguage();

  if (!data) return null;
  const actions = data.registers.actions || [];
  const overdue = actions.filter((a) => isOverdue(a.deadline) && a.status !== "closed");
  const open = actions.filter((a) => !["closed", "verified"].includes(a.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("إجراءات اللجنة", "Committee Actions")}</h1>
        <span className="text-sm text-muted-foreground">({actions.length})</span>
      </div>

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
          <div className="text-lg font-bold text-emerald-700">{actions.filter((a) => a.status === "closed" || a.status === "verified").length}</div>
          <div className="text-[11px] text-muted-foreground">{t("مكتملة", "Completed")}</div>
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد إجراءات", "No actions recorded")}</p>
        </div>
      ) : (
        <div className="raqeem-card divide-y divide-border">
          {actions.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                <div className="text-xs text-muted-foreground">
                  {a.owner_name} · {formatDate(a.deadline)}
                  {isOverdue(a.deadline) && a.status !== "closed" && (
                    <span className="text-amber-700 inline-flex items-center gap-1 ml-2">
                      <AlertTriangle className="w-3 h-3" /> {t("متأخر", "Overdue")}
                    </span>
                  )}
                </div>
              </div>
              <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}