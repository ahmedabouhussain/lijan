import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Gavel,
  TrendingUp,
  Calendar,
  Users,
  BarChart3,
} from "lucide-react";
import { SectionCard, StatCard, AttentionItem } from "./shared";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, MEETING_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";

export default function ExecutiveHome({ data }) {
  const { committees, members, meetings, decisions, actions } = data;

  const activeCommittees = committees.filter((c) => c.status === "active");
  const draftCommittees = committees.filter((c) => ["draft", "pending_activation"].includes(c.status));
  const closingCommittees = committees.filter((c) => c.status === "closing");
  const governanceRate = committees.length > 0
    ? Math.round((committees.filter((c) => c.governance_complete).length / committees.length) * 100)
    : 0;

  const execDecisions = decisions.filter((d) => ["issued", "executing"].includes(d.status));
  const criticalOverdue = actions.filter((a) => isOverdue(a.deadline) && ["critical", "high"].includes(a.priority));
  const highRisks = actions.filter((a) => a.status === "blocked" || (a.escalation_level && a.escalation_level !== "none"));

  const now = new Date();
  const upcomingMeetings = meetings
    .filter((m) => new Date(m.date) >= now && m.status === "scheduled")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const quorumExceptions = committees.filter((c) => {
    if (c.status !== "active") return false;
    const activeMembers = members.filter((m) => m.committee_id === c.id && m.status === "active");
    return !c.chair_name || activeMembers.length < (c.quorum_count || 3);
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="لجان نشطة" value={activeCommittees.length} accent="text-primary" />
        <StatCard icon={Gavel} label="قرارات تنفيذية" value={execDecisions.length} accent="text-amber-600" />
        <StatCard icon={AlertTriangle} label="إجراءات حرجة متأخرة" value={criticalOverdue.length} accent="text-destructive" />
        <StatCard icon={TrendingUp} label="مخاطر عالية" value={highRisks.length} accent="text-red-600" />
      </div>

      {/* Evidence-backed executive briefing */}
      <div className="raqeem-card p-5 border-r-4 border-r-primary">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">الإحصارة التنفيذية · Executive Briefing</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          توجد {activeCommittees.length} لجنة نشطة من أصل {committees.length}، بمعدل استكمال حوكمة {governanceRate}%.
          {execDecisions.length > 0 && ` ${execDecisions.length} قرار بانتظار المتابعة التنفيذية.`}
          {criticalOverdue.length > 0 && ` ${criticalOverdue.length} إجراء حرج متأخر يتطلب تدخلاً.`}
          {highRisks.length > 0 && ` ${highRisks.length} مخاطرة عالية مسجلة.`}
          {quorumExceptions.length > 0 && ` ${quorumExceptions.length} استثناء نصاب/صلاحية غير محلول.`}
          {execDecisions.length === 0 && criticalOverdue.length === 0 && highRisks.length === 0 && quorumExceptions.length === 0 && " لا توجد أمور عاجلة تتطلب تدخلاً تنفيذياً."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={ShieldCheck} title="صحة اللجان · Council Health" empty={committees.length === 0} emptyText="لا توجد لجان">
          <div className="space-y-1">
            <HealthRow label="نشطة" count={activeCommittees.length} color="text-emerald-700" />
            <HealthRow label="مسودة / بانتظار التفعيل" count={draftCommittees.length} color="text-amber-700" />
            <HealthRow label="قيد الإغلاق" count={closingCommittees.length} color="text-amber-700" />
            <HealthRow label="استكمال الحوكمة" count={`${governanceRate}%`} color="text-primary" />
          </div>
        </SectionCard>

        <SectionCard icon={AlertTriangle} title="استثناءات النصاب والصلاحية · Quorum Exceptions" empty={quorumExceptions.length === 0} emptyText="لا توجد استثناءات">
          {quorumExceptions.slice(0, 5).map((c) => (
            <AttentionItem
              key={c.id}
              title={c.name_ar || c.name_en}
              subtitle={!c.chair_name ? "بدون رئيس معيّن" : "نصاب غير مكتمل"}
              badge={<StatusBadge label="استثناء" colorClass="text-destructive bg-red-50" />}
              to={`/committees/${c.id}`}
            />
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={Gavel} title="قرارات تنفيذية · Executive Actions" to="/decisions" empty={execDecisions.length === 0} emptyText="لا توجد قرارات تنفيذية">
          {execDecisions.slice(0, 5).map((d) => (
            <AttentionItem
              key={d.id}
              title={d.title}
              subtitle={d.decision_number || "—"}
              badge={<StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />}
              to="/decisions"
            />
          ))}
        </SectionCard>

        <SectionCard icon={AlertTriangle} title="إجراءات حرجة متأخرة · Critical Overdue" to="/execution" empty={criticalOverdue.length === 0} emptyText="لا توجد إجراءات حرجة متأخرة">
          {criticalOverdue.slice(0, 5).map((a) => (
            <AttentionItem
              key={a.id}
              title={a.title}
              subtitle={`${a.owner_name || "—"} · ${formatDate(a.deadline)}`}
              badge={<StatusBadge label="حرج" colorClass="text-destructive bg-red-50" />}
              to="/execution"
            />
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={TrendingUp} title="مخاطر عالية · High Risks" to="/execution" empty={highRisks.length === 0} emptyText="لا توجد مخاطر مسجلة">
          {highRisks.slice(0, 5).map((a) => (
            <AttentionItem
              key={a.id}
              title={a.title}
              subtitle={a.blocker || `تصعيد: ${a.escalation_level}`}
              badge={<StatusBadge label={a.status === "blocked" ? "متعثر" : "تصعيد"} colorClass="text-destructive bg-red-50" />}
              to="/execution"
            />
          ))}
        </SectionCard>

        <SectionCard icon={Calendar} title="اجتماعات مهمة قادمة · Upcoming Meetings" to="/calendar" empty={upcomingMeetings.length === 0} emptyText="لا توجد اجتماعات قادمة">
          {upcomingMeetings.map((m) => (
            <AttentionItem
              key={m.id}
              title={m.title || m.title_ar}
              subtitle={`${formatDate(m.date)} · ${m.mode}`}
              badge={<StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />}
              to="/calendar"
            />
          ))}
        </SectionCard>
      </div>
    </div>
  );
}

function HealthRow({ label, count, color }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{count}</span>
    </div>
  );
}