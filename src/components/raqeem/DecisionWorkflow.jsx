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
  const [votes, setVotes] = useState({
    vote_for: decision.vote_for || 0,
    vote_against: decision.vote_against || 0,
    vote_abstain: decision.vote_abstain || 0,
    dissent: decision.dissent || "",
  });
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

  const recordVotes = async (outcome) => {
    setSaving(true);
    try {
      await base44.entities.Decision.update(decision.id, {
        vote_for: parseInt(votes.vote_for) || 0,
        vote_against: parseInt(votes.vote_against) || 0,
        vote_abstain: parseInt(votes.vote_abstain) || 0,
        dissent: votes.dissent,
        status: outcome,
      });
      await log("vote", `تصويت: ${votes.vote_for} موافق / ${votes.vote_against} رافض / ${votes.vote_abstain} ممتنع — النتيجة: ${DECISION_STATUS[outcome]?.ar}`, decision.status, outcome);
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
            <ActionBtn onClick={() => setShowVoting(true)} icon={Vote} label="تسجيل التصويت" variant="approve" />
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
            <h4 className="text-sm font-semibold">تسجيل التصويت · Record Votes</h4>
            <button onClick={() => setShowVoting(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs text-emerald-700">موافق</Label>
              <Input type="number" min="0" value={votes.vote_for} onChange={(e) => setVotes((v) => ({ ...v, vote_for: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-destructive">رافض</Label>
              <Input type="number" min="0" value={votes.vote_against} onChange={(e) => setVotes((v) => ({ ...v, vote_against: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ممتنع</Label>
              <Input type="number" min="0" value={votes.vote_abstain} onChange={(e) => setVotes((v) => ({ ...v, vote_abstain: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-xs">المخالفة المُسجلة · Dissent</Label>
            <textarea value={votes.dissent} onChange={(e) => setVotes((v) => ({ ...v, dissent: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring" placeholder="نص المخالفة إن وجد" />
          </div>
          <div className="flex items-center gap-2">
            <ActionBtn onClick={() => recordVotes("approved")} icon={Check} label="اعتماد" variant="approve" />
            <ActionBtn onClick={() => recordVotes("rejected")} icon={X} label="رفض" variant="reject" />
            <ActionBtn onClick={() => recordVotes("deferred")} icon={Clock} label="تأجيل" variant="neutral" />
          </div>
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