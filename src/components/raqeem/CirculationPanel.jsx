import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send, RefreshCw, AlertTriangle, Check, X, Clock, Ban, UserX, Gavel, CalendarClock, Trash2 } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";
import { CIRCULATION_ROUND_STATE, CIRCULATION_RULE, CIRCULATION_DISPATCH_STATE, CIRCULATION_RESPONSE } from "@/lib/raqeemUtils";

// CirculationPanel — decisions by written resolution (brief rev 5 §4C), the secretary's route.
//
// The four facts a written-resolution surface must never blur, and how they appear here:
//   • dispatched  — shown as the ROUND's own fact, written by the dispatcher. Receipt is never inferred.
//   • opened / acknowledged — shown as the recipient's own timestamps, explicitly "not an approval".
//   • my response — offered ONLY on my own row, read back from the row itself.
//   • ready / approved / issued — three different things. A round that is ready states it is not a
//     decision; an approved round states that issuance is a separate, authorized step.
export default function CirculationPanel({ decision, capabilities, onChanged }) {
  const { t, lang } = useLanguage();
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [matter, setMatter] = useState("routine_decision");
  const [deadline, setDeadline] = useState("");
  const [newDeadline, setNewDeadline] = useState("");

  const perms = capabilities;
  const can = (cap) => {
    if (!perms) return false;
    if (Array.isArray(perms)) return perms.includes(cap);
    if (perms[cap] === true) return true;
    const list = perms.permitted || perms.capabilities || perms.allowed;
    return Array.isArray(list) ? list.includes(cap) : false;
  };

  const load = async () => {
    if (!decision?.id) return;
    setError(null);
    try {
      const res = await base44.functions.invoke("GetCirculationState", { decision_id: decision.id, committee_id: decision.committee_id });
      const data = res?.data || {};
      if (data.error) { setState(null); setError(data.message?.[lang] || data.error); return; }
      setState(data);
      if (!deadline && data.policy?.default_deadline_hours) {
        const d = new Date(Date.now() + Number(data.policy.default_deadline_hours) * 3600_000);
        setDeadline(d.toISOString().slice(0, 16));
      }
    } catch (e) {
      setState(null);
      setError(t("تعذّر تحميل حالة القرار بالتمرير.", "The circulation state could not be loaded."));
    }
  };

  useEffect(() => { load(); }, [decision?.id]);

  const run = async (key, label, fn) => {
    setBusy(key); setOutcome(null);
    try {
      const res = await fn();
      const data = res?.data || {};
      if (data.error) {
        setOutcome({ kind: "refused", title: label, message: data.message?.[lang] || data.error, code: data.code });
      } else {
        setOutcome({ kind: "ok", title: label, message: null, detail: data });
      }
      if (typeof onChanged === "function") onChanged();
    } catch (e) {
      const data = e?.response?.data || {};
      setOutcome({ kind: "refused", title: label, message: data.message?.[lang] || data.error || t("تعذّر تنفيذ الإجراء.", "The action could not be performed."), code: data.code });
    }
    setBusy(null);
    await load();
  };

  const Btn = ({ onClick, icon: Icon, label, tone = "default", disabled, key: k, reason }) => {
    const palette = tone === "approve" ? "bg-state-success-ink text-state-success-surface"
      : tone === "reject" ? "bg-destructive text-destructive-foreground"
      : "bg-primary text-primary-foreground";
    return (
      <span className="inline-flex flex-col">
        <button onClick={onClick} disabled={disabled}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed ${palette}`}>
          {busy === k ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />} {label}
        </button>
        {disabled && reason && <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[15rem]">{reason}</span>}
      </span>
    );
  };

  if (error) {
    return (
      <div className="raqeem-card p-4 space-y-2">
        <p className="text-xs text-muted-foreground">{t("القرار بالتمرير (كتابي)", "Decision by circulation (written resolution)")}</p>
        <p className="text-xs text-destructive">{error}</p>
      </div>
    );
  }
  if (!state) return <div className="raqeem-card p-4"><p className="text-xs text-muted-foreground">{t("جارٍ التحميل…", "Loading…")}</p></div>;

  const round = state.round;
  const live = state.round_is_live;
  const tally = state.tally || { approve: 0, reject: 0, abstain: 0, recuse: 0, pending: state.round?.eligible_count || 0 };
  const row = state.my_response_row;
  const awaiting = !state.enabled && !round;

  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Gavel className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{t("القرار بالتمرير — قرار كتابي بموافقات موثّقة", "Decision by circulation — a written resolution with recorded approvals")}</p>
          <p className="text-[11px] text-muted-foreground">
            {t("التمرير إجراء الأمانة: يُعدّ ويُوجّه ويُسجَّل، ثم يُنتج نتيجته صاحب الصلاحية المسمّى في سياسة اللجنة — وإصدار القرار خطوة مستقلة.",
               "Circulation is the secretariat's route: prepared, routed and recorded, then finalized by the office the committee's own policy names — and issuance stays a separate step.")}
          </p>
        </div>
      </div>

      {/* The route is the committee's OWN decision, read from its policy record. */}
      {!state.enabled && (
        <div className="rounded-md border border-border bg-secondary/40 p-2.5 text-[11px] text-muted-foreground">
          {t("سياسة القرار بالتمرير غير مُسجّلة لهذه اللجنة، فلا يُفتح قرار كتابي عليها.",
             "This committee has no recorded circulation policy, so no written resolution is opened on it.")}
        </div>
      )}
      {state.enabled && state.policy && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
          <div><span className="text-muted-foreground">{t("القاعدة", "Rule")}</span><p>{state.policy.default_rule}</p></div>
          <div><span className="text-muted-foreground">{t("المُصادِق وفق السياسة", "Policy finalizer")}</span><p>{state.policy.finalizer_role || "—"}</p></div>
          <div><span className="text-muted-foreground">{t("المشاركة المطلوبة", "Participation required")}</span><p>{state.policy.quorum_participation ?? "—"}</p></div>
          <div><span className="text-muted-foreground">{t("التمديد", "Extension")}</span><p>{state.policy.allow_extension ? t(`مسموح (${state.policy.extension_count_limit})`, `allowed (${state.policy.extension_count_limit})`) : t("غير مسموح", "not allowed")}</p></div>
        </div>
      )}

      {awaiting && !can("circulation.open") && (
        <p className="text-[11px] text-muted-foreground">
          {t("افتتاح قرار بالتمرير صلاحية مكتب الصياغة (الرئيس أو الأمين) بعد تمكين المسار في سياسة اللجنة.",
             "Opening a circulation round belongs to the drafting office (chair or secretary), once the route is enabled in the committee's policy.")}
        </p>
      )}

      {/* Dispatch — only a live route, only the drafting office, and never without an explicit deadline. */}
      {state.enabled && !live && (
        <div className="rounded-md border border-border p-3 space-y-2">
          <p className="text-xs font-medium">{t("فتح دورة تمرير جديدة", "Open a new circulation round")}</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-[11px]">
              <span className="text-muted-foreground">{t("نوع الموضوع", "Matter type")}</span>
              <select value={matter} onChange={(e) => setMatter(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs">
                {(state.policy?.permitted_matter_types || []).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px]">
              <span className="text-muted-foreground">{t("المهلة", "Deadline")}</span>
              <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" />
            </label>
            <Btn key="dispatch" icon={Send} label={t("إرسال الدورة", "Dispatch the round")}
              disabled={!can("circulation.open") || !deadline || busy === "dispatch" || (state.policy?.permitted_matter_types || []).length === 0}
              reason={!can("circulation.open") ? t("يلزمك حق فتح التمرير.", "circulation.open is required.") : !deadline ? t("يجب تحديد مهلة صريحة مستقبلية.", "An explicit future deadline is required.") : null}
              onClick={() => run("dispatch", t("إرسال الدورة", "Dispatch the round"), () => base44.functions.invoke("OpenCirculation", {
                committee_id: decision.committee_id, decision_id: decision.id, matter_type: matter,
                deadline_at: new Date(deadline).toISOString(), time_zone: state.policy?.time_zone || null,
              }))} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {t("يُجمَّد نص المقترح والمقاعد المؤهلة عند الإرسال؛ وما يصل بعد المهلة لا يُحتسب، والصمت ليس موافقة.",
               "The text and the eligible seats are frozen at dispatch; nothing received after the deadline counts, and silence is never approval.")}
          </p>
        </div>
      )}

      {/* The round itself: dispatch, opening and acknowledgment are three different facts. */}
      {round && (
        <div className="rounded-md border border-border divide-y divide-border">
          <div className="flex flex-wrap items-center gap-2 p-2.5">
            <StatusBadge label={`${t("الدورة", "Round")} ${round.round_number || 1} · ${L.label(CIRCULATION_ROUND_STATE, round.state, round.state)}`}
              colorClass={round.state === "approved" ? "text-state-success-ink bg-state-success-surface"
                : ["rejected", "not_carried", "expired"].includes(round.state) ? "text-state-danger-ink bg-state-danger-surface"
                : "text-state-progress-ink bg-state-progress-surface"} />
            <span className="text-[11px] text-muted-foreground">{t("القاعدة", "Rule")}: {L.label(CIRCULATION_RULE, round.rule, round.rule)}</span>
            <span className="text-[11px] text-muted-foreground">{t("المهلة", "Deadline")}: {round.deadline_at ? new Date(round.deadline_at).toLocaleString(lang === "ar" ? "ar" : "en-GB") : "—"}</span>
            {Number(round.extension_count || 0) > 0 && (
              <span className="text-[11px] text-state-warning-ink">{t("تمدّدت", "Extended")} {round.extension_count}×</span>
            )}
          </div>
          <div className="p-2.5 space-y-1">
            <div className="flex flex-wrap gap-3 text-[11px]">
              <span>{t("موافق", "Approve")}: <b>{tally.approve}</b></span>
              <span>{t("رافض", "Reject")}: <b>{tally.reject}</b></span>
              <span>{t("ممتنع", "Abstain")}: <b>{tally.abstain}</b></span>
              <span>{t("تنحّى", "Recused")}: <b>{tally.recuse}</b></span>
              <span className="text-muted-foreground">{t("بلا رد", "No response")}: <b>{tally.pending}</b></span>
              <span className="text-muted-foreground">{t("من {n} مؤهل", "of {n} eligible").replace("{n}", String(round.eligible_count || 0))}</span>
            </div>
            {state.quorum && (
              <p className="text-[11px] text-muted-foreground">
                {t("النصاب", "Participation")}: {state.quorum.participation}/{state.quorum.required} — {state.quorum.met ? t("مستوفى", "met") : t("غير مستوفى", "not met")}
                {state.threshold?.basis ? ` · ${state.threshold.basis}` : ""}
              </p>
            )}
            {state.ready && (
              <p className="text-[11px] text-state-progress-ink">{t("الدورة جاهزة للمصادقة — «جاهزة» ليست قرارًا.", "Ready for authorized finalization — ready is NOT a decision.")}</p>
            )}
            {round.state === "approved" && (
              <p className="text-[11px] text-state-success-ink">{t("اعتُمدت كتابةً. إصدار القرار خطوة مستقلة تالية.", "Approved in writing. Issuance is the separate next step.")}</p>
            )}
            {round.state === "ready" && <p className="text-[11px] text-state-warning-ink">{t("بانتظار المصادقة من الصفة المخوّلة بالسياسة.", "Awaiting finalization by the office the policy names.")}</p>}
          </div>

          {/* My own row: the ONLY place this seat answers, and only on its own identity. */}
          {row && live && (
            <div className="p-2.5 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                {t("صفّك في هذه الدورة", "Your row in this round")}: {row.seat_id} · {L.label(CIRCULATION_DISPATCH_STATE, row.dispatch_state, row.dispatch_state)}
                {row.opened_at ? ` · ${t("فُتح", "opened")}` : ""}{row.acknowledged_at ? ` · ${t("أُقرّ بالاستلام", "acknowledged")}` : ""}
                {" · "}{t("الاستلام والإقرار ليسا موافقة.", "receipt and acknowledgment are not approval.")}
              </p>
              {row.response === "pending" ? (
                <div className="flex flex-wrap items-start gap-2">
                  <Btn key="open" icon={Clock} label={t("فتح", "Open")} disabled={!!row.opened_at || busy === "open"}
                    onClick={() => run("open", t("فتح الصف", "Open the row"), () => base44.functions.invoke("RecordCirculationResponse", { response_id: row.id, action: "open" }))} />
                  <Btn key="ack" icon={Check} label={t("إقرار بالاستلام", "Acknowledge receipt")} disabled={!!row.acknowledged_at || busy === "ack"}
                    onClick={() => run("ack", t("إقرار بالاستلام", "Acknowledge receipt"), () => base44.functions.invoke("RecordCirculationResponse", { response_id: row.id, action: "acknowledge" }))} />
                  {["approve", "reject", "abstain", "recuse"].map((r) => (
                    <Btn key={r}
                      icon={r === "approve" ? Check : r === "reject" ? X : r === "abstain" ? Clock : UserX}
                      tone={r === "approve" ? "approve" : r === "reject" ? "reject" : "default"}
                      label={r === "approve" ? t("موافقة", "Approve") : r === "reject" ? t("رفض", "Reject") : r === "abstain" ? t("امتناع", "Abstain") : t("تنحٍّ", "Recuse")}
                      disabled={busy === r}
                      onClick={() => run(r, t("تسجيل ردّي", "Record my response"), () => base44.functions.invoke("RecordCirculationResponse", { response_id: row.id, action: r }))} />
                  ))}
                </div>
              ) : (
                <p className="text-[11px]">
                  {t("ردّك المسجّل", "Your recorded response")}: <b>{L.label(CIRCULATION_RESPONSE, row.response, row.response)}</b>{row.responded_at ? ` · ${new Date(row.responded_at).toLocaleString(lang === "ar" ? "ar" : "en-GB")}` : ""}
                  {" · "}{t("لا يُكتب الرد مرتين.", "a response is written once.")}
                </p>
              )}
            </div>
          )}
          {!row && live && (
            <p className="p-2.5 text-[11px] text-muted-foreground">
              {t("لا صف لك في هذه الدورة: من ليس في الهيئة المجمّدة لا يُصوّت ولا يُحتسب.", "You have no row in this round: a seat outside the frozen electorate neither answers nor counts.")}
            </p>
          )}

          {/* Finalizer acts vs administrative acts — two different authorities, stated as such. */}
          {live && (
            <div className="p-2.5 space-y-2">
              <div className="flex flex-wrap items-start gap-2">
                <Btn key="ready" icon={Gavel} label={t("جاهزة للمصادقة", "Mark ready")}
                  disabled={!can("circulation.finalize") || busy === "ready" || !state.ready}
                  reason={!can("circulation.finalize") ? t("يلزمك حق المصادقة (الرئيس وفق السياسة).", "circulation.finalize is required (the policy's finalizer).") : !state.ready ? t("لم تُستوفَ المشاركة/المهلة بعد.", "Participation or deadline not reached yet.") : null}
                  onClick={() => run("ready", t("جاهزة للمصادقة", "Mark ready"), () => base44.functions.invoke("FinalizeCirculation", { round_id: round.id, decision_id: decision.id, action: "mark_ready" }))} />
                <Btn key="finalize" icon={Gavel} tone="approve" label={t("إنتاج النتيجة", "Produce the outcome")}
                  disabled={!can("circulation.finalize") || busy === "finalize" || state.i_am_dispatcher}
                  reason={!can("circulation.finalize") ? t("يلزمك حق المصادقة.", "circulation.finalize is required.")
                    : state.i_am_dispatcher ? t("من أرسل الدورة لا يُنتج نتيجتها.", "The seat that dispatched the round does not finalize it.") : null}
                  onClick={() => run("finalize", t("إنتاج النتيجة", "Produce the outcome"), () => base44.functions.invoke("FinalizeCirculation", { round_id: round.id, decision_id: decision.id, action: "finalize" }))} />
              </div>
              <div className="flex flex-wrap items-start gap-2">
                <Btn key="extend" icon={CalendarClock} label={t("تمديد المهلة", "Extend the deadline")}
                  disabled={!can("circulation.open") || !state.policy?.allow_extension || !newDeadline || busy === "extend"}
                  reason={!state.policy?.allow_extension ? t("السياسة لا تجيز التمديد.", "The policy does not permit extension.")
                    : !newDeadline ? t("حدّد المهلة الجديدة.", "Set the new deadline.") : null}
                  onClick={() => run("extend", t("تمديد المهلة", "Extend the deadline"), () => base44.functions.invoke("FinalizeCirculation", { round_id: round.id, decision_id: decision.id, action: "extend", new_deadline_at: new Date(newDeadline).toISOString(), reason: "deadline extension" }))} />
                <input type="datetime-local" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)}
                  className="h-8 rounded-md border border-input bg-transparent px-2 text-xs" />
                <Btn key="cancel" icon={Ban} label={t("إلغاء الدورة", "Cancel the round")}
                  disabled={!can("circulation.open") || busy === "cancel"}
                  onClick={() => run("cancel", t("إلغاء الدورة", "Cancel the round"), () => base44.functions.invoke("FinalizeCirculation", { round_id: round.id, decision_id: decision.id, action: "cancel", reason: "cancelled by dispatch authority" }))} />
                <Btn key="withdraw" icon={Trash2} label={t("سحب الدورة", "Withdraw the round")}
                  disabled={!can("circulation.open") || busy === "withdraw"}
                  onClick={() => run("withdraw", t("سحب الدورة", "Withdraw the round"), () => base44.functions.invoke("FinalizeCirculation", { round_id: round.id, decision_id: decision.id, action: "withdraw", reason: "withdrawn by dispatch authority" }))} />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {t("التمديد والإلغاء والسحب إجراءات إدارية لا تُنتج قرارًا؛ وإنتاج النتيجة (اعتمادًا أو رفضًا) فعل المصادقة وحده.",
                   "Extend, cancel and withdraw are administrative acts that produce no outcome; producing the outcome (approved or rejected) is the finalizer's act alone.")}
              </p>
            </div>
          )}
        </div>
      )}

      {state.ambiguous_approved_rounds && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-state-danger-surface p-2.5">
          <AlertTriangle className="w-3.5 h-3.5 text-state-danger-ink shrink-0 mt-0.5" />
          <p className="text-[11px] text-state-danger-ink">
            {t("أكثر من دورة معتمدة على هذا القرار: لا يُختار واحدة بالترتيب، ولا يصدر قرار على هذا التناقض قبل تسويته.",
               "More than one approved round exists for this decision: none is chosen by order, and no issuance rests on that contradiction until it is settled.")}
          </p>
        </div>
      )}

      {outcome && (
        <div className={`rounded-md border p-2.5 text-[11px] space-y-1 ${outcome.kind === "ok" ? "border-state-success-ink/30 bg-state-success-surface text-state-success-ink" : "border-destructive/30 bg-state-danger-surface text-state-danger-ink"}`}>
          <p className="font-medium">{outcome.title}{outcome.code ? ` · ${outcome.code}` : ""}</p>
          {outcome.message && <p>{outcome.message}</p>}
          {outcome.kind === "ok" && outcome.detail?.outcome && <p>{t("النتيجة", "Outcome")}: {outcome.detail.outcome}</p>}
          {outcome.kind === "ok" && outcome.detail?.next_step && <p>{t("الخطوة التالية", "Next step")}: {outcome.detail.next_step}</p>}
          {outcome.detail?.correlation_id && <p className="text-[10px] opacity-70">correlation: {outcome.detail.correlation_id}</p>}
        </div>
      )}
    </div>
  );
}