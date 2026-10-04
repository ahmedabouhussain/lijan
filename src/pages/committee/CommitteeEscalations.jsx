import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import EscalationAction from "@/components/raqeem/EscalationAction";
import { TrendingUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate, isOverdue } from "@/lib/raqeemUtils";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { L } from "@/lib/l10n";

const ESCALATION = {
  none: { ar: "لا يوجد", en: "None", color: "bg-secondary text-muted-foreground" },
  reminder: { ar: "تذكير", en: "Reminder", color: "bg-secondary text-muted-foreground" },
  priority_reminder: { ar: "تذكير أولوية", en: "Priority Reminder", color: "bg-amber-50 text-amber-700" },
  owner_secretary: { ar: "أمين السر", en: "Owner Secretary", color: "bg-amber-100 text-amber-700" },
  chair: { ar: "الرئيس", en: "Chair", color: "bg-red-50 text-red-700" },
  escalation_authority: { ar: "جهة التصعيد", en: "Escalation Authority", color: "bg-red-100 text-red-800" },
};

const LEVEL_OPTIONS = [
  { value: "reminder", label_ar: "تذكير", label_en: "Reminder" },
  { value: "priority_reminder", label_ar: "تذكير أولوية", label_en: "Priority Reminder" },
  { value: "owner_secretary", label_ar: "أمين السر", label_en: "Owner Secretary" },
  { value: "chair", label_ar: "الرئيس", label_en: "Chair" },
  { value: "escalation_authority", label_ar: "جهة التصعيد", label_en: "Escalation Authority" },
];

export default function CommitteeEscalations() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("escalations");
  const { canManageExecution } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [showCreate, setShowCreate] = useState(false);
  const [escalatingId, setEscalatingId] = useState(null);

  if (!data) return <TableSkeleton rows={4} />;
  const actions = (data.registers?.actions || []).filter((a) => a.escalation_level && a.escalation_level !== "none");
  const openActions = (data.registers?.actions || []).filter((a) => !["closed", "verified"].includes(a.status));
  const committeeId = data.committee.id;

  // The receiving authority and the permission are enforced by the server; this only
  // carries the required reason and reports the confirmed level the server returned.
  const handleEscalate = async (actionId, note) => {
    setEscalatingId(actionId);
    try {
      const res = await execute("ProcessEscalation", {
        committee_id: committeeId,
        action_id: actionId,
        escalation_note: note,
      });
      const level = res?.data?.new_escalation_level || res?.new_escalation_level;
      reload();
      return level;
    } finally {
      setEscalatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={TrendingUp}
        title={getTitle("التصعيدات", "Escalations", lang)}
        badge={<span className="text-sm text-muted-foreground">({actions.length})</span>}
        actions={canManageExecution && openActions.length > 0 && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t("تصعيد إجراء", "Escalate Action")}
          </Button>
        )}
      />

      {showCreate && canManageExecution && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("تصعيد إجراء", "Escalate Action")}
          functionName="ProcessEscalation"
          payload={{ committee_id: committeeId }}
          onSuccess={reload}
          submitLabel={t("تصعيد", "Escalate")}
          fields={[
            {
              name: "action_id",
              label: t("الإجراء", "Action"),
              type: "select",
              required: true,
              options: openActions.map((a) => ({ value: a.id, label_ar: a.title_ar || a.title, label_en: a.title })),
            },
            { name: "escalation_level", label: t("مستوى التصعيد", "Level"), type: "select", required: true, options: LEVEL_OPTIONS },
            { name: "escalation_note", label: t("سبب التصعيد", "Escalation Reason"), type: "textarea", fullWidth: true, rows: 2 },
          ]}
        />
      )}

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
                  <span className="text-sm font-medium">{L.title(a)}</span>
                  <StatusBadge label={t(ei.ar, ei.en)} colorClass={ei.color} />
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{t("المسؤول", "Owner")}: {a.owner_name}</div>
                  {a.deadline && <div>{t("الموعد النهائي", "Deadline")}: {formatDate(a.deadline)} {isOverdue(a.deadline) && <span className="text-red-600">({t("متأخر", "overdue")})</span>}</div>}
                  {a.blocker && <div className="text-red-600">{t("العائق", "Blocker")}: {a.blocker}</div>}
                  {a.reminder_count > 0 && <div>{t("عدد التذكيرات", "Reminders")}: {a.reminder_count}</div>}
                </div>
                {canManageExecution && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <EscalationAction
                      action={a}
                      busy={submitting && escalatingId === a.id}
                      onEscalate={handleEscalate}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}