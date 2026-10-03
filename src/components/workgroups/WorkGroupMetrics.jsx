// LIJAN™ — WorkGroupMetrics: every figure is derived from the work group's own records.
// No metric is authored in this file; when the group has no records the metric reads zero.

import React from "react";
import { CalendarCheck, CalendarClock, Gavel, CheckSquare, AlertTriangle, Flag, FileText, TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

function Tile({ icon: Icon, label, value, tone = "default", hint }) {
  return (
    <div className="raqeem-card p-3 flex items-start gap-2.5">
      <span
        className={
          tone === "alert"
            ? "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-destructive/8 text-destructive"
            : "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary/8 text-primary"
        }
        aria-hidden="true"
      >
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground leading-tight">{label}</div>
        <div className="text-lg font-bold text-foreground arabic-figures leading-tight">{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground leading-tight">{hint}</div>}
      </div>
    </div>
  );
}

export default function WorkGroupMetrics({ metrics }) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      <Tile icon={CalendarCheck} label={t("اجتماعات منعقدة", "Meetings held")} value={metrics.meetingsHeld} />
      <Tile icon={CalendarClock} label={t("اجتماعات قادمة", "Upcoming meetings")} value={metrics.meetingsUpcoming} />
      <Tile icon={Gavel} label={t("قرارات معتمدة", "Approved decisions")} value={metrics.decisionsApproved} />
      <Tile
        icon={CheckSquare}
        label={t("إجراءات مفتوحة", "Open actions")}
        value={metrics.actionsOpen}
        hint={metrics.actionsOverdue > 0 ? t(`${metrics.actionsOverdue} متأخرة`, `${metrics.actionsOverdue} overdue`) : null}
      />
      <Tile icon={AlertTriangle} label={t("إجراءات متأخرة", "Overdue actions")} value={metrics.actionsOverdue} tone={metrics.actionsOverdue > 0 ? "alert" : "default"} />
      <Tile icon={Flag} label={t("مبادرات نشطة", "Active initiatives")} value={metrics.initiativesActive} />
      <Tile icon={FileText} label={t("وثائق حالية", "Current documents")} value={metrics.documentsCurrent} />
      <Tile
        icon={TrendingUp}
        label={t("نسبة الإنجاز", "Completion")}
        value={`${metrics.progressPercent}%`}
        hint={metrics.nextDeadline ? t(`الاستحقاق التالي ${metrics.nextDeadline}`, `Next due ${metrics.nextDeadline}`) : null}
      />
    </div>
  );
}