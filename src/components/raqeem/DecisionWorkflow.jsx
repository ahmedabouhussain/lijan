import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Vote, Check, X, Clock, FileSignature, Play, CheckCircle2, ArrowUp, GitBranch, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, ESCALATION_LEVEL, MEMBER_ROLE } from "@/lib/raqeemUtils";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";

export default function DecisionWorkflow({ decision, onChanged }) {
  const { t, lang } = useLanguage();
  // Roles and every label below resolve to the ACTIVE language only.
  const roleLabel = (role) => {
    const entry = MEMBER_ROLE[role];
    return entry ? (lang === "ar" ? entry.ar : entry.en) : role;
  };
  const [showVoting, setShowVoting] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showSupersede, setShowSupersede] = useState(false);
  const [memberVotes, setMemberVotes] = useState({});
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [existingVotes, setExistingVotes] = useState([]);
  const [escalationLevel, setEscalationLevel] = useState("reminder");
  const [supersedeById, setSupersedeById] = useState("");
  const [otherDecisions, setOtherDecisions] = useState([]);
  const [loadingDecisions, setLoadingDecisions] = useState(false);
  const [saving, setSaving] = useState(false);

  const log = async (action, desc, oldVal, newVal) => {
    try {
      await base44.entities.AuditLog.create({
        action,
        entity_type: "Decision",
        entity_id: decision.id,
        entity_title: decision.title,
        description: desc,
        old_value: oldVal,
        new_value: newVal,
      });
    } catch {}
  };

  const transition = async (newStatus, action, descLabel) => {
    setSaving(true);
    try {
      const oldStatus = decision.status;
      await base44.entities.Decision.update(decision.id, { status: newStatus });
      await log(action, `${descLabel}: ${L.label(DECISION_STATUS, oldStatus, oldStatus)} → ${L.label(DECISION_STATUS, newStatus, newStatus)}`, oldStatus, newStatus);
      onChanged();
    } catch {}
    setSaving(false);
  };

  const loadMembersAndVotes = async () => {
    setLoadingMembers(true);
    try {
      const [mems, votesData] = await Promise.all([
        base44.entities.CommitteeMembership.filter({ committee_id: decision.committee_id, status: "active" }).catch(() => []),
        base44.entities.Vote.filter({ decision_id: decision.id }).catch(() => []),
      ]);
      const memList = mems || [];
      const voteList = votesData || [];
      setMembers(memList);
      setExistingVotes(voteList);
      const initial = {};
      memList.forEach((m) => {
        const existing = voteList.find((v) => v.voter_name === m.full_name);
        initial[m.id] = {
          choice: existing?.vote_choice || "abstain",
          dissent: existing?.dissent_reason || "",
          member: m,
        };
      });
      setMemberVotes(initial);
    } catch {}
    setLoadingMembers(false);
  };

  const recordVotes = async (outcome) => {
    setSaving(true);
    try {
      const voteList = Object.entries(memberVotes).filter(([, v]) => v.choice);
      let forCount = 0, againstCount = 0, abstainCount = 0;
      const dissentParts = [];

      for (const [, v] of voteList) {
        if (v.choice === "for") forCount++;
        else if (v.choice === "against") againstCount++;
        else abstainCount++;
        if (v.choice === "against" && v.dissent) dissentParts.push(`${L.name(v.member, "full_name")}: ${v.dissent}`);
      }

      const now = new Date().toISOString();
      const voteRecords = voteList.map(([, v]) => ({
        decision_id: decision.id,
        committee_id: decision.committee_id,
        meeting_id: decision.meeting_id,
        voter_name: v.member.full_name,
        voter_role: v.member.role,
        vote_choice: v.choice,
        dissent_reason: v.choice === "against" ? v.dissent : undefined,
        vote_method: "open",
        voted_at: now,
      }));

      await base44.entities.Vote.bulkCreate(voteRecords);

      await base44.entities.Decision.update(decision.id, {
        vote_for: forCount,
        vote_against: againstCount,
        vote_abstain: abstainCount,
        dissent: dissentParts.join(" | ") || undefined,
        status: outcome,
      });
      await log("vote", `${L.pair("تصويت فردي", "Individual vote")}: ${forCount} ${L.pair("موافق", "for")} / ${againstCount} ${L.pair("رافض", "against")} / ${abstainCount} ${L.pair("ممتنع", "abstain")} — ${L.pair("النتيجة", "Result")}: ${L.label(DECISION_STATUS, outcome, outcome)}`, decision.status, outcome);
      setShowVoting(false);
      onChanged();
    } catch {}
    setSaving(false);
  };

  const escalate = async () => {
    setSaving(true);
    try {
      await base44.entities.Decision.update(decision.id, { escalation_level: escalationLevel });
      await log("escalate", `${L.pair("تصعيد إلى مستوى", "Escalated to level")}: ${L.label(ESCALATION_LEVEL, escalationLevel, escalationLevel)}`, decision.escalation_level || "none", escalationLevel);
      setShowEscalate(false);
      onChanged();
    } catch {}
    setSaving(false);
  };

  const supersede = async () => {
    if (!supersedeById) return;
    setSaving(true);
    try {
      await base44.entities.Decision.update(decision.id, { status: "superseded", superseded_by: supersedeById });
      await log("status_change", L.pair("إلغاء بقرار لاحق", "Superseded by a later decision"), decision.status, "superseded");
      setShowSupersede(false);
      onChanged();
    } catch {}
    setSaving(false);
  };

  const loadOtherDecisions = async () => {
    setLoadingDecisions(true);
    try {
      const all = await base44.entities.Decision.filter({ committee_id: decision.committee_id });
      setOtherDecisions((all || []).filter((d) => d.id !== decision.id));
    } catch {}
    setLoadingDecisions(false);
  };

  const status = decision.status;
  const isFinal = ["rejected", "superseded", "closed"].includes(status);

  const ActionBtn = ({ onClick, icon: Icon, label, variant = "default" }) => (
    <button
      onClick={onClick}
      disabled={true}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 ${
        variant === "approve" ? "bg-state-success-ink text-state-success-surface" :
        variant === "reject" ? "bg-destructive text-destructive-foreground" :
        variant === "neutral" ? "bg-secondary text-secondary-foreground" :
        "bg-primary text-primary-foreground"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="p-3 rounded-md bg-state-warning-surface border border-state-warning-ink/20 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-state-warning-ink shrink-0" />
        <p className="text-xs text-state-warning-ink">{t("معطل مؤقتاً أثناء تأمين سير العمل المحكوم", "Temporarily unavailable while the governed workflow is being secured")}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">{t("الحالة الحالية:", "Current status:")}</span>
        <StatusBadge label={L.label(DECISION_STATUS, status, status)} colorClass={DECISION_STATUS[status]?.color} size="md" />
        {decision.escalation_level && decision.escalation_level !== "none" && (
          <StatusBadge label={`${L.pair("تصعيد", "Escalation")}: ${L.label(ESCALATION_LEVEL, decision.escalation_level, decision.escalation_level)}`} colorClass="text-state-warning-ink bg-state-warning-surface" />
        )}
      </div>

      {!isFinal && (
        <div className="flex flex-wrap items-center gap-2">
          {status === "draft" && (
            <ActionBtn onClick={() => transition("in_review", "status_change", t("إرسال للمراجعة", "Send for Review"))} icon={Send} label={t("إرسال للمراجعة", "Send for Review")} />
          )}
          {status === "in_review" && (
            <ActionBtn onClick={() => transition("proposed", "status_change", t("اقتراح", "Propose"))} icon={Send} label={t("اقتراح للتصويت", "Propose for Vote")} />
          )}
          {status === "proposed" && (
            <ActionBtn onClick={() => transition("voting", "status_change", t("فتح التصويت", "Open Voting"))} icon={Vote} label={t("فتح التصويت", "Open Voting")} />
          )}
          {status === "voting" && (
            <ActionBtn onClick={() => { loadMembersAndVotes(); setShowVoting(true); }} icon={Vote} label={t("تسجيل التصويت", "Record Vote")} variant="approve" />
          )}
          {status === "approved" && (
            <ActionBtn onClick={() => transition("issued", "issue", t("إصدار", "Issue"))} icon={FileSignature} label={t("إصدار القرار", "Issue Decision")} />
          )}
          {status === "issued" && (
            <ActionBtn onClick={() => transition("executing", "status_change", t("بدء التنفيذ", "Start Execution"))} icon={Play} label={t("بدء التنفيذ", "Start Execution")} />
          )}
          {status === "executing" && (
            <ActionBtn onClick={() => transition("completed", "close", t("إكمال", "Complete"))} icon={CheckCircle2} label={t("إكمال", "Complete")} variant="approve" />
          )}
          <ActionBtn onClick={() => setShowEscalate(true)} icon={ArrowUp} label={t("تصعيد", "Escalate")} variant="neutral" />
          <ActionBtn onClick={() => { loadOtherDecisions(); setShowSupersede(true); }} icon={GitBranch} label={t("إلغاء بقرار لاحق", "Supersede")} variant="neutral" />
          {status === "voting" && (
            <ActionBtn onClick={() => transition("deferred", "status_change", t("تأجيل", "Defer"))} icon={Clock} label={t("تأجيل", "Defer")} variant="neutral" />
          )}
        </div>
      )}

      {showVoting && (
        <div className="border border-border rounded-md p-4 space-y-3 bg-secondary/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{t("تسجيل التصويت الفردي", "Individual Roll-Call Vote")}</h4>
            <button onClick={() => setShowVoting(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          {loadingMembers ? (
            <p className="text-xs text-muted-foreground">{t("جارٍ تحميل الأعضاء...", "Loading members…")}</p>
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("لا يوجد أعضاء نشطون في هذه اللجنة", "No active members in this committee")}</p>
          ) : (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {members.map((m) => {
                  const mv = memberVotes[m.id] || { choice: "abstain", dissent: "" };
                  const isAgainst = mv.choice === "against";
                  return (
                    <div key={m.id} className="border border-border rounded-md p-3 bg-card">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{L.name(m, "full_name")}</div>
                          <div className="text-[10px] text-muted-foreground">{roleLabel(m.role)}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {["for", "against", "abstain"].map((choice) => {
                            const labels = { for: t("موافق", "For"), against: t("رافض", "Against"), abstain: t("ممتنع", "Abstain") };
                            const colors = {
                              for: mv.choice === "for" ? "bg-state-success-ink text-state-success-surface" : "bg-secondary text-muted-foreground hover:bg-state-success-surface",
                              against: mv.choice === "against" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground hover:bg-state-danger-surface",
                              abstain: mv.choice === "abstain" ? "bg-muted-foreground text-background" : "bg-secondary text-muted-foreground hover:bg-secondary/80",
                            };
                            return (
                              <button
                                key={choice}
                                onClick={() => setMemberVotes((prev) => ({ ...prev, [m.id]: { ...prev[m.id], choice } }))}
                                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${colors[choice]}`}
                              >
                                {labels[choice]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {isAgainst && (
                        <Input
                          value={mv.dissent || ""}
                          onChange={(e) => setMemberVotes((prev) => ({ ...prev, [m.id]: { ...prev[m.id], dissent: e.target.value } }))}
                          placeholder={t("سبب المخالفة (اختياري)", "Dissent reason (optional)")}
                          className="text-xs h-8"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <ActionBtn onClick={() => recordVotes("approved")} icon={Check} label={t("اعتماد القرار", "Approve Decision")} variant="approve" />
                <ActionBtn onClick={() => recordVotes("rejected")} icon={X} label={t("رفض القرار", "Reject Decision")} variant="reject" />
                <ActionBtn onClick={() => recordVotes("deferred")} icon={Clock} label={t("تأجيل", "Defer")} variant="neutral" />
              </div>
            </>
          )}
        </div>
      )}

      {showEscalate && (
        <div className="border border-border rounded-md p-4 space-y-3 bg-secondary/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{t("تصعيد القرار", "Escalate Decision")}</h4>
            <button onClick={() => setShowEscalate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <select value={escalationLevel} onChange={(e) => setEscalationLevel(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {Object.entries(ESCALATION_LEVEL).filter(([k]) => k !== "none").map(([k, v]) => (
              <option key={k} value={k}>{lang === "ar" ? v.ar : v.en}</option>
            ))}
          </select>
          <ActionBtn onClick={escalate} icon={ArrowUp} label={t("تأكيد التصعيد", "Confirm Escalation")} />
        </div>
      )}

      {showSupersede && (
        <div className="border border-border rounded-md p-4 space-y-3 bg-secondary/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">{t("إلغاء بقرار لاحق", "Supersede")}</h4>
            <button onClick={() => setShowSupersede(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t("اختر القرار اللاحق الذي يُلغي هذا القرار:", "Choose the later decision that supersedes this one:")}</p>
          {loadingDecisions ? (
            <p className="text-xs text-muted-foreground">{t("جارٍ التحميل...", "Loading…")}</p>
          ) : otherDecisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("لا توجد قرارات أخرى في هذه اللجنة", "No other decisions in this committee")}</p>
          ) : (
            <select value={supersedeById} onChange={(e) => setSupersedeById(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">{t("— اختر القرار اللاحق —", "— Select the later decision —")}</option>
              {otherDecisions.map((d) => (
                <option key={d.id} value={d.id}>{L.title(d)} ({d.decision_number || t("بدون رقم", "No number")})</option>
              ))}
            </select>
          )}
          <ActionBtn onClick={supersede} icon={GitBranch} label={t("تأكيد الإلغاء", "Confirm Supersede")} variant="reject" />
        </div>
      )}
    </div>
  );
}