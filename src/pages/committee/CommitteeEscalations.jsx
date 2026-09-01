import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { TrendingUp } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate, isOverdue } from "@/lib/raqeemUtils";

const ESCALATION = {
  none: { ar: "لا يوجد", en: "None", color: "bg-secondary text-muted-foreground" },
  reminder: { ar: "تذكير", en: "Reminder", color: "bg-blue-100 text-blue-700" },
  priority_reminder: { ar: "تذكير أولوية", en: "Priority Reminder", color: "bg-amber-100 text-amber-700" },
  owner_secretary: { ar: "أمين السر", en: "Owner Secretary", color: "bg-orange-100 text-orange-700" },
  chair: { ar: "الرئيس", en: "Chair", color: "bg-red-100 text-red-700" },
  escalation_authority: { ar: "جهة التصعيد", en: "Escalation Authority", color: "bg-red-200 text-red-800" },
};

export default function CommitteeEscalations() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("escalations");
  if (!data) return null;
  const actions = (data.registers?.actions || []).filter((a) => a.escalation_level && a.escalation_level !== "none");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("التصعيدات", "Escalations")}</h1>
      </div>
      {actions.length === 0 ? (
        <EmptyState icon={TrendingUp} title={t("لا توجد تصعيدات", "No Escalations")} description={t("لم يتم تصعيد أي إجراء.", "No actions have been escalated.")} />
      ) : (
        <div className="space-y-2">
          {actions.sort((a, b) => {
            const order = ["escalation_authority", "chair", "owner_secretary", "priority_reminder", "reminder"];
            return order.indexOf(a.escalation_level) - order.indexOf(b.escalation_level);
          }).map((a) => {
            const ei = ESCALATION[a.escalation_level] || ESCALATION.reminder;
            return (
              <div key={a.id} className="raqeem-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{a.title_ar || a.title}</span>
                  <StatusBadge label={t(ei.ar, ei.en)} colorClass={ei.color} />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{t("المسؤول", "Owner")}: {a.owner_name}</div>
                  {a.deadline && <div>{t("الموعد النهائي", "Deadline")}: {formatDate(a.deadline)} {isOverdue(a.deadline) && <span className="text-red-600">({t("متأخر", "overdue")})</span>}</div>}
                  {a.blocker && <div className="text-red-600">{t("العائق", "Blocker")}: {a.blocker}</div>}
                  {a.reminder_count > 0 && <div>{t("عدد التذكيرات", "Reminders")}: {a.reminder_count}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}