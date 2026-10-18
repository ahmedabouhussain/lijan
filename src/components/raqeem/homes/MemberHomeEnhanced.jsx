import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import NextActionCard from "@/components/raqeem/NextActionCard";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LocalizedField from "@/components/raqeem/LocalizedField";
import { DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import { Calendar, Gavel, CheckSquare, FileText, AlertTriangle, Clock } from "lucide-react";

export default function MemberHome({ data, base, userName }) {
  const { t } = useLanguage();
  const { registers, meetings } = data;

  const decisions = registers.decisions || [];
  const actions = registers.actions || [];
  const minutes = registers.minutes || [];
  const upcoming = meetings.upcoming || [];

  // Member priorities
  const openVotes = decisions.filter((d) => d.status === "voting");
  const myActions = actions.filter((a) => a.owner_name === userName && !["closed", "verified"].includes(a.status));
  const myOverdue = myActions.filter((a) => isOverdue(a.deadline));
  const minutesToReview = minutes.filter((m) => m.status === "in_review");
  const nextMeeting = upcoming[0];

  // Determine dominant next action
  let nextAction = null;
  if (openVotes.length > 0) {
    nextAction = {
      to: `${base}/voting`,
      icon: Gavel,
      title: t("تصويت مفتوح", "Open Vote"),
      subtitle: t(
        `${openVotes.length} قرار بانتظار تصويتك`,
        `${openVotes.length} decisions awaiting your vote`
      ),
      urgency: "critical",
      actionLabel: t("التصويت الآن", "Vote Now"),
    };
  } else if (myOverdue.length > 0) {
    nextAction = {
      to: `${base}/actions`,
      icon: AlertTriangle,
      title: t("إجراء متأخر معيّن لك", "Overdue Action Assigned to You"),
      subtitle: t(
        `${myOverdue.length} إجراء تجاوز موعده النهائي`,
        `${myOverdue.length} actions have passed their deadline`
      ),
      urgency: "critical",
      actionLabel: t("مراجعة الإجراءات", "Review Actions"),
    };
  } else if (nextMeeting) {
    nextAction = {
      to: `/meetings/${nextMeeting.id}`,
      icon: Calendar,
      title: t("اجتماع قادم", "Upcoming Meeting"),
      subtitle: t(
        `${formatDate(nextMeeting.date)} · ${nextMeeting.mode || ""}`,
        `${formatDate(nextMeeting.date)} · ${nextMeeting.mode || ""}`
      ),
      urgency: "normal",
      actionLabel: t("عرض الحزمة", "View Pack"),
    };
  } else if (myActions.length > 0) {
    nextAction = {
      to: `${base}/actions`,
      icon: CheckSquare,
      title: t("إجراءات معيّنة لك", "Actions Assigned to You"),
      subtitle: t(
        `${myActions.length} إجراء بانتظار التنفيذ`,
        `${myActions.length} actions awaiting execution`
      ),
      urgency: "normal",
      actionLabel: t("عرض الإجراءات", "View Actions"),
    };
  } else {
    nextAction = {
      to: `${base}/decisions`,
      icon: FileText,
      title: t("لا توجد مهام ملحة", "No Urgent Tasks"),
      subtitle: t("تصفح قرارات وسجلات اللجنة", "Browse committee decisions and records"),
      urgency: "normal",
      actionLabel: t("عرض السجلات", "View Records"),
    };
  }

  return (
    <div className="space-y-4">
      <NextActionCard {...nextAction} />

      {/* Member priorities */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Gavel, label: t("تصويتات مفتوحة", "Open Votes"), count: openVotes.length, to: "/voting", accent: openVotes.length > 0 ? "hsl(var(--primary))" : "hsl(var(--accent))" },
          { icon: CheckSquare, label: t("إجراءاتي", "My Actions"), count: myActions.length, to: "/actions", accent: "hsl(var(--accent))" },
          { icon: AlertTriangle, label: t("إجراءاتي المتأخرة", "My Overdue"), count: myOverdue.length, to: "/actions", accent: myOverdue.length > 0 ? "#ef4444" : "hsl(var(--accent))" },
          { icon: FileText, label: t("محاضر للمراجعة", "Minutes to Review"), count: minutesToReview.length, to: "/minutes", accent: minutesToReview.length > 0 ? "#f59e0b" : "hsl(var(--accent))" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <Link key={i} to={item.to} className="raqeem-card p-3.5 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group">
              {item.accent && <div className="absolute top-0 left-0 w-1 h-full" style={{ background: item.accent }} />}
              <div className="flex items-center gap-2.5 pl-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{item.count}</div>
              </div>
              <div className="text-[11px] text-muted-foreground leading-tight mt-2 pl-1">{item.label}</div>
            </Link>
          );
        })}
      </div>

      {/* Open votes */}
      {openVotes.length > 0 && (
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" />
            {t("قرارات قيد التصويت", "Decisions in Voting")}
          </h3>
          <div className="space-y-2">
            {openVotes.slice(0, 5).map((d) => (
              <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate"><LocalizedField entity="Decision" record={d} base="title" /></div>
                  <div className="text-xs text-muted-foreground">
                    {t("موافق", "For")}: {d.vote_for || 0} · {t("معارض", "Against")}: {d.vote_against || 0}
                  </div>
                </div>
                <StatusBadge label={t(DECISION_STATUS[d.status]?.ar || d.status, DECISION_STATUS[d.status]?.en || d.status)} colorClass={DECISION_STATUS[d.status]?.color} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* My actions */}
      {myActions.length > 0 && (
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            {t("إجراءاتي المعيّنة", "My Assigned Actions")}
          </h3>
          <div className="space-y-2">
            {myActions.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {formatDate(a.deadline)}
                    {isOverdue(a.deadline) && <span className="text-amber-700">{t("متأخر", "Overdue")}</span>}
                  </div>
                </div>
                <StatusBadge label={t(ACTION_STATUS[a.status]?.ar || a.status, ACTION_STATUS[a.status]?.en || a.status)} colorClass={ACTION_STATUS[a.status]?.color} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}