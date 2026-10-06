import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Vote, FileSignature, AlertTriangle, Lock, RefreshCw, Check, X, Clock, ArrowUp, Send, Play } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS } from "@/lib/raqeemUtils";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";

// P0-02 determination, expressed in code rather than in a comment:
//
//  • An action that HAS a governed server command calls that command. This component writes no
//    decision status, no vote and no escalation of its own — direct client writes are exactly how
//    this record came to carry a result of 13 against an electorate of 0.
//  • An action that has NO governed command stays unavailable and says why. There is no client-side
//    implementation left behind the button, so no flag can re-enable a write path by accident.
// The statuses come from the ONE lifecycle contract (base44/shared/decisionLifecycle.ts,
// decision-lifecycle-1.1.0) so this surface cannot advertise a state the handler refuses, or hide an
// action the handler would accept. `issue` includes the already-issued states because re-issuing an
// issued decision is an IDEMPOTENT re-verification of the same package, not a second issuance.
const GOVERNED_ACTIONS = {
  open_vote: { capability: "vote.call", statuses: ["draft", "proposed", "in_review"] },
  cast_vote: { capability: "vote.cast", statuses: ["voting"] },
  issue: { capability: "decision.issue", statuses: ["approved", "issued", "executing"] },
  submit_for_review: { capability: "decision.submit", statuses: ["draft"] },
  start_execution: { capability: "decision.execute", statuses: ["issued"] },
};

// Each entry names the exact gap, so the determination is readable on the surface that owns it.
const AWAITING_COMMAND = [
  { ar: "إصدار القرار", en: "Issue decision", statuses: ["draft", "proposed", "voting"], whyAr: "الإصدار انتقال محروس: يقتضي أن يكون القرار «معتمدًا» — والاعتماد ينتج عن نتيجة التصويت لا بتحرير الحالة — مع استيفاء المتطلبات الإلزامية.", whyEn: "Issuance is a governed transition: it requires the decision to be 'approved' (approval follows from the vote result, never from a status edit) with its mandatory requirements complete." },
  { ar: "إكمال", en: "Complete", statuses: ["executing"], whyAr: "الإكمال يقتضي إجراءً مُسندًا بدليل متحقق منه؛ لا يُعتمد على تغيير الحالة هنا.", whyEn: "Completion requires an assigned action with verified evidence; it is not achieved by a status change here." },
  { ar: "إلغاء بقرار لاحق", en: "Supersede", statuses: ["*"], whyAr: "الإلغاء بقرار لاحق يقتضي أمرًا محكومًا غير متوفر بعد؛ ولا يُكتب مباشرة.", whyEn: "Superseding requires a governed command that is not available yet; it is never written directly." },
  { ar: "تصعيد القرار", en: "Escalate the decision", statuses: ["*"], whyAr: "التصعيد محكوم على سجل الإجراء، لا على القرار — صعِّد الإجراء المرتبط من «التنفيذ والمتابعة».", whyEn: "Escalation is governed on the action record, not on the decision — escalate the linked action from Execution." },
];

const hasCapability = (capabilities, name) => {
  if (!capabilities) return false;
  if (Array.isArray(capabilities)) return capabilities.includes(name);
  if (typeof capabilities === "object") {
    if (capabilities[name] === true) return true;
    const list = capabilities.permitted || capabilities.capabilities || capabilities.allowed;
    return Array.isArray(list) ? list.includes(name) : false;
  }
  return false;
};

export default function DecisionWorkflow({ decision, onChanged }) {
  const { t, lang } = useLanguage();
  const [capabilities, setCapabilities] = useState(null);
  const [role, setRole] = useState(null);
  const [capError, setCapError] = useState(null);
  const [authorityContext, setAuthorityContext] = useState(null);
  const [busy, setBusy] = useState(null);
  const [outcome, setOutcome] = useState(null);

  const reloadAuthority = async () => {
    if (!decision?.committee_id) return;
    setCapError(null);
    try {
      const res = await base44.functions.invoke("GetCommitteeCapabilities", { committee_id: decision.committee_id });
      const data = res?.data || {};
      if (data.error) {
        setCapabilities(null);
        setRole(null);
        setCapError(data.message?.[lang] || data.error);
        return;
      }
      setCapabilities(data.capabilities ?? null);
      setRole(data.role || null);
      setAuthorityContext(data.authority_context || null);
    } catch (e) {
      setCapabilities(null);
      setCapError(t(
        "تعذّر التحقق من صلاحيتك في هذه اللجنة. أعد التحميل للمحاولة مرة أخرى.",
        "Your authority in this committee could not be established. Reload to try again.",
      ));
    }
  };

  useEffect(() => { reloadAuthority(); }, [decision?.committee_id, decision?.id]);

  const run = async (key, label, fn) => {
    setBusy(key);
    setOutcome(null);
    try {
      const res = await fn();
      const data = res?.data || {};
      if (data.error) {
        setOutcome({ kind: "refused", title: label, message: data.message?.[lang] || data.error, code: data.code || null, detail: data });
      } else {
        setOutcome({ kind: "ok", title: label, message: null, detail: data });
      }
      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      const data = e?.response?.data || {};
      setOutcome({
        kind: "refused",
        title: label,
        message: data.message?.[lang] || data.error || e?.message || t("تعذّر تنفيذ الإجراء.", "The action could not be performed."),
        code: data.code || null,
        detail: data,
      });
    }
    setBusy(null);
    reloadAuthority();
  };

  const status = decision?.status;
  const isFinal = ["rejected", "superseded", "closed"].includes(status);
  const allowed = (spec) => spec.statuses.includes("*") || spec.statuses.includes(status);
  const canDo = (key) => hasCapability(capabilities, GOVERNED_ACTIONS[key].capability) && allowed(GOVERNED_ACTIONS[key]);

  const blocked = AWAITING_COMMAND.filter(allowed);

  const ActionBtn = ({ onClick, icon: Icon, label, variant = "default", disabled, busyKey }) => {
    const palette = variant === "approve" ? "bg-state-success-ink text-state-success-surface"
      : variant === "reject" ? "bg-destructive text-destructive-foreground"
      : "bg-primary text-primary-foreground";
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed ${palette}`}
      >
        {busyKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />} {label}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Authority context — why an action is or is not available to THIS person. */}
      <div className="p-3 rounded-md bg-secondary/40 border border-border flex items-start gap-2">
        <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        {capError ? (
          <p className="text-xs text-destructive">{capError}</p>
        ) : (
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>{t("تُحدَّد صلاحيتك وفق عضويتك أو تفويضك الساري في هذه اللجنة، وليس وفق مسماك الوظيفي.", "Your authority follows your seat or active delegation in this committee, not your job title.")}</p>
            {role && <p className="text-foreground">{t("تتصرف بصفتك:", "You are acting as:")} {role}{authorityContext ? ` · ${authorityContext}` : ""}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{t("الحالة الحالية:", "Current status:")}</span>
        <StatusBadge label={L.label(DECISION_STATUS, status, status)} colorClass={DECISION_STATUS[status]?.color} size="md" />
        {decision?.escalation_level && decision.escalation_level !== "none" && (
          <StatusBadge label={`${L.pair("تصعيد", "Escalation")}: ${decision.escalation_level}`} colorClass="text-state-warning-ink bg-state-warning-surface" />
        )}
      </div>

      {!isFinal && (
        <div className="flex flex-wrap items-center gap-2">
          <ActionBtn
            onClick={() => run("open_vote", t("فتح التصويت", "Open voting"), () => base44.functions.invoke("OpenVote", { committee_id: decision.committee_id, decision_id: decision.id }))}
            icon={Vote}
            label={t("فتح التصويت", "Open voting")}
            disabled={!canDo("open_vote") || busy === "open_vote"}
            busyKey={busy === "open_vote"}
          />
          {status === "voting" && (
            <>
              {["for", "against", "abstain"].map((choice) => (
                <ActionBtn
                  key={choice}
                  onClick={() => run(`cast_${choice}`, t("تسجيل صوتي", "Cast my vote"), () => base44.functions.invoke("CastVote", { committee_id: decision.committee_id, decision_id: decision.id, vote_choice: choice }))}
                  icon={choice === "for" ? Check : choice === "against" ? X : Clock}
                  label={choice === "for" ? t("موافق", "For") : choice === "against" ? t("رافض", "Against") : t("ممتنع", "Abstain")}
                  variant={choice === "for" ? "approve" : choice === "against" ? "reject" : "default"}
                  disabled={!canDo("cast_vote") || !!busy}
                  busyKey={busy === `cast_${choice}`}
                />
              ))}
            </>
          )}
          <ActionBtn
            onClick={() => run("issue", t("إصدار القرار", "Issue decision"), () => base44.functions.invoke("IssueDecision", { decision_id: decision.id, committee_id: decision.committee_id }))}
            icon={FileSignature}
            label={t("إصدار القرار", "Issue decision")}
            variant="approve"
            disabled={!canDo("issue") || busy === "issue"}
            busyKey={busy === "issue"}
          />
          <ActionBtn
            onClick={() => run("submit_for_review", t("إرسال للمراجعة", "Send for review"), () => base44.functions.invoke("TransitionDecision", { committee_id: decision.committee_id, decision_id: decision.id, transition: "submit_for_review" }))}
            icon={Send}
            label={t("إرسال للمراجعة", "Send for review")}
            disabled={!canDo("submit_for_review") || !!busy}
            busyKey={busy === "submit_for_review"}
          />
          <ActionBtn
            onClick={() => run("start_execution", t("بدء التنفيذ", "Start execution"), () => base44.functions.invoke("TransitionDecision", { committee_id: decision.committee_id, decision_id: decision.id, transition: "start_execution" }))}
            icon={Play}
            label={t("بدء التنفيذ", "Start execution")}
            variant="approve"
            disabled={!canDo("start_execution") || !!busy}
            busyKey={busy === "start_execution"}
          />
        </div>
      )}

      {/* The determination of what is deliberately unavailable, with the exact reason. */}
      {blocked.length > 0 && (
        <div className="rounded-md border border-border divide-y divide-border">
          {blocked.map((item) => (
            <div key={item.en} className="flex items-start gap-2 p-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-state-warning-ink shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{lang === "ar" ? item.ar : item.en}</p>
                <p className="text-[11px] text-muted-foreground">{lang === "ar" ? item.whyAr : item.whyEn}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {outcome && (
        <div className={`rounded-md border p-3 text-xs space-y-1 ${outcome.kind === "ok" ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink" : "border-destructive/30 bg-state-danger-surface text-state-danger-ink"}`}>
          <p className="font-medium">{outcome.title}{outcome.code ? ` · ${outcome.code}` : ""}</p>
          {outcome.message && <p>{outcome.message}</p>}
          {outcome.kind === "ok" && outcome.detail?.eligible_count != null && (
            <p>{t("الهيئة الناخبة المجمّدة:", "Frozen electorate:")} {outcome.detail.eligible_count}{outcome.detail.excluded ? ` · ${t("مستبعد", "excluded")}: ${outcome.detail.excluded.recused_by_identifier + outcome.detail.excluded.out_of_term + outcome.detail.excluded.legacy_name_match}` : ""}</p>
          )}
          {outcome.kind === "ok" && outcome.detail?.issuance_state && (
            <p>{t("حالة الإصدار:", "Issuance state:")} {outcome.detail.issuance_state}</p>
          )}
          {outcome.detail?.correlation_id && <p className="text-[10px] opacity-70">correlation: {outcome.detail.correlation_id}</p>}
        </div>
      )}
    </div>
  );
}