import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, ACTION_STATUS, MEETING_STATUS, formatDate } from "@/lib/raqeemUtils";
import { ShieldCheck, Clock, History, Calendar, CheckCircle2 } from "lucide-react";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import CompletionLedger from "@/components/raqeem/CompletionLedger";
import TraceabilityMatrix from "@/components/raqeem/TraceabilityMatrix";

export default function CommitteeAudit() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("audit");
  const [events, setEvents] = useState([]);
  const [timeMachineDate, setTimeMachineDate] = useState("");
  const [reconstructedState, setReconstructedState] = useState(null);

  useEffect(() => {
    if (!data?.committee?.id) return;
    base44.entities.AuditEvent.filter({ committee_id: data.committee.id })
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [data?.committee?.id]);

  // Change Tracker — reconstruct state at a past date
  useEffect(() => {
    if (!timeMachineDate || !data?.committee?.id) {
      setReconstructedState(null);
      return;
    }
    const targetDate = new Date(timeMachineDate);

    const allDecisions = data.registers.decisions || [];
    const allActions = data.registers.actions || [];
    const allMeetings = [...(data.meetings?.upcoming || []), ...(data.meetings?.previous || [])];

    // Reconstruct: decisions that existed and their likely status at that date
    const decisionsAtTime = allDecisions.filter((d) => {
      const created = new Date(d.created_date);
      return created <= targetDate;
    });

    // Reconstruct: meetings that had occurred by that date
    const meetingsAtTime = allMeetings.filter((m) => {
      if (!m.date) return false;
      return new Date(m.date) <= targetDate;
    });

    // Reconstruct: actions that existed at that date
    const actionsAtTime = allActions.filter((a) => {
      const created = new Date(a.created_date);
      return created <= targetDate;
    });

    setReconstructedState({
      decisions: decisionsAtTime,
      meetings: meetingsAtTime,
      actions: actionsAtTime,
      members: data.members,
    });
  }, [timeMachineDate, data]);

  if (!data) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("التدقيق وإعادة البناء", "Audit & Reconstruction", lang)}</h1>
      </div>

      {/* Change Tracker */}
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("تتبع التغييرات", "Change Tracker")}</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
          {t(
            "اختر تاريخاً لإعادة بناء حالة اللجنة كما كانت في ذلك اليوم — العضوية، الاجتماعات، القرارات، والإجراءات.",
            "Select a date to reconstruct the committee state as it existed on that day — membership, meetings, decisions, and actions."
          )}
        </p>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={timeMachineDate}
            onChange={(e) => setTimeMachineDate(e.target.value)}
            className="px-3 py-1.5 rounded-md border border-input bg-transparent text-sm"
          />
          {timeMachineDate && (
            <button
              onClick={() => { setTimeMachineDate(""); setReconstructedState(null); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t("مسح", "Clear")}
            </button>
          )}
        </div>

        {reconstructedState && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("الحالة المعاد بناؤها حتى", "Reconstructed State as of")} {formatDate(timeMachineDate)}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2 rounded-md bg-secondary/30 text-center">
                <div className="text-lg font-bold text-foreground">{reconstructedState.decisions.length}</div>
                <div className="text-[11px] text-muted-foreground">{t("قرار", "Decisions")}</div>
              </div>
              <div className="p-2 rounded-md bg-secondary/30 text-center">
                <div className="text-lg font-bold text-foreground">{reconstructedState.meetings.length}</div>
                <div className="text-[11px] text-muted-foreground">{t("اجتماع", "Meetings")}</div>
              </div>
              <div className="p-2 rounded-md bg-secondary/30 text-center">
                <div className="text-lg font-bold text-foreground">{reconstructedState.actions.length}</div>
                <div className="text-[11px] text-muted-foreground">{t("إجراء", "Actions")}</div>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              {t(
                "الأعضاء في ذلك التاريخ",
                "Members at that date"
              )}: {reconstructedState.members.map((m) => m.full_name).join("، ")}
            </div>
          </div>
        )}
      </div>

      {/* Completion Ledger */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t("سجل الاكتمال", "Completion Ledger")}
        </h3>
        <CompletionLedger committeeId={data?.committee?.id} />
      </div>

      {/* Traceability Matrix */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          {t("مصفوفة التتبع", "Traceability Matrix")}
        </h3>
        <TraceabilityMatrix />
      </div>

      {/* Audit trail */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {t("سجل الأحداث", "Event Log")}
        </h3>
        {events.length === 0 ? (
          <div className="raqeem-card p-8 text-center">
            <ShieldCheck className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t("لا توجد أحداث تدقيق", "No audit events")}</p>
          </div>
        ) : (
          <div className="raqeem-card divide-y divide-border">
            {events.slice(0, 50).map((e) => (
              <div key={e.id} className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{e.action || e.description}</span>
                  <span className="text-xs text-muted-foreground">{new Date(e.created_date || e.timestamp).toLocaleDateString("ar")}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{e.actor_name || "—"} · {e.entity_type || ""}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}