import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import NextActionCard from "@/components/raqeem/NextActionCard";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { L } from "@/lib/l10n";
import { MEETING_STATUS, formatDate } from "@/lib/raqeemUtils";
import { Calendar, FileText, CheckSquare, AlertTriangle } from "lucide-react";

export default function SecretaryHome({ data, base }) {
  const { t } = useLanguage();
  const { registers, meetings, members } = data;

  const minutes = registers.minutes || [];
  const actions = registers.actions || [];
  const upcoming = meetings.upcoming || [];

  // Secretary priorities
  const draftMinutes = minutes.filter((m) => m.status === "draft" || m.status === "in_review");
  const nextMeeting = upcoming[0];
  const rsvpGaps = nextMeeting ? members.length : 0; // simplified
  const packReady = nextMeeting?.agenda_ready || false;

  // Determine dominant next action
  let nextAction = null;
  if (draftMinutes.length > 0) {
    nextAction = {
      to: `${base}/minutes`,
      icon: FileText,
      title: t("محاضر بانتظار التحرير", "Minutes to Draft"),
      subtitle: t(
        `${draftMinutes.length} محضر يحتاج تحرير ومراجعة`,
        `${draftMinutes.length} minutes need drafting and review`
      ),
      urgency: "high",
      actionLabel: t("تحرير المحاضر", "Draft Minutes"),
    };
  } else if (nextMeeting && !packReady) {
    nextAction = {
      to: `${base}/meetings`,
      icon: Calendar,
      title: t("حزمة الاجتماع غير جاهزة", "Meeting Pack Not Ready"),
      subtitle: t(
        `الاجتماع القادم في ${formatDate(nextMeeting.date)} يحتاج إعداد الحزمة`,
        `Next meeting on ${formatDate(nextMeeting.date)} needs pack preparation`
      ),
      urgency: "high",
      actionLabel: t("إعداد الحزمة", "Prepare Pack"),
    };
  } else if (nextMeeting) {
    nextAction = {
      to: `${base}/meetings`,
      icon: Calendar,
      title: t("اجتماع قادم", "Upcoming Meeting"),
      subtitle: t(
        `${formatDate(nextMeeting.date)} · ${nextMeeting.mode || ""}`,
        `${formatDate(nextMeeting.date)} · ${nextMeeting.mode || ""}`
      ),
      urgency: "normal",
      actionLabel: t("مراجعة التحضير", "Review Preparation"),
    };
  } else {
    nextAction = {
      to: `${base}/meetings`,
      icon: Calendar,
      title: t("لا توجد اجتماعات قادمة", "No Upcoming Meetings"),
      subtitle: t("جدولة اجتماع جديد للجنة", "Schedule a new meeting for the committee"),
      urgency: "normal",
      actionLabel: t("جدولة اجتماع", "Schedule Meeting"),
    };
  }

  return (
    <div className="space-y-4">
      <NextActionCard {...nextAction} />

      {/* Secretary priorities grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: FileText, label: t("محاضر للتحرير", "Minutes to Draft"), count: draftMinutes.length, to: "/minutes" },
          { icon: Calendar, label: t("اجتماعات قادمة", "Upcoming Meetings"), count: upcoming.length, to: "/meetings" },
          { icon: CheckSquare, label: t("إجراءات للإنشاء", "Actions to Create"), count: actions.filter((a) => a.status === "assigned").length, to: "/actions" },
          { icon: AlertTriangle, label: t("فجوات RSVP", "RSVP Gaps"), count: rsvpGaps, to: "/meetings" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <Link key={i} to={item.to} className="raqeem-card p-3 hover:bg-secondary/30 transition-colors">
              <Icon className="w-4 h-4 text-muted-foreground mb-1.5" />
              <div className="text-lg font-bold text-foreground">{item.count}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{item.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Upcoming meetings with pack status */}
      {upcoming.length > 0 && (
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            {t("التحضير للاجتماعات", "Meeting Preparation")}
          </h3>
          <div className="space-y-2">
            {upcoming.slice(0, 4).map((m) => (
              <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{L.title(m)}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)}</div>
                </div>
                <div className="flex items-center gap-2">
                  {m.agenda_ready ? (
                    <span className="text-[11px] text-emerald-700 font-medium">{t("الحزمة جاهزة", "Pack Ready")}</span>
                  ) : (
                    <span className="text-[11px] text-amber-700 font-medium">{t("الحزمة غير جاهزة", "Pack Not Ready")}</span>
                  )}
                  <StatusBadge label={t(MEETING_STATUS[m.status]?.ar || m.status, MEETING_STATUS[m.status]?.en || m.status)} colorClass={MEETING_STATUS[m.status]?.color} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Minutes needing work */}
      {draftMinutes.length > 0 && (
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {t("محاضر قيد التحرير", "Minutes in Drafting")}
          </h3>
          <div className="space-y-2">
            {draftMinutes.slice(0, 4).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{t("محضر", "Minutes")} {m.minutes_number || "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.drafted_by_name || "—"}</div>
                </div>
                <span className="text-[11px] text-amber-700 font-medium">{t("مسودة", "Draft")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}