import React from "react";
import { L } from "@/lib/l10n";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  Gavel,
  Ban,
  TrendingUp,
  Users,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { SectionCard, StatCard, AttentionItem } from "./shared";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";

export default function ChairHome({ data }) {
  const { committees, members, meetings, decisions, actions } = data;

  const now = new Date();
  const upcomingMeetings = meetings.filter((m) => new Date(m.date) >= now && m.status === "scheduled");
  const meetingsNeedingAgenda = upcomingMeetings.filter((m) => !m.agenda_ready);

  const pendingDecisions = decisions.filter((d) =>
    ["draft", "in_review", "proposed", "voting"].includes(d.status)
  );

  const blockedActions = actions.filter((a) => a.status === "blocked");
  const escalations = actions.filter((a) => a.escalation_level && a.escalation_level !== "none");
  const overdueStrategic = actions.filter((a) => isOverdue(a.deadline) && ["high", "critical"].includes(a.priority));

  // Quorum readiness per active committee
  const activeCommittees = committees.filter((c) => c.status === "active");
  const quorumReadiness = activeCommittees.map((c) => {
    const activeMembers = members.filter((m) => m.committee_id === c.id && m.status === "active");
    return {
      committee: c,
      activeCount: activeMembers.length,
      quorum: c.quorum_count || 3,
      ready: activeMembers.length >= (c.quorum_count || 3),
    };
  });
  const quorumAtRisk = quorumReadiness.filter((q) => !q.ready);

  // Mandate progress
  const mandateProgress = committees.map((c) => ({
    committee: c,
    complete: c.governance_complete,
    status: c.status,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarClock} label="اجتماعات بانتظار الأعمال" value={meetingsNeedingAgenda.length} accent="text-amber-600" />
        <StatCard icon={Gavel} label="قرارات معلقة" value={pendingDecisions.length} accent="text-blue-600" />
        <StatCard icon={Ban} label="إجراءات متعثرة" value={blockedActions.length} accent="text-destructive" />
        <StatCard icon={TrendingUp} label="تصعيدات" value={escalations.length} accent="text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={CalendarClock} title="اجتماعات بانتظار اعتماد الأعمال · Agenda Approval" to="/calendar" empty={meetingsNeedingAgenda.length === 0} emptyText="جميع الاجتماعات لها جدول أعمال">
          {meetingsNeedingAgenda.slice(0, 5).map((m) => (
            <AttentionItem
              key={m.id}
              title={m.title || m.title_ar}
              subtitle={`${formatDate(m.date)} · ${m.mode}`}
              badge={<StatusBadge label="بانتظار الأعمال" colorClass="text-amber-700 bg-amber-50" />}
              to="/calendar"
            />
          ))}
        </SectionCard>

        <SectionCard icon={Gavel} title="قرارات معلقة · Pending Decisions" to="/decisions" empty={pendingDecisions.length === 0} emptyText="لا توجد قرارات معلقة">
          {pendingDecisions.slice(0, 5).map((d) => (
            <AttentionItem
              key={d.id}
              title={d.title}
              subtitle={d.decision_number || "—"}
              badge={<StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />}
              to="/decisions"
            />
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={Users} title="جاهزية النصاب · Quorum Readiness" empty={quorumReadiness.length === 0} emptyText="لا توجد لجان نشطة">
          {quorumReadiness.slice(0, 5).map((q) => (
            <div key={q.committee.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="min-w-0">
                <Link to={`/committees/${q.committee.id}`} className="text-sm font-medium text-foreground truncate block hover:underline">
                  {L.name(q.committee)}
                </Link>
                <div className="text-xs text-muted-foreground">{q.activeCount} / {q.quorum} أعضاء نشطون</div>
              </div>
              <StatusBadge label={q.ready ? "نصاب مكتمل" : "نصاب غير مكتمل"} colorClass={q.ready ? "text-emerald-700 bg-emerald-50" : "text-destructive bg-red-50"} />
            </div>
          ))}
        </SectionCard>

        <SectionCard icon={Ban} title="إجراءات استراتيجية متعثرة · Blocked Actions" to="/execution" empty={blockedActions.length === 0} emptyText="لا توجد إجراءات متعثرة">
          {blockedActions.slice(0, 5).map((a) => (
            <AttentionItem
              key={a.id}
              title={a.title}
              subtitle={a.blocker || a.owner_name || "—"}
              badge={<StatusBadge label={ACTION_STATUS.blocked.ar} colorClass={ACTION_STATUS.blocked.color} />}
              to="/execution"
            />
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={TrendingUp} title="تصعيدات · Escalations" to="/execution" empty={escalations.length === 0} emptyText="لا توجد تصعيدات">
          {escalations.slice(0, 5).map((a) => (
            <AttentionItem
              key={a.id}
              title={a.title}
              subtitle={`مستوى: ${a.escalation_level} · ${a.owner_name || "—"}`}
              badge={<StatusBadge label="تصعيد" colorClass="text-destructive bg-red-50" />}
              to="/execution"
            />
          ))}
        </SectionCard>

        <SectionCard icon={ShieldCheck} title="تقدم الصلاحية · Mandate Progress" to="/committees" empty={mandateProgress.length === 0} emptyText="لا توجد لجان">
          {mandateProgress.slice(0, 5).map((mp) => (
            <div key={mp.committee.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <Link to={`/committees/${mp.committee.id}`} className="text-sm font-medium text-foreground truncate hover:underline">
                {L.name(mp.committee)}
              </Link>
              <StatusBadge
                label={mp.complete ? "حوكمة مكتملة" : "قيد الاستكمال"}
                colorClass={mp.complete ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"}
              />
            </div>
          ))}
        </SectionCard>
      </div>
    </div>
  );
}