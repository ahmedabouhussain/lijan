import React, { useState } from "react";
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
import { useCommitteeSafe } from "@/lib/CommitteeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LocalizedDatePicker from "@/components/raqeem/LocalizedDatePicker";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";
import useCommitteeRecord from "@/hooks/useCommitteeRecord";
import ExplorationNotice from "@/components/raqeem/ExplorationNotice";
import RegisterStatePanel from "@/components/raqeem/RegisterStatePanel";
import MeetingInsightsPanel from "@/components/raqeem/MeetingInsightsPanel";
import { SURFACE_STATE } from "@/lib/governedState";

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
  const [actionError, setActionError] = useState("");

  // ONE governed read: the meeting, its committee, agenda, attendance, minutes, members and the
  // authority of this very seat all arrive together — from the same scope as the register that
  // listed the meeting. A meeting that can be listed can therefore always be opened.
  const { bundle, state, reload: load } = useCommitteeRecord("Meeting", id);
  const meeting = bundle?.record || null;
  const committee = bundle?.committee || null;
  const agendaItems = bundle?.agenda || [];
  const decisions = bundle?.decisions || [];
  const attendance = bundle?.attendance || [];
  const minutes = (bundle?.minutes || [])[0] || null;
  const members = bundle?.members || [];
  const isExploration = bundle?.is_demo_mode === true;
  const authority = bundle?.authority || [];
  // A control appears only when this seat's own authority permits the action — never merely
  // because the record exists. Exploration executes nothing.
  // Each control is gated by ITS OWN capability, never by a neighbouring one: a seat that may cancel
  // a meeting is not thereby given the right to start one, and vice versa. A step with no governed
  // command (or no permitted transition) is not offered as a browser write.
  const canStartMeeting = !isExploration && authority.includes("meeting.start");
  const canAdjournMeeting = !isExploration && authority.includes("meeting.adjourn");
  const canCancelMeeting = !isExploration && authority.includes("meeting.cancel");
  const canScheduleMeeting = !isExploration && authority.includes("meeting.schedule");
  // A decision draft is created by the governed command CreateDecisionDraft, which requires
  // `decision.propose` (D-033). The control is therefore gated by THAT capability: the earlier gate
  // on `agenda.propose` belonged to agenda preparation and blocked the chair's own right to propose
  // a decision — the mismatch that the browser-side write used to bridge (D-021, D-042).
  const canDraftDecision = !isExploration && authority.includes("decision.propose");
  const decisionActionLabel = t("مشروع قرار جديد", "New decision draft");

  // This page is mounted on two routes: inside the committee workspace (provider present) and on the
  // legacy flat route /meetings/:id (no provider). The role therefore comes from the committee
  // context when it exists, and otherwise from the governed read's own answer — the page renders on
  // both routes instead of crashing outside the provider.
  const cData = useCommitteeSafe();
  const myRole = cData?.my_role || bundle?.my_role || null;
  const isOversight = cData?.is_oversight === true;
  const isRecused = cData?.is_recused === true;
  const canCertify = !isExploration && !isOversight && !isRecused && ["chair", "vice_chair", "secretary"].includes(myRole);
  const canCallVote = !isExploration && !isOversight && !isRecused && ["chair", "vice_chair"].includes(myRole);
  const canCastVote = !isExploration && !isOversight && !isRecused && ["chair", "vice_chair", "secretary", "member"].includes(myRole);

  const updateMeetingStatus = async (newStatus) => {
    setStatusUpdating(true);
    setActionError("");
    try {
      const fnMap = {
        in_progress: "StartMeeting",
        adjourned: "AdjournMeeting",
        cancelled: "CancelMeeting",
      };
      const fn = fnMap[newStatus];
      // A step with no governed command is refused HERE, in words: meeting state is never written
      // from the browser, and nothing about this surface pretends otherwise.
      if (!fn) {
        setActionError(t("لا يوجد أمر خادمي محكوم لهذه الخطوة، ولا تُكتب حالة الاجتماع من المتصفح.", "There is no governed server command for this step, and meeting state is never written from the browser."));
        setStatusUpdating(false);
        return;
      }
      const res = await base44.functions.invoke(fn, { meeting_id: id });
      if (res?.data?.error) {
        setActionError(res.data.error);
        setStatusUpdating(false);
        return;
      }
      load();
    } catch (e) {
      // A refusal is reported as it is — never as a silent success.
      setActionError(e?.response?.data?.error || t("تعذّر تنفيذ الأمر على هذا الاجتماع.", "The action could not be executed on this meeting."));
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
      // A refusal is reported as it is — and a failed generation says so instead of only logging.
      setActionError(e?.response?.data?.error || t("تعذّر إنشاء النسخ الإضافية من السلسلة.", "Additional series instances could not be generated."));
    }
    setGeneratingInstances(false);
  };

  const createDecision = async () => {
    if (!decisionForm.title.trim()) return;
    setSavingDecision(true);
    setActionError("");
    try {
      // ONE path, governed: a draft decision is created by CreateDecisionDraft. The former
      // browser-side Decision.create fallback — which let a seat write a decision record and its own
      // audit line straight from the client — is removed (D-021).
      const res = await base44.functions.invoke("CreateDecisionDraft", {
        committee_id: meeting.committee_id,
        meeting_id: id,
        title: decisionForm.title,
        proposal: decisionForm.proposal,
        legal_basis: decisionForm.legal_basis,
        owner_name: decisionForm.owner_name,
        deadline: decisionForm.deadline,
      });
      if (res?.data?.error) {
        setActionError(res.data.error);
        setSavingDecision(false);
        return;
      }
      setDecisionForm({ title: "", proposal: "", legal_basis: "", owner_name: "", deadline: "" });
      setShowDecisionForm(false);
      load();
    } catch (e) {
      // Nothing is recorded on failure, and the surface says so.
      setActionError(e?.response?.data?.error || t("تعذّر حفظ مشروع القرار، ولم يُسجَّل أي أثر.", "The decision draft could not be saved and nothing was recorded."));
    }
    setSavingDecision(false);
  };

  // Nothing to show is the SHARED state of the governed read — a refusal, a scope miss, a lapsed
  // exploration session and a technical failure each say their own thing, and none of them is ever
  // reported as a missing meeting. Only a successful read that returned no record may read as such.
  if (!meeting) {
    const backTo = orgRef && committeeRef ? `/o/${orgRef}/c/${committeeRef}/meetings` : "/";
    return (
      <div className="max-w-lg mx-auto my-10 space-y-3">
        <RegisterStatePanel state={state || SURFACE_STATE.NOT_FOUND} onRetry={load} icon={Calendar} />
        <Link to={backTo} className="block text-center text-primary hover:underline text-sm font-medium">
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
            <h1 className="ui-title text-foreground">{L.title(meeting)}</h1>
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

        {/* Meeting status controls — each one only for a seat whose authority covers it */}
        <div className="flex items-center gap-2 flex-wrap">
          {canScheduleMeeting && <CalendarSyncButton meetingId={id} />}
          {canScheduleMeeting && <OutlookSyncButton meetingId={id} />}
          {canScheduleMeeting && meeting.is_series_master && (
            <Button size="sm" variant="outline" onClick={generateMoreInstances} disabled={generatingInstances}>
              {generatingInstances ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              {t("إنشاء نسخ إضافية", "Generate more instances")}
            </Button>
          )}
          {canStartMeeting && status === "scheduled" && (
            <Button size="sm" onClick={() => updateMeetingStatus("in_progress")} disabled={statusUpdating}>
              {statusUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} {t("بدء الاجتماع", "Start Meeting")}
            </Button>
          )}
          {canAdjournMeeting && status === "in_progress" && (
            <Button size="sm" variant="secondary" onClick={() => updateMeetingStatus("adjourned")} disabled={statusUpdating}>
              {statusUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pause className="w-3.5 h-3.5" />} {t("تأجيل", "Adjourn")}
            </Button>
          )}
          {status === "in_progress" && (
            <Button size="sm" disabled title={t("لا يوجد أمر خادمي محكوم لإنهاء الاجتماع بعد، ولا تُكتب حالته من المتصفح.", "No governed server command completes a meeting yet, and its state is never written from the browser.")}>
              <Square className="w-3.5 h-3.5" /> {t("إنهاء", "Complete")}
            </Button>
          )}
          {status === "adjourned" && (
            <Button size="sm" disabled title={t("بوابة الحالة تسمح ببدء اجتماع في حالة «مجدول» فقط؛ لا استئناف لاجتماع مؤجّل، ولا تُكتب حالته من المتصفح.", "The state gate starts a meeting only while it is 'scheduled'; an adjourned meeting cannot be resumed, and its state is never written from the browser.")}>
              <Play className="w-3.5 h-3.5" /> {t("استئناف", "Resume")}
            </Button>
          )}
          {canCancelMeeting && (status === "scheduled" || status === "in_progress") && (
            <Button size="sm" variant="destructive" onClick={() => updateMeetingStatus("cancelled")} disabled={statusUpdating}>
              {statusUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} {t("إلغاء", "Cancel")}
            </Button>
          )}
        </div>
      </div>

      {["in_progress", "adjourned"].includes(status) && (
        <p className="text-xs text-muted-foreground">
          {t(
            "الخطوات المعطّلة معلنة بصورتها: إنهاء الاجتماع بلا أمر محكوم · استئناف اجتماع مؤجّل خارج ما تسمح به بوابة الحالة · وفي الحالتين لا تُكتب حالة الاجتماع من المتصفح.",
            "Unavailable steps are declared as they are: completing a meeting has no governed command · resuming an adjourned one is outside what the state gate permits · in neither case is meeting state written from the browser.",
          )}
        </p>
      )}

      {isExploration && <ExplorationNotice />}

      {actionError && (
        <div className="raqeem-card p-3 border-destructive/30 bg-state-danger-surface">
          <p className="text-xs text-state-danger-ink">{actionError}</p>
        </div>
      )}

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
          <AgendaManager meetingId={id} committeeId={meeting.committee_id} items={agendaItems} onChanged={load} />
        </div>

        {/* Decisions */}
        <div className="raqeem-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Gavel className="w-4 h-4 text-primary" /> {t("القرارات", "Decisions")}
            </h2>
            {canDraftDecision && !showDecisionForm && (
              <button onClick={() => setShowDecisionForm(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3.5 h-3.5" /> {decisionActionLabel}
              </button>
            )}
            {!canDraftDecision && !isExploration && (
              <span className="text-xs text-muted-foreground text-right max-w-[18rem]">
                {t(
                  "إنشاء مشروع قرار متاح لمن يحمل قدرة «decision.propose» في هذا المقعد؛ ولا يُنشأ قرار من المتصفح.",
                  "Creating a decision draft requires the 'decision.propose' capability in this seat; a decision is never created from the browser.",
                )}
              </span>
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

      {/* Smart prep & pack summary — advisory only, AI-generated, labelled, logged. */}
      <MeetingInsightsPanel meetingId={id} />

      {/* Live Attendance & Quorum */}
      <AttendancePanel meeting={meeting} members={members} attendance={attendance} canCertify={canCertify} onChanged={load} />

      {/* Minutes */}
      <MinutesManager meeting={meeting} committee={committee} members={members} attendance={attendance} minutes={minutes} onChanged={load} />
    </div>
  );
}