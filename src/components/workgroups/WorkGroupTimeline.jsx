// LIJAN™ — WorkGroupTimeline.
// Built only from records the work group actually holds: a meeting is shown as HELD only when a
// minute or attendance record proves it; a declared date stays a SCHEDULED plan.

import React from "react";
import { CircleDot, CalendarClock, CalendarCheck, FileText, Gavel, CheckSquare } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const ICONS = {
  meeting_scheduled: CalendarClock,
  meeting_held: CalendarCheck,
  minutes: FileText,
  decision: Gavel,
  action: CheckSquare,
  update: CircleDot,
};

function buildEvents({ workGroup, meetings, minutes, decisions, actions, t }) {
  const events = [];

  if (workGroup.first_meeting_date) {
    const held = workGroup.first_meeting_status === "held";
    events.push({
      key: "first-meeting",
      kind: held ? "meeting_held" : "meeting_scheduled",
      date: workGroup.first_meeting_date,
      title: held ? t("الاجتماع الأول — منعقد", "First meeting — held") : t("الاجتماع الأول — مجدول", "First meeting — scheduled"),
      detail: held
        ? t("مثبت بمحضر أو سجل حضور.", "Evidenced by a minute or attendance record.")
        : t("موعد مخطّط؛ لم يُثبت الانعقاد بمحضر بعد.", "Planned date; convening not yet evidenced by a minute."),
    });
  }

  for (const m of meetings) {
    events.push({
      key: `m-${m.id}`,
      kind: new Date(m.date) < new Date() ? "meeting_held" : "meeting_scheduled",
      date: m.date,
      title: m.title_ar && m.title_ar !== m.title ? m.title_ar : m.title,
      detail: t("اجتماع مسجّل في سجل اللجنة.", "Meeting recorded in the committee register."),
    });
  }

  for (const min of minutes) {
    events.push({
      key: `min-${min.id}`,
      kind: "minutes",
      date: min.approved_at || min.created_date,
      title: t("محضر اجتماع", "Meeting minutes"),
      detail: min.status === "approved" ? t("محضر معتمد.", "Approved minute.") : t("محضر قيد الاعتماد.", "Minute pending approval."),
    });
  }

  for (const d of decisions) {
    events.push({
      key: `d-${d.id}`,
      kind: "decision",
      date: d.decision_date || d.created_date,
      title: t("قرار صادر", "Decision issued"),
      detail: d.status === "approved" || d.status === "issued" ? t("قرار معتمد.", "Approved decision.") : t("قرار قيد المعالجة.", "Decision in progress."),
    });
  }

  for (const a of actions) {
    events.push({
      key: `a-${a.id}`,
      kind: "action",
      date: a.deadline || a.created_date,
      title: a.title_ar || a.title,
      detail: a.deadline ? t(`استحقاق ${a.deadline}`, `Due ${a.deadline}`) : t("إجراء مسند.", "Assigned action."),
    });
  }

  return events
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 12);
}

export default function WorkGroupTimeline({ workGroup, meetings = [], minutes = [], decisions = [], actions = [] }) {
  const { t, lang } = useLanguage();
  const events = buildEvents({ workGroup, meetings, minutes, decisions, actions, t });

  if (events.length === 0) {
    return <p className="text-xs text-muted-foreground">{t("لا توجد أحداث مسجلة لهذه المجموعة بعد.", "No events recorded for this work group yet.")}</p>;
  }

  return (
    <ol className="space-y-3">
      {events.map((e) => {
        const Icon = ICONS[e.kind] || CircleDot;
        return (
          <li key={e.key} className="flex gap-3">
            <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-secondary/60 flex items-center justify-center" aria-hidden="true">
              <Icon className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-foreground leading-snug">{e.title}</span>
                <time className="text-xs text-muted-foreground arabic-figures shrink-0">{e.date}</time>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{e.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}