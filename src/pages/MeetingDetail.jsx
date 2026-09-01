import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronRight, Calendar, Clock, Users, Gavel, Play, Pause, Square, Ban, Plus, X, MapPin, Video } from "lucide-react";
import { MEETING_STATUS, DECISION_STATUS, CLASSIFICATION, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import AgendaManager from "@/components/raqeem/AgendaManager";
import MinutesManager from "@/components/raqeem/MinutesManager";
import MeetingCopilot from "@/components/raqeem/MeetingCopilot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MEETING_MODES = {
  physical: "حضوري",
  online: "عن بُعد",
  hybrid: "مختلط",
};

export default function MeetingDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState(null);
  const [committee, setCommittee] = useState(null);
  const [agendaItems, setAgendaItems] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [members, setMembers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [minutes, setMinutes] = useState(null);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);
  const [decisionForm, setDecisionForm] = useState({
    title: "",
    proposal: "",
    legal_basis: "",
    owner_name: "",
    deadline: "",
  });

  async function load() {
    try {
      const m = await base44.entities.Meeting.get(id);
      setMeeting(m);
      if (m.committee_id) {
        const c = await base44.entities.Committee.get(m.committee_id).catch(() => null);
        setCommittee(c);
      }
      const [agenda, decs, att, mins, mems] = await Promise.all([
        base44.entities.AgendaItem.filter({ meeting_id: id }).catch(() => []),
        base44.entities.Decision.filter({ meeting_id: id }).catch(() => []),
        base44.entities.Attendance.filter({ meeting_id: id }).catch(() => []),
        base44.entities.MeetingMinutes.filter({ meeting_id: id }).catch(() => []),
        m.committee_id ? base44.entities.CommitteeMember.filter({ committee_id: m.committee_id }).catch(() => []) : Promise.resolve([]),
      ]);
      setAgendaItems(agenda || []);
      setDecisions(decs || []);
      setAttendance(att || []);
      setMinutes(mins && mins.length > 0 ? mins[0] : null);
      setMembers(mems || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const updateMeetingStatus = async (newStatus) => {
    try {
      await base44.entities.Meeting.update(id, { status: newStatus });
      await base44.entities.AuditLog.create({
        action: "status_change",
        entity_type: "Meeting",
        entity_id: id,
        entity_title: meeting.title,
        description: `تغيير حالة الاجتماع إلى ${MEETING_STATUS[newStatus]?.ar}`,
      });
      load();
    } catch {}
  };

  const createDecision = async () => {
    if (!decisionForm.title.trim()) return;
    setSavingDecision(true);
    try {
      const dec = await base44.entities.Decision.create({
        ...decisionForm,
        committee_id: meeting.committee_id,
        meeting_id: id,
        status: "draft",
      });
      await base44.entities.AuditLog.create({
        action: "create",
        entity_type: "Decision",
        entity_id: dec.id,
        entity_title: decisionForm.title,
        description: "إنشاء قرار من الاجتماع",
      });
      setDecisionForm({ title: "", proposal: "", legal_basis: "", owner_name: "", deadline: "" });
      setShowDecisionForm(false);
      load();
    } catch {}
    setSavingDecision(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">الاجتماع غير موجود</p>
        <Link to="/calendar" className="text-primary hover:underline mt-2 inline-block">العودة للتقويم</Link>
      </div>
    );
  }

  const status = meeting.status;
  const inputClass = "w-full px-3 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {committee && <Link to={`/committees/${committee.id}`} className="hover:text-foreground">{committee.name_ar}</Link>}
        {committee && <ChevronRight className="w-4 h-4 rotate-180" />}
        <span className="text-foreground truncate">{meeting.title || meeting.title_ar}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{meeting.title || meeting.title_ar}</h1>
            <StatusBadge label={MEETING_STATUS[status]?.ar || status} colorClass={MEETING_STATUS[status]?.color} size="md" />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(meeting.date)}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {meeting.location || MEETING_MODES[meeting.mode] || "—"}</span>
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> النصاب: {meeting.quorum_required}</span>
            {meeting.provider && meeting.provider !== "none" && (
              <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> {meeting.provider}</span>
            )}
          </div>
        </div>

        {/* Meeting status controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <MeetingCopilot meetingId={id} committeeId={meeting.committee_id} />
          {status === "scheduled" && (
            <Button size="sm" onClick={() => updateMeetingStatus("in_progress")}>
              <Play className="w-3.5 h-3.5" /> بدء الاجتماع
            </Button>
          )}
          {status === "in_progress" && (
            <>
              <Button size="sm" variant="secondary" onClick={() => updateMeetingStatus("adjourned")}>
                <Pause className="w-3.5 h-3.5" /> تأجيل
              </Button>
              <Button size="sm" onClick={() => updateMeetingStatus("completed")}>
                <Square className="w-3.5 h-3.5" /> إنهاء
              </Button>
            </>
          )}
          {status === "adjourned" && (
            <Button size="sm" onClick={() => updateMeetingStatus("in_progress")}>
              <Play className="w-3.5 h-3.5" /> استئناف
            </Button>
          )}
          {(status === "scheduled" || status === "in_progress" || status === "adjourned") && (
            <Button size="sm" variant="destructive" onClick={() => updateMeetingStatus("cancelled")}>
              <Ban className="w-3.5 h-3.5" /> إلغاء
            </Button>
          )}
        </div>
      </div>

      {/* Meeting URL */}
      {meeting.meeting_url && (
        <a href={meeting.meeting_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <Video className="w-4 h-4" /> {meeting.meeting_url}
        </a>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agenda */}
        <div className="raqeem-card p-5">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> جدول الأعمال · Agenda
          </h2>
          <AgendaManager meetingId={id} items={agendaItems} onChanged={load} />
        </div>

        {/* Decisions */}
        <div className="raqeem-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Gavel className="w-4 h-4 text-primary" /> القرارات · Decisions
            </h2>
            {!showDecisionForm && (
              <button onClick={() => setShowDecisionForm(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3.5 h-3.5" /> قرار جديد
              </button>
            )}
          </div>

          {showDecisionForm && (
            <div className="border border-border rounded-md p-4 space-y-3 relative mb-4">
              <button onClick={() => setShowDecisionForm(false)} className="absolute top-3 left-3 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
              <div>
                <Label className="text-xs">عنوان القرار *</Label>
                <Input value={decisionForm.title} onChange={(e) => setDecisionForm((f) => ({ ...f, title: e.target.value }))} placeholder="عنوان القرار" />
              </div>
              <div>
                <Label className="text-xs">المقترح / المسودة</Label>
                <textarea value={decisionForm.proposal} onChange={(e) => setDecisionForm((f) => ({ ...f, proposal: e.target.value }))} rows={3} className={inputClass} placeholder="نص مقترح القرار" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">الأساس القانوني</Label>
                  <Input value={decisionForm.legal_basis} onChange={(e) => setDecisionForm((f) => ({ ...f, legal_basis: e.target.value }))} placeholder="المرجع القانوني" />
                </div>
                <div>
                  <Label className="text-xs">مسؤول التنفيذ</Label>
                  <Input value={decisionForm.owner_name} onChange={(e) => setDecisionForm((f) => ({ ...f, owner_name: e.target.value }))} placeholder="اسم المسؤول" />
                </div>
              </div>
              <div>
                <Label className="text-xs">موعد التنفيذ</Label>
                <Input type="date" value={decisionForm.deadline} onChange={(e) => setDecisionForm((f) => ({ ...f, deadline: e.target.value }))} />
              </div>
              <Button size="sm" onClick={createDecision} disabled={savingDecision || !decisionForm.title.trim()}>
                {savingDecision ? "جارٍ الحفظ..." : "إنشاء القرار"}
              </Button>
            </div>
          )}

          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد قرارات بعد</p>
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
      </div>

      {/* Minutes & Attendance */}
      <MinutesManager meeting={meeting} committee={committee} members={members} attendance={attendance} minutes={minutes} onChanged={load} />
    </div>
  );
}