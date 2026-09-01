import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Vote, Check, X, Clock, FileSignature, Play, CheckCircle2, ArrowUp, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS, ESCALATION_LEVEL } from "@/lib/raqeemUtils";

export default function DecisionWorkflow({ decision, onChanged }) {
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
      await log(action, `${descLabel}: ${DECISION_STATUS[oldStatus]?.ar} → ${DECISION_STATUS[newStatus]?.ar}`, oldStatus, newStatus);
      onChanged();
    } catch {}
    setSaving(false);
  };

  const loadMembersAndVotes = async () => {
    setLoadingMembers(true);
    try {
      const [mems, votesData] = await Promise.all([
        base44.entities.CommitteeMember.filter({ committee_id: decision.committee_id, status: "active" }).catch(() => []),
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
        if (v.choice === "against" && v.dissent) dissentParts.push(`${v.member.full_name}: ${v.dissent}`);
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
      await log("vote", `تصويت فردي: ${forCount} موافق / ${againstCount} رافض / ${abstainCount} ممتنع — النتيجة: ${DECISION_STATUS[outcome]?.ar}`, decision.status, outcome);
      setShowVoting(false);
      onChanged();
    } catch {}
    setSaving(false);
  };

  const escalate = async () => {
    setSaving(true);
    try {
      await base44.entities.Decision.update(decision.id, { escalation_level: escalationLevel });
      await log("escalate", `تصعيد إلى مستوى: ${ESCALATION_LEVEL[escalationLevel]?.ar}`, decision.escalation_level || "none", escalationLevel);
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
      await log("status_change", "إلغاء بقرار لاحق", decision.status, "superseded");
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
      disabled={saving}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 ${
        variant === "approve" ? "bg-emerald-600 text-white hover:bg-emerald-700" :
        variant === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" :
        variant === "neutral" ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" :
        "bg-primary text-primary-foreground hover:bg-primary-dark"
      }`}
    >
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">الحالة الحالية:</span>
        <StatusBadge label={DECISION_STATUS[status]?.ar || status} colorClass={DECISION_STATUS[status]?.color} size="md" />
        {decision.escalation_level && decision.escalation_level !== "none" && (
          <StatusBadge label={`تصعيد: ${ESCALATION_LEVEL[decision.escalation_level]?.ar || decision.escalation_level}`} colorClass="text-amber-700 bg-amber-50" />
        )}
      </div>

      {!isFinal && (
        <div className="flex flex-wrap items-center gap-2">
          {status === "draft" && (
            <ActionBtn onClick={() => transition("in_review", "status_change", "إرسال للمراجعة")} icon={Send} label="إرسال للمراجعة" />
          )}
          {status === "in_review" && (
            <ActionBtn onClick={() => transition("proposed", "status_change", "اقتراح")} icon={Send} label="اقتراح للتصويت" />
          )}
          {status === "proposed" && (
            <ActionBtn onClick={() => transition("voting", "status_change", "فتح التصويت")} icon={Vote} label="فتح التصويت" />
          )}
          {status === "voting" && (
            <ActionBtn onClick={() => { loadMembersAndVotes(); setShowVoting(true); }} icon={Vote} label="تسجيل التصويت" variant="approve" />
          )}
          {status === "approved" && (
            <ActionBtn onClick={() => transition("issued", "issue", "إصدار")} icon={FileSignature} label="إصدار القرار" />
          )}
          {status === "issued" && (
            <ActionBtn onClick={() => transition("executing", "status_change", "بدء التنفيذ")} icon={Play} label="بدء التنفيذ" />
          )}
          {status === "executing" && (
            <ActionBtn onClick={() => transition("completed", "close", "إكمال")} icon={CheckCircle2} label="إكمال" variant="approve" />
          )}
          <ActionBtn onClick={() => setShowEscalate(true)} icon={ArrowUp} label="تصعيد" variant="neutral" />
          <ActionBtn onClick={() => { loadOtherDecisions(); setShowSupersede(true); }} icon={GitBranch} label="إلغاء بقرار لاحق" variant="neutral" />
          {status === "voting" && (
            <ActionBtn onClick={() => transition("deferred", "status_change", "تأجيل")} icon={Clock} label="تأجيل" variant="neutral" />
          )}
        </div>
      )}

      {showVoting && (
        <div className="border border-border rounded-md p-4 space-y-3 bg-secondary/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">تسجيل التصويت الفردي · Individual Roll-Call Vote</h4>
            <button onClick={() => setShowVoting(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          {loadingMembers ? (
            <p className="text-xs text-muted-foreground">جارٍ تحميل الأعضاء...</p>
          ) : members.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا يوجد أعضاء نشطون في هذه اللجنة</p>
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
                          <div className="text-sm font-medium text-foreground truncate">{m.full_name}</div>
                          <div className="text-[10px] text-muted-foreground">{m.role === "chair" ? "الرئيس" : m.role === "secretary" ? "الأمين" : m.role === "vice_chair" ? "نائب الرئيس" : "عضو"}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {["for", "against", "abstain"].map((choice) => {
                            const labels = { for: "موافق", against: "رافض", abstain: "ممتنع" };
                            const colors = {
                              for: mv.choice === "for" ? "bg-emerald-600 text-white" : "bg-secondary text-muted-foreground hover:bg-emerald-50",
                              against: mv.choice === "against" ? "bg-destructive text-destructive-foreground" : "bg-secondary text-muted-foreground hover:bg-red-50",
                              abstain: mv.choice === "abstain" ? "bg-muted-foreground text-white" : "bg-secondary text-muted-foreground hover:bg-secondary/80",
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
                          placeholder="سبب المخالفة (اختياري)"
                          className="text-xs h-8"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <ActionBtn onClick={() => recordVotes("approved")} icon={Check} label="اعتماد القرار" variant="approve" />
                <ActionBtn onClick={() => recordVotes("rejected")} icon={X} label="رفض القرار" variant="reject" />
                <ActionBtn onClick={() => recordVotes("deferred")} icon={Clock} label="تأجيل" variant="neutral" />
              </div>
            </>
          )}
        </div>
      )}

      {showEscalate && (
        <div className="border border-border rounded-md p-4 space-y-3 bg-secondary/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">تصعيد القرار · Escalate</h4>
            <button onClick={() => setShowEscalate(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <select value={escalationLevel} onChange={(e) => setEscalationLevel(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {Object.entries(ESCALATION_LEVEL).filter(([k]) => k !== "none").map(([k, v]) => (
              <option key={k} value={k}>{v.ar} — {v.en}</option>
            ))}
          </select>
          <ActionBtn onClick={escalate} icon={ArrowUp} label="تأكيد التصعيد" />
        </div>
      )}

      {showSupersede && (
        <div className="border border-border rounded-md p-4 space-y-3 bg-secondary/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">إلغاء بقرار لاحق · Supersede</h4>
            <button onClick={() => setShowSupersede(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">اختر القرار اللاحق الذي يُلغي هذا القرار:</p>
          {loadingDecisions ? (
            <p className="text-xs text-muted-foreground">جارٍ التحميل...</p>
          ) : otherDecisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">لا توجد قرارات أخرى في هذه اللجنة</p>
          ) : (
            <select value={supersedeById} onChange={(e) => setSupersedeById(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">— اختر القرار اللاحق —</option>
              {otherDecisions.map((d) => (
                <option key={d.id} value={d.id}>{d.title} ({d.decision_number || "بدون رقم"})</option>
              ))}
            </select>
          )}
          <ActionBtn onClick={supersede} icon={GitBranch} label="تأكيد الإلغاء" variant="reject" />
        </div>
      )}
    </div>
  );
}