import React from "react";
import {
  CalendarClock,
  FileText,
  ClipboardList,
  Vote,
  Gavel,
  CheckSquare,
  Users,
} from "lucide-react";
import { SectionCard, StatCard, AttentionItem } from "./shared";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, ACTION_STATUS, READINESS, MEETING_STATUS, formatDate } from "@/lib/raqeemUtils";

export default function MemberHome({ data }) {
  const { user, committees, members, meetings, agendaItems, decisions, actions } = data;

  // Identify my committees: match by email or full_name against CommitteeMember
  const myMembers = members.filter(
    (m) =>
      (user?.email && m.email === user.email) ||
      (user?.full_name && m.full_name === user.full_name)
  );
  const myCommitteeIds = new Set(myMembers.map((m) => m.committee_id));
  const myCommittees = committees.filter((c) => myCommitteeIds.has(c.id));

  // My meetings (upcoming)
  const now = new Date();
  const myMeetings = meetings
    .filter((m) => myCommitteeIds.has(m.committee_id) && new Date(m.date) >= now && m.status === "scheduled")
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const myNextMeeting = myMeetings[0];

  // My agenda items (from my upcoming meetings)
  const myMeetingIds = new Set(myMeetings.map((m) => m.id));
  const myAgendaItems = agendaItems.filter((ai) => myMeetingIds.has(ai.meeting_id));
  const itemsNeedingPrep = myAgendaItems.filter((ai) => ai.readiness === "needs_attention" || ai.readiness === "not_ready");

  // Votes requiring action: decisions in "voting" status in my committees
  const myDecisions = decisions.filter((d) => myCommitteeIds.has(d.committee_id));
  const votesRequiringAction = myDecisions.filter((d) => d.status === "voting");

  // Decisions relevant to me: recent decisions in my committees
  const recentMyDecisions = myDecisions
    .filter((d) => ["approved", "issued", "executing", "completed"].includes(d.status))
    .slice(0, 5);

  // Tasks assigned to me: actions where owner_name matches my name, or in my committees
  const myActions = actions.filter(
    (a) =>
      (user?.full_name && a.owner_name === user.full_name) ||
      myCommitteeIds.has(a.committee_id)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarClock} label="اجتماعي القادم" value={myNextMeeting ? formatDate(myNextMeeting.date) : "—"} accent="text-primary" />
        <StatCard icon={FileText} label="وثائق للمراجعة" value={myAgendaItems.length} accent="text-blue-600" />
        <StatCard icon={Vote} label="تصويتات تتطلب إجراءً" value={votesRequiringAction.length} accent="text-purple-600" />
        <StatCard icon={CheckSquare} label="مهام مسندة لي" value={myActions.length} accent="text-amber-600" />
      </div>

      {myCommittees.length === 0 && (
        <div className="raqeem-card p-6 text-center">
          <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">لم تتم إضافتك إلى أي لجنة بعد · You have not been added to any committee yet</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={CalendarClock} title="اجتماعي القادم · My Next Meeting" to="/calendar" empty={!myNextMeeting} emptyText="لا يوجد اجتماع قادم">
          {myNextMeeting && (
            <AttentionItem
              title={myNextMeeting.title || myNextMeeting.title_ar}
              subtitle={`${formatDate(myNextMeeting.date)} · ${myNextMeeting.mode}`}
              badge={<StatusBadge label={MEETING_STATUS[myNextMeeting.status]?.ar || myNextMeeting.status} colorClass={MEETING_STATUS[myNextMeeting.status]?.color} />}
              to="/calendar"
            />
          )}
        </SectionCard>

        <SectionCard icon={FileText} title="وثائق للمراجعة · Documents to Review" empty={myAgendaItems.length === 0} emptyText="لا توجد وثائق للمراجعة">
          {myAgendaItems.slice(0, 5).map((ai) => (
            <AttentionItem
              key={ai.id}
              title={ai.title || ai.title_ar}
              subtitle={ai.presenter || "—"}
              badge={<StatusBadge label={READINESS[ai.readiness]?.ar || ai.readiness} colorClass={READINESS[ai.readiness]?.color} />}
              to="/calendar"
            />
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={ClipboardList} title="بنود تتطلب تحضيراً · Items Requiring Preparation" empty={itemsNeedingPrep.length === 0} emptyText="جميع البنود جاهزة">
          {itemsNeedingPrep.slice(0, 5).map((ai) => (
            <AttentionItem
              key={ai.id}
              title={ai.title || ai.title_ar}
              subtitle={ai.objective || "—"}
              badge={<StatusBadge label={READINESS[ai.readiness]?.ar} colorClass={READINESS[ai.readiness]?.color} />}
              to="/calendar"
            />
          ))}
        </SectionCard>

        <SectionCard icon={Vote} title="تصويتات تتطلب إجراءً · Votes Requiring Action" to="/decisions" empty={votesRequiringAction.length === 0} emptyText="لا توجد تصويتات معلقة">
          {votesRequiringAction.slice(0, 5).map((d) => (
            <AttentionItem
              key={d.id}
              title={d.title}
              subtitle={d.decision_number || "—"}
              badge={<StatusBadge label={DECISION_STATUS.voting.ar} colorClass={DECISION_STATUS.voting.color} />}
              to="/decisions"
            />
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={Gavel} title="قرارات تخصني · Decisions Relevant to Me" to="/decisions" empty={recentMyDecisions.length === 0} emptyText="لا توجد قرارات ذات صلة">
          {recentMyDecisions.map((d) => (
            <AttentionItem
              key={d.id}
              title={d.title}
              subtitle={d.decision_number || "—"}
              badge={<StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />}
              to="/decisions"
            />
          ))}
        </SectionCard>

        <SectionCard icon={CheckSquare} title="مهام مسندة لي · Tasks Assigned to Me" to="/execution" empty={myActions.length === 0} emptyText="لا توجد مهام مسندة">
          {myActions.slice(0, 5).map((a) => (
            <AttentionItem
              key={a.id}
              title={a.title}
              subtitle={`${formatDate(a.deadline)}`}
              badge={<StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />}
              to="/execution"
            />
          ))}
        </SectionCard>
      </div>
    </div>
  );
}