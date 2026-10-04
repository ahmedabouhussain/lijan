import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import useCommitteeRegister from "@/hooks/useCommitteeRegister";
import { auditActionLabel } from "@/lib/auditLabels";
import { formatDate } from "@/lib/raqeemUtils";
import { ShieldCheck, Clock, History, Calendar, CheckCircle2 } from "lucide-react";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import CompletionLedger from "@/components/raqeem/CompletionLedger";
import TraceabilityMatrix from "@/components/raqeem/TraceabilityMatrix";
import RegisterStatePanel from "@/components/raqeem/RegisterStatePanel";
import { SURFACE_STATE } from "@/lib/governedState";

export default function CommitteeAudit() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("audit");
  const [timeMachineDate, setTimeMachineDate] = useState("");
  const [reconstructedState, setReconstructedState] = useState(null);

  // The event log is a committee register, read on the server in the same scope as every other
  // record. It names actors, so it is a member-rank register: when the seat does not hold that
  // rank the server withholds it, and the page says so instead of showing an empty history.
  const {
    items: registerItems,
    withheld,
    reload: reloadEvents,
    stateFor,
  } = useCommitteeRegister("audit_events");
  const events = registerItems("audit_events");
  const eventsWithheld = withheld.includes("audit_events");
  // A rank-withheld register is an authority state, not an empty history.
  const eventsState = stateFor("audit_events");

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
      <PageHeader icon={ShieldCheck} title={getTitle("التدقيق وإعادة البناء", "Audit & Reconstruction", lang)} />

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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              )}: {reconstructedState.members.map((m) => (lang === "ar" ? m.full_name_ar || m.full_name : m.full_name)).join("، ")}
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
        <CompletionLedger />
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
        {eventsWithheld ? (
          <RegisterStatePanel state={SURFACE_STATE.NO_AUTHORITY} icon={ShieldCheck} />
        ) : eventsState ? (
          <RegisterStatePanel
            state={eventsState}
            onRetry={reloadEvents}
            icon={ShieldCheck}
            emptyTitle={t("لا توجد أحداث تدقيق", "No audit events")}
            emptyDescription={t("قُرِئ سجل الأحداث بنجاح، ولا يحتوي على أي حدث في نطاقك الحالي.", "The event log was read successfully and holds no event in your current scope.")}
          />
        ) : (
          <div className="raqeem-card divide-y divide-border">
            {events.slice(0, 50).map((e) => (
              <div key={e.id} className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-foreground">{auditActionLabel(e.action, lang)}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(e.created_date || e.timestamp)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {e.actor_name || "—"}
                  {e.entity_type ? ` · ${e.entity_type}` : ""}
                  {e.entity_title ? ` · ${e.entity_title}` : ""}
                </div>
                {e.description && <div className="text-xs text-muted-foreground mt-0.5">{e.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}