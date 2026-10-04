import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import NextActionCard from "@/components/raqeem/NextActionCard";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, isOverdue } from "@/lib/raqeemUtils";
import { ShieldCheck, AlertTriangle, Gavel, TrendingUp } from "lucide-react";

export default function ChairHome({ data, base }) {
  const { t } = useLanguage();
  const { committee, registers, meetings, members } = data;

  const decisions = registers.decisions || [];
  const actions = registers.actions || [];
  const upcoming = meetings.upcoming || [];

  // Governance blockers
  const decisionsAwaitingCert = decisions.filter((d) => d.status === "voting" || d.status === "in_review");
  const overdueActions = actions.filter((a) => isOverdue(a.deadline) && a.status !== "closed");
  const quorumRisk = upcoming.length > 0 && members.length < (committee.quorum_count || 3);
  const blockers = decisionsAwaitingCert.length + overdueActions.length + (quorumRisk ? 1 : 0);

  // Determine dominant next action
  let nextAction = null;
  if (quorumRisk && upcoming.length > 0) {
    nextAction = {
      to: `${base}/meetings`,
      icon: AlertTriangle,
      title: t("خطر النصاب للاجتماع القادم", "Quorum Risk for Next Meeting"),
      subtitle: t(
        `الاجتماع القادم يحتاج ${committee.quorum_count || 3} أعضاء وحالياً ${members.length} متاحين`,
        `Next meeting needs ${committee.quorum_count || 3} members, currently ${members.length} available`
      ),
      urgency: "critical",
      actionLabel: t("مراجعة الحضور", "Review Attendance"),
    };
  } else if (decisionsAwaitingCert.length > 0) {
    nextAction = {
      to: `${base}/decisions`,
      icon: Gavel,
      title: t("قرارات بانتظار الاعتماد", "Decisions Awaiting Certification"),
      subtitle: t(
        `${decisionsAwaitingCert.length} قرار يحتاج مراجعة وإصدار`,
        `${decisionsAwaitingCert.length} decisions need review and issuance`
      ),
      urgency: "high",
      actionLabel: t("مراجعة القرارات", "Review Decisions"),
    };
  } else if (overdueActions.length > 0) {
    nextAction = {
      to: `${base}/actions`,
      icon: AlertTriangle,
      title: t("إجراءات متأخرة", "Overdue Actions"),
      subtitle: t(
        `${overdueActions.length} إجراء تجاوز موعده النهائي`,
        `${overdueActions.length} actions have passed their deadline`
      ),
      urgency: "high",
      actionLabel: t("مراجعة الإجراءات", "Review Actions"),
    };
  } else {
    nextAction = {
      to: `${base}/meetings`,
      icon: ShieldCheck,
      title: t("حوكمة سليمة", "Governance Healthy"),
      subtitle: t("لا توجد حواجز حوكمة ملحة", "No pressing governance blockers"),
      urgency: "normal",
      actionLabel: t("عرض الاجتماعات", "View Meetings"),
    };
  }

  return (
    <div className="space-y-4">
      {/* Dominant next action */}
      <NextActionCard {...nextAction} />

      {/* Governance blockers summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Gavel, label: t("قرارات بانتظار الإصدار", "Decisions to Issue"), count: decisionsAwaitingCert.length, to: "/decisions", accent: "hsl(var(--primary))" },
          { icon: AlertTriangle, label: t("إجراءات متأخرة", "Overdue Actions"), count: overdueActions.length, to: "/actions", accent: overdueActions.length > 0 ? "#ef4444" : "hsl(var(--accent))" },
          { icon: ShieldCheck, label: t("خطر النصاب", "Quorum Risk"), count: quorumRisk ? 1 : 0, to: "/meetings", accent: quorumRisk ? "#f59e0b" : "hsl(var(--accent))" },
          { icon: TrendingUp, label: t("إجراءات مفتوحة", "Open Actions"), count: actions.filter((a) => !["closed", "verified"].includes(a.status)).length, to: "/actions", accent: "hsl(var(--accent))" },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <Link key={i} to={`${base}${item.to}`} className="raqeem-card p-3.5 relative overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all group">
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

      {/* Decisions awaiting certification */}
      {decisionsAwaitingCert.length > 0 && (
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" />
            {t("قرارات بانتظار الإصدار", "Decisions Awaiting Issuance")}
          </h3>
          <div className="space-y-2">
            {decisionsAwaitingCert.slice(0, 5).map((d) => (
              <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                  {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                </div>
                <StatusBadge label={t(DECISION_STATUS[d.status]?.ar || d.status, DECISION_STATUS[d.status]?.en || d.status)} colorClass={DECISION_STATUS[d.status]?.color} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Committee performance */}
      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          {t("أداء اللجنة", "Committee Performance")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">{t("القرارات الصادرة", "Issued Decisions")}</div>
            <div className="font-bold text-foreground">{decisions.filter((d) => ["issued", "executing", "completed"].includes(d.status)).length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("الإجراءات المكتملة", "Completed Actions")}</div>
            <div className="font-bold text-foreground">{actions.filter((a) => ["closed", "verified"].includes(a.status)).length}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">{t("نسبة الإنجاز", "Completion Rate")}</div>
            <div className="font-bold text-foreground">
              {actions.length > 0 ? Math.round((actions.filter((a) => ["closed", "verified"].includes(a.status)).length / actions.length) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}