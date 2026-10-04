import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronRight, Calendar, Clock, Users, Gavel, Play, Pause, Square, Ban, Plus, X, MapPin, Video, Repeat, RefreshCw, Loader2 } from "lucide-react";
import { MEETING_STATUS, DECISION_STATUS, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import AgendaManager from "@/components/raqeem/AgendaManager";
import MinutesManager from "@/components/raqeem/MinutesManager";
import AttendancePanel from "@/components/raqeem/AttendancePanel";
import LiveVotingWidget from "@/components/raqeem/LiveVotingWidget";
import CalendarSyncButton from "@/components/raqeem/CalendarSyncButton";
import OutlookSyncButton from "@/components/raqeem/OutlookSyncButton";
import { useCommittee } from "@/lib/CommitteeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LocalizedDatePicker from "@/components/raqeem/LocalizedDatePicker";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";

const MEETING_MODES = {
  physical: { ar: "حضوري", en: "Physical" },
  online: { ar: "عن بُعد", en: "Online" },
  hybrid: { ar: "مختلط", en: "Hybrid" },
};

const RECURRENCE_TYPES = {
  daily: { ar: "يومي", en: "Daily" },
  weekly: { ar: "أسبوعي", en: "Weekly" },
  monthly: { ar: "شهري", en: "Monthly" },
  quarterly: { ar: "ربع سنوي", en: "Quarterly" },
};

export default function MeetingDetail() {
  const { t } = useLanguage();
  const { id, orgRef, committeeRef } = useParams();
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
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [generatingInstances, setGeneratingInstances] = useState(false);
  const { data: cData } = useCommittee();
  const myRole = cData?.my_role;
  const isOversight = cData?.is_oversight;
  const isRecused = cData?.is_recused;
  const canCertify = !isOversight && !isRecused && ["chair", "vice_chair", "secretary"].includes(myRole);
  const canCallVote = !isOversight && !isRecused && ["chair", "vice_chair"].includes(myRole);
  const canCastVote = !isOversight && !isRecused && ["chair", "vice_chair", "secretary", "member"].includes(myRole);

  async function load() {
    try {
      // A stale or deleted meeting link must not surface as an app error.
      const m = await base44.entities.Meeting.get(id).catch(() => null);
      if (!m) {
        setMeeting(null);
        return;
      }
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
        m.committee_id ? base44.entities.CommitteeMembership.filter({ committee_id: m.committee_id, status: 'active' }).catch(() => []) : Promise.resolve([]),
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
    setStatusUpdating(true);
    try {
      const fnMap = {
        in_progress: "StartMeeting",
        adjourned: "AdjournMeeting",
        cancelled: "CancelMeeting",
      };
      const fn = fnMap[newStatus];
      if (fn) {
        await base44.functions.invoke(fn, { meeting_id: id });
      } else {
        // "completed" — governed direct update (requires meeting.start capability context)
        await base44.entities.Meeting.update(id, { status: newStatus });
      }
      load();
    } catch (e) {
      console.error("Status update failed:", e);
    }
    setStatusUpdating(false);
  };

  const generateMoreInstances = async () => {
    if (!meeting?.is_series_master) return;
    setGeneratingInstances(true);
    try {
      await base44.functions.invoke("GenerateMeetingInstances", { series_master_id: id });
      load();
    } catch (e) {
      console.error("Generate failed:", e);
    }
    setGeneratingInstances(false);
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
        description: L.pair("إنشاء قرار من الاجتماع", "Decision created from the meeting"),
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
    const backTo = orgRef && committeeRef ? `/o/${orgRef}/c/${committeeRef}/meetings` : "/";
    return (
      <div className="raqeem-card p-8 text-center max-w-lg mx-auto my-10">
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {t("الاجتماع غير متوفر", "Meeting not available")}
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {t("قد يكون هذا الاجتماع قد حُذف، أو أن الرابط الذي فتحته قديم.", "This meeting may have been deleted, or the link you opened is out of date.")}
        </p>
        <Link to={backTo} className="text-primary hover:underline text-sm font-medium">
          {t("العودة إلى قائمة الاجتماعات", "Back to the meetings list")}
        </Link>
      </div>
    );
  }

  const status = meeting.status;
  const committeeHome = orgRef && committeeRef ? `/o/${orgRef}/c/${committeeRef}` : "/";
  const inputClass = "w-full px-3 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {committee && <Link to={committeeHome} className="hover:text-foreground">{L.name(committee)}</Link>}
        {committee && <ChevronRight className="w-4 h-4 rotate-180" />}
        <span className="text-foreground truncate">{L.title(meeting)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-foreground">{L.title(meeting)}</h1>
            <StatusBadge {...L.status(MEETING_STATUS, status, status)} size="md" />
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(meeting.date)}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {L.name(meeting, "location") || L.label(MEETING_MODES, meeting.mode, "—")}</span>
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {t("النصاب", "Quorum")}: {meeting.quorum_required}</span>
            {meeting.provider && meeting.provider !== "none" && (
              <span className="flex items-center gap-1.5"><Video className="w-3.5 h-3.5" /> {meeting.provider}</span>
            )}
            {meeting.is_series_master && (
              <span className="flex items-center gap-1.5 text-accent font-medium">
                <Repeat className="w-3.5 h-3.5" /> {t("سلسلة متكررة", "Recurring series")} — {L.label(RECURRENCE_TYPES, meeting.recurrence_type, meeting.recurrence_type)}
              </span>
            )}
            {meeting.series_id && !meeting.is_series_master && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Repeat className="w-3.5 h-3.5" /> {t(`نسخة #${meeting.series_instance_number} من السلسلة`, `Series instance #${meeting.series_instance_number}`)}
              </span>
            )}
          </div>
        </div>

        {/* Meeting status controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarSyncButton meetingId={id} />
          <OutlookSyncButton meetingId={id} />
          {meeting.is_series_master && (
            <Button size="sm" variant="outline" onClick={generateMoreInstances} disabled={generatingInstances}>
              {generatingInstances ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {t("إنشاء نسخ إضافية", "Generate more instances")}
            </Button>
          )}
          {status === "scheduled" && (
            <Button size="sm" onClick={() => updateMeetingStatus("in_progress")} disabled={statusUpdating}>
              {statusUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} {t("بدء الاجتماع", "Start Meeting")}
            </Button>
          )}
          {status === "in_progress" && (
            <>
              <Button size="sm" variant="secondary" onClick={() => updateMeetingStatus("adjourned")} disabled={statusUpdating}>
                {statusUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />} {t("تأجيل", "Adjourn")}
              </Button>
              <Button size="sm" onClick={() => updateMeetingStatus("completed")} disabled={statusUpdating}>
                {statusUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />} {t("إنهاء", "Complete")}
              </Button>
            </>
          )}
          {status === "adjourned" && (
            <Button size="sm" onClick={() => updateMeetingStatus("in_progress")} disabled={statusUpdating}>
              {statusUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} {t("استئناف", "Resume")}
            </Button>
          )}
          {(status === "scheduled" || status === "in_progress" || status === "adjourned") && (
            <Button size="sm" variant="destructive" onClick={() => updateMeetingStatus("cancelled")} disabled={statusUpdating}>
              {statusUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} {t("إلغاء", "Cancel")}
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
            <Clock className="w-4 h-4 text-primary" /> {t("جدول الأعمال", "Agenda")}
          </h2>
          <AgendaManager meetingId={id} items={agendaItems} onChanged={load} />
        </div>

        {/* Decisions */}
        <div className="raqeem-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Gavel className="w-4 h-4 text-primary" /> {t("القرارات", "Decisions")}
            </h2>
            {!showDecisionForm && (
              <button onClick={() => setShowDecisionForm(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3.5 h-3.5" /> {t("قرار جديد", "New decision")}
              </button>
            )}
          </div>

          {showDecisionForm && (
            <div className="border border-border rounded-md p-4 space-y-3 relative mb-4">
              <button onClick={() => setShowDecisionForm(false)} className="absolute top-3 left-3 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
              <div>
                <Label className="text-xs">{t("عنوان القرار *", "Decision title *")}</Label>
                <Input value={decisionForm.title} onChange={(e) => setDecisionForm((f) => ({ ...f, title: e.target.value }))} placeholder={t("عنوان القرار", "Decision title")} />
              </div>
              <div>
                <Label className="text-xs">{t("المقترح / المسودة", "Proposal / draft")}</Label>
                <textarea value={decisionForm.proposal} onChange={(e) => setDecisionForm((f) => ({ ...f, proposal: e.target.value }))} rows={3} className={inputClass} placeholder={t("نص مقترح القرار", "Proposed decision text")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">{t("الأساس القانوني", "Legal basis")}</Label>
                  <Input value={decisionForm.legal_basis} onChange={(e) => setDecisionForm((f) => ({ ...f, legal_basis: e.target.value }))} placeholder={t("المرجع القانوني", "Legal reference")} />
                </div>
                <div>
                  <Label className="text-xs">{t("مسؤول التنفيذ", "Execution owner")}</Label>
                  <Input value={decisionForm.owner_name} onChange={(e) => setDecisionForm((f) => ({ ...f, owner_name: e.target.value }))} placeholder={t("اسم المسؤول", "Owner name")} />
                </div>
              </div>
              <div>
                <Label className="text-xs">{t("موعد التنفيذ", "Execution deadline")}</Label>
                <LocalizedDatePicker value={decisionForm.deadline} onChange={(v) => setDecisionForm((f) => ({ ...f, deadline: v }))} />
              </div>
              <Button size="sm" onClick={createDecision} disabled={savingDecision || !decisionForm.title.trim()}>
                {savingDecision ? t("جارٍ الحفظ...", "Saving...") : t("إنشاء القرار", "Create decision")}
              </Button>
            </div>
          )}

          {decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد قرارات بعد", "No decisions yet")}</p>
          ) : (
            <div className="space-y-2">
              {decisions.map((d) => (
                <div key={d.id} className="border border-border rounded-md p-3">
                  <Link to={`/decisions/${d.id}`} className="flex items-center justify-between hover:bg-secondary/30 -mx-1 px-1 rounded">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{L.title(d)}</div>
                      {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                    </div>
                    <StatusBadge {...L.status(DECISION_STATUS, d.status, d.status)} />
                  </Link>
                  <LiveVotingWidget decision={d} canCallVote={canCallVote} canCastVote={canCastVote} onVoted={load} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live Attendance & Quorum */}
      <AttendancePanel meeting={meeting} members={members} attendance={attendance} canCertify={canCertify} onChanged={load} />

      {/* Minutes */}
      <MinutesManager meeting={meeting} committee={committee} members={members} attendance={attendance} minutes={minutes} onChanged={load} />
    </div>
  );
}