import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ChevronRight,
  Users,
  Calendar,
  Gavel,
  CheckSquare,
  FileText,
  Building2,
  Clock,
  Vote,
  ShieldCheck,
  Play,
} from "lucide-react";
import { COMMITTEE_TYPES, COMMITTEE_STATUS, MEMBER_ROLE, MEETING_STATUS, DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import MemberManager from "@/components/raqeem/MemberManager";
import MeetingScheduler from "@/components/raqeem/MeetingScheduler";
import SecretaryPanel from "@/components/raqeem/SecretaryPanel";

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground mt-0.5">{value || "—"}</div>
      </div>
    </div>
  );
}

export default function CommitteeDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [committee, setCommittee] = useState(null);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [actions, setActions] = useState([]);
  const [minutes, setMinutes] = useState([]);
  const [activating, setActivating] = useState(false);

  async function load() {
    try {
      const [c, m, meets, decs, acts, mins] = await Promise.all([
        base44.entities.Committee.get(id),
        base44.entities.CommitteeMember.filter({ committee_id: id }).catch(() => []),
        base44.entities.Meeting.filter({ committee_id: id }).catch(() => []),
        base44.entities.Decision.filter({ committee_id: id }).catch(() => []),
        base44.entities.Action.filter({ committee_id: id }).catch(() => []),
        base44.entities.MeetingMinutes.filter({ committee_id: id }).catch(() => []),
      ]);
      setCommittee(c);
      setMembers(m || []);
      setMeetings(meets || []);
      setDecisions(decs || []);
      setActions(acts || []);
      setMinutes(mins || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const activateCommittee = async () => {
    setActivating(true);
    try {
      await base44.entities.Committee.update(id, { status: "active", governance_complete: true });
      await base44.entities.AuditLog.create({
        action: "activate",
        entity_type: "Committee",
        entity_id: id,
        entity_title: committee.name_ar || committee.name_en,
        description: "تفعيل اللجنة بعد استكمال متطلبات الحوكمة",
      });
      load();
    } catch {
    }
    setActivating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!committee) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">اللجنة غير موجودة</p>
        <Link to="/committees" className="text-primary hover:underline mt-2 inline-block">العودة للجان</Link>
      </div>
    );
  }

  const governanceReady = members.length >= (committee.quorum_count || 3) && committee.mandate && committee.chair_name;
  const overdueActions = actions.filter((a) => isOverdue(a.deadline));

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/committees" className="hover:text-foreground">اللجان</Link>
        <ChevronRight className="w-4 h-4 rotate-180" />
        <span className="text-foreground truncate">{committee.name_ar || committee.name_en}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{committee.name_ar || committee.name_en}</h1>
            <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} />
          </div>
          <p className="text-sm text-muted-foreground">{committee.name_en}</p>
          <p className="text-xs text-muted-foreground mt-1">{COMMITTEE_TYPES[committee.type]?.ar} — {COMMITTEE_TYPES[committee.type]?.en}</p>
        </div>
      </div>

      {/* Mandate-to-Impact chain indicator */}
      {!committee.governance_complete && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 flex items-center justify-between gap-2 text-sm text-amber-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>هذه اللجنة في حالة مسودة — استكمل متطلبات الحوكمة للتفعيل</span>
          </div>
          {governanceReady && (
            <button
              onClick={activateCommittee}
              disabled={activating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-dark shrink-0"
            >
              <Play className="w-3.5 h-3.5" /> {activating ? "جارٍ التفعيل..." : "تفعيل اللجنة"}
            </button>
          )}
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Committee info */}
        <div className="space-y-6">
          <div className="raqeem-card p-5">
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> معلومات اللجنة
            </h2>
            <InfoRow icon={Building2} label="الجهة المؤسِّسة" value={committee.establishing_authority} />
            <InfoRow icon={Clock} label="المدة" value={`${formatDate(committee.term_start)} — ${formatDate(committee.term_end)}`} />
            <InfoRow icon={Users} label="الرئيس" value={committee.chair_name} />
            <InfoRow icon={FileText} label="الأمين" value={committee.secretary_name} />
            <InfoRow icon={Vote} label="النصاب" value={`${committee.quorum_count} أعضاء`} />
            <InfoRow icon={Vote} label="قاعدة التصويت" value={committee.voting_rule} />
            <InfoRow icon={Calendar} label="دورية الاجتماعات" value={committee.meeting_cadence} />
          </div>

          <div className="raqeem-card p-5">
            <h2 className="text-sm font-semibold mb-3">الصلاحية · Mandate</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{committee.mandate || "—"}</p>
          </div>

          <div className="raqeem-card p-5">
            <h2 className="text-sm font-semibold mb-3">النطاق · Scope</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{committee.scope || "—"}</p>
          </div>
        </div>

        {/* Right: Tabs content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Secretary Board */}
          <SecretaryPanel committeeId={id} meetings={meetings} decisions={decisions} actions={actions} minutes={minutes} />

          {/* Members */}
          <div className="raqeem-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> الأعضاء · Members
              </h2>
            </div>
            <MemberManager committeeId={id} members={members} onChanged={load} />
          </div>

          {/* Meetings */}
          <div className="raqeem-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" /> الاجتماعات · Meetings
              </h2>
              <MeetingScheduler committeeId={id} onCreated={load} />
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد اجتماعات مجدولة</p>
            ) : (
              <div className="space-y-2">
                {meetings.map((m) => (
                  <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{m.title || m.title_ar}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.mode}</div>
                    </div>
                    <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Decisions */}
          <div className="raqeem-card p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-primary" /> القرارات · Decisions
            </h2>
            {decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد قرارات</p>
            ) : (
              <div className="space-y-2">
                {decisions.map((d) => (
                  <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                      {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                    </div>
                    <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="raqeem-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" /> الإجراءات · Actions
              </h2>
              {overdueActions.length > 0 && (
                <StatusBadge label={`${overdueActions.length} متأخر`} colorClass={ACTION_STATUS.overdue.color} />
              )}
            </div>
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد إجراءات</p>
            ) : (
              <div className="space-y-2">
                {actions.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                      <div className="text-xs text-muted-foreground">{a.owner_name} · {formatDate(a.deadline)}</div>
                    </div>
                    <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}