import React from "react";
import {
  CalendarClock,
  ClipboardList,
  FileWarning,
  Gavel,
  CheckSquare,
  UserX,
  Users,
} from "lucide-react";
import { SectionCard, StatCard, AttentionItem } from "./shared";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, ACTION_STATUS, READINESS, formatDate, isOverdue } from "@/lib/raqeemUtils";

export default function SecretaryHome({ data }) {
  const { committees, members, meetings, agendaItems, decisions, actions } = data;

  const now = new Date();
  const upcomingMeetings = meetings
    .filter((m) => new Date(m.date) >= now && m.status === "scheduled")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Agenda preparation: items grouped by meeting readiness
  const upcomingMeetingIds = new Set(upcomingMeetings.map((m) => m.id));
  const agendaForUpcoming = agendaItems.filter((ai) => upcomingMeetingIds.has(ai.meeting_id));
  const notReadyItems = agendaForUpcoming.filter((ai) => ai.readiness === "not_ready" || ai.readiness === "needs_attention");

  // Quorum forecast per committee with upcoming meetings
  const quorumForecast = upcomingMeetings.slice(0, 5).map((m) => {
    const committee = committees.find((c) => c.id === m.committee_id);
    const activeMembers = members.filter((mem) => mem.committee_id === m.committee_id && mem.status === "active");
    return {
      meeting: m,
      committee,
      activeCount: activeMembers.length,
      quorum: m.quorum_required || committee?.quorum_count || 3,
      ready: activeMembers.length >= (m.quorum_required || committee?.quorum_count || 3),
    };
  });

  // Decisions awaiting formalization: approved but not issued
  const awaitingFormalization = decisions.filter((d) => d.status === "approved");

  // Action follow-up: in progress, not yet verified
  const actionFollowUp = actions.filter((a) => ["assigned", "in_progress", "evidence_pending"].includes(a.status));

  // Overdue member responses: inactive or recused members
  const overdueMemberResponses = members.filter((m) => ["inactive", "recused"].includes(m.status));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarClock} label="اجتماعات قادمة" value={upcomingMeetings.length} accent="text-primary" />
        <StatCard icon={FileWarning} label="بنود غير جاهزة" value={notReadyItems.length} accent="text-amber-600" />
        <StatCard icon={Gavel} label="بانتظار التدوين" value={awaitingFormalization.length} accent="text-blue-600" />
        <StatCard icon={UserX} label="استجابات متأخرة" value={overdueMemberResponses.length} accent="text-destructive" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={CalendarClock} title="الاجتماعات القادمة · Next Meetings" to="/calendar" empty={upcomingMeetings.length === 0} emptyText="لا توجد اجتماعات قادمة">
          {upcomingMeetings.slice(0, 5).map((m) => (
            <AttentionItem
              key={m.id}
              title={m.title || m.title_ar}
              subtitle={`${formatDate(m.date)} · ${m.mode} · نصاب: ${m.quorum_required || 3}`}
              badge={<StatusBadge label={m.agenda_ready ? "أعمال جاهزة" : "أعمال ناقصة"} colorClass={m.agenda_ready ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"} />}
              to="/calendar"
            />
          ))}
        </SectionCard>

        <SectionCard icon={ClipboardList} title="إعداد جدول الأعمال · Agenda Preparation" empty={agendaForUpcoming.length === 0} emptyText="لا توجد بنود جدول">
          {agendaForUpcoming.slice(0, 6).map((ai) => (
            <div key={ai.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{ai.title || ai.title_ar}</div>
                <div className="text-xs text-muted-foreground">{ai.presenter || "—"}</div>
              </div>
              <StatusBadge label={READINESS[ai.readiness]?.ar || ai.readiness} colorClass={READINESS[ai.readiness]?.color} />
            </div>
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={FileWarning} title="أوراق ناقصة · Missing Papers" empty={notReadyItems.length === 0} emptyText="جميع الأوراق جاهزة">
          {notReadyItems.slice(0, 5).map((ai) => (
            <AttentionItem
              key={ai.id}
              title={ai.title || ai.title_ar}
              subtitle={ai.objective || "—"}
              badge={<StatusBadge label={READINESS[ai.readiness]?.ar} colorClass={READINESS[ai.readiness]?.color} />}
              to="/calendar"
            />
          ))}
        </SectionCard>

        <SectionCard icon={Users} title="توقعات النصاب · Quorum Forecast" empty={quorumForecast.length === 0} emptyText="لا توجد اجتماعات قادمة">
          {quorumForecast.map((q) => (
            <div key={q.meeting.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{q.meeting.title || q.meeting.title_ar}</div>
                <div className="text-xs text-muted-foreground">{q.activeCount} / {q.quorum} أعضاء · {formatDate(q.meeting.date)}</div>
              </div>
              <StatusBadge label={q.ready ? "نصاب متوقع" : "نصاب غير متوقع"} colorClass={q.ready ? "text-emerald-700 bg-emerald-50" : "text-destructive bg-red-50"} />
            </div>
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={Gavel} title="قرارات بانتظار التدوين · Awaiting Formalization" to="/decisions" empty={awaitingFormalization.length === 0} emptyText="لا توجد قرارات بانتظار التدوين">
          {awaitingFormalization.slice(0, 5).map((d) => (
            <AttentionItem
              key={d.id}
              title={d.title}
              subtitle={d.decision_number || "—"}
              badge={<StatusBadge label={DECISION_STATUS.approved.ar} colorClass={DECISION_STATUS.approved.color} />}
              to="/decisions"
            />
          ))}
        </SectionCard>

        <SectionCard icon={CheckSquare} title="متابعة الإجراءات · Action Follow-up" to="/execution" empty={actionFollowUp.length === 0} emptyText="لا توجد إجراءات للمتابعة">
          {actionFollowUp.slice(0, 5).map((a) => (
            <AttentionItem
              key={a.id}
              title={a.title}
              subtitle={`${a.owner_name || "—"} · ${formatDate(a.deadline)}`}
              badge={<StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />}
              to="/execution"
            />
          ))}
        </SectionCard>
      </div>

      {overdueMemberResponses.length > 0 && (
        <SectionCard icon={UserX} title="استجابات أعضاء متأخرة · Overdue Member Responses" empty={false}>
          {overdueMemberResponses.slice(0, 5).map((m) => (
            <AttentionItem
              key={m.id}
              title={m.full_name || m.full_name_ar}
              subtitle={m.email || "—"}
              badge={<StatusBadge label={m.status === "inactive" ? "غير نشط" : "مُستبعد"} colorClass="text-amber-700 bg-amber-50" />}
              to="/committees"
            />
          ))}
        </SectionCard>
      )}
    </div>
  );
}