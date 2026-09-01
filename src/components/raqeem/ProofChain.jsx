import React from "react";
import { Link } from "react-router-dom";
import {
  ScrollText, Scale, FileText, GitFork, MessageSquare, Vote, AlertTriangle,
  User, Clock, CheckCircle2, TrendingUp, GitBranch, XCircle, ShieldCheck,
} from "lucide-react";
import { formatDate } from "@/lib/raqeemUtils";

/**
 * ProofChain — renders a decision as a self-contained "proof certificate".
 * Each step in the chain shows whether the evidence is present or missing,
 * making the decision's completeness visible at a glance.
 * This is the "Proof-Carrying Decision" differentiator — no competitor has this.
 */
export default function ProofChain({ decision, committee, meeting, votes, actions, supersedingDecision }) {
  const steps = [
    {
      key: "mandate",
      icon: ScrollText,
      label: "الصلاحية · Mandate",
      value: committee?.mandate,
      link: committee ? `/committees/${committee.id}` : null,
      linkLabel: committee?.name_ar,
      required: true,
    },
    {
      key: "legal",
      icon: Scale,
      label: "الأساس القانوني · Legal Basis",
      value: decision.legal_basis,
      required: true,
    },
    {
      key: "proposal",
      icon: FileText,
      label: "المقترح · Proposal",
      value: decision.proposal,
      required: true,
    },
    {
      key: "alternatives",
      icon: GitFork,
      label: "البدائل · Alternatives",
      value: decision.alternatives,
      required: false,
    },
    {
      key: "deliberation",
      icon: MessageSquare,
      label: "المناقشة · Deliberation",
      value: decision.deliberation_summary,
      required: false,
    },
    {
      key: "votes",
      icon: Vote,
      label: "التصويت · Votes",
      value: votes.length > 0
        ? `موافق ${decision.vote_for || 0} · رافض ${decision.vote_against || 0} · ممتنع ${decision.vote_abstain || 0} (${votes.length} صوت فردي)`
        : null,
      required: true,
      detail: votes.length > 0 ? (
        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
          {votes.map((v) => {
            const cfg = {
              for: { label: "موافق", color: "text-emerald-700" },
              against: { label: "رافض", color: "text-destructive" },
              abstain: { label: "ممتنع", color: "text-muted-foreground" },
            }[v.vote_choice] || { label: v.vote_choice, color: "text-muted-foreground" };
            return (
              <div key={v.id} className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium truncate">{v.voter_name}</span>
                <span className={cfg.color}>{cfg.label}</span>
              </div>
            );
          })}
        </div>
      ) : null,
    },
    {
      key: "dissent",
      icon: AlertTriangle,
      label: "المخالفة · Dissent",
      value: decision.dissent,
      required: false,
    },
    {
      key: "owner",
      icon: User,
      label: "مسؤول التنفيذ · Owner",
      value: decision.owner_name,
      required: true,
    },
    {
      key: "deadline",
      icon: Clock,
      label: "موعد التنفيذ · Deadline",
      value: decision.deadline ? formatDate(decision.deadline) : null,
      required: true,
    },
    {
      key: "outcome",
      icon: CheckCircle2,
      label: "النتيجة · Outcome",
      value: decision.outcome,
      required: false,
    },
    {
      key: "impact",
      icon: TrendingUp,
      label: "تقييم الأثر · Impact",
      value: decision.impact,
      required: false,
    },
  ];

  const completedCount = steps.filter((s) => s.value).length;
  const requiredSteps = steps.filter((s) => s.required);
  const completedRequired = requiredSteps.filter((s) => s.value).length;
  const proofScore = Math.round((completedCount / steps.length) * 100);
  const isProven = completedRequired === requiredSteps.length;

  return (
    <div className="raqeem-card p-5 border-r-4 border-r-primary">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> سلسلة البرهان · Proof-Carrying Decision
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">كل قرار يحمل سنده وحيثياته وأدلته وأصواته ونتيجته وأثره</p>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${isProven ? "text-emerald-600" : "text-amber-600"}`}>{proofScore}%</div>
          <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isProven ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {isProven ? "برهان مكتمل" : `${completedRequired}/${requiredSteps.length} إلزامي`}
          </div>
        </div>
      </div>

      {/* Proof chain timeline */}
      <div className="relative">
        <div className="absolute right-[15px] top-2 bottom-2 w-0.5 bg-border" />
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const has = !!step.value;
            const isRequired = step.required;
            return (
              <div key={step.key} className="flex items-start gap-3 relative">
                <div
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    has
                      ? "bg-emerald-100 text-emerald-700"
                      : isRequired
                      ? "bg-red-50 text-destructive"
                      : "bg-secondary text-muted-foreground/50"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                    {has ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : isRequired ? (
                      <span className="text-[10px] text-destructive font-medium">إلزامي ناقص</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">اختياري</span>
                    )}
                  </div>
                  {has ? (
                    <div className="mt-1">
                      {step.link ? (
                        <Link to={step.link} className="text-xs text-primary hover:underline">{step.linkLabel}: </Link>
                      ) : null}
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{step.value}</p>
                      {step.detail}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/40 italic mt-0.5">غير محدد</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Supersession */}
      {supersedingDecision && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 p-3 bg-secondary/30 rounded-md">
          <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="text-xs">
            <span className="text-muted-foreground">أُلغي بقرار لاحق: </span>
            <Link to={`/decisions/${supersedingDecision.id}`} className="text-primary hover:underline font-medium">{supersedingDecision.title}</Link>
          </div>
        </div>
      )}

      {/* Meeting context */}
      {meeting && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to={`/meetings/${meeting.id}`} className="text-primary hover:underline">الاجتماع: {meeting.title}</Link>
        </div>
      )}
    </div>
  );
}