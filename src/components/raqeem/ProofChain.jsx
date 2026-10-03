import React from "react";
import { Link } from "react-router-dom";
import {
  ScrollText, Scale, FileText, GitFork, MessageSquare, Vote, AlertTriangle,
  User, Clock, CheckCircle2, TrendingUp, GitBranch, ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { dateOf } from "@/lib/l10n";
import LocalizedField from "@/components/raqeem/LocalizedField";
import ProofChainVotes from "@/components/raqeem/ProofChainVotes";

/**
 * ProofChain — renders a decision as a self-contained "proof certificate".
 * Each step shows whether its evidence is present or missing, in ONE language:
 * the active one. Links stay inside the committee workspace (basePath).
 */
export default function ProofChain({ decision, committee, meeting, votes, supersedingDecision, committeeHref, basePath }) {
  const { t, lang } = useLanguage();

  const steps = [
    { key: "mandate", icon: ScrollText, label: t("الصلاحية", "Mandate"), value: committee?.mandate, link: committeeHref, required: true },
    { key: "legal", icon: Scale, label: t("الأساس القانوني", "Legal Basis"), value: decision.legal_basis, required: true },
    { key: "proposal", icon: FileText, label: t("المقترح", "Proposal"), value: decision.proposal, required: true },
    { key: "alternatives", icon: GitFork, label: t("البدائل", "Alternatives"), value: decision.alternatives, required: false },
    { key: "deliberation", icon: MessageSquare, label: t("المناقشة", "Deliberation"), value: decision.deliberation_summary, required: false },
    {
      key: "votes",
      icon: Vote,
      label: t("التصويت", "Votes"),
      value: votes.length > 0
        ? t(
            `موافق ${decision.vote_for || 0} · رافض ${decision.vote_against || 0} · ممتنع ${decision.vote_abstain || 0} (${votes.length} صوت فردي)`,
            `For ${decision.vote_for || 0} · Against ${decision.vote_against || 0} · Abstain ${decision.vote_abstain || 0} (${votes.length} individual votes)`
          )
        : null,
      required: true,
      detail: votes.length > 0 ? <ProofChainVotes votes={votes} /> : null,
    },
    { key: "dissent", icon: AlertTriangle, label: t("المخالفة", "Dissent"), value: decision.dissent, required: false },
    { key: "owner", icon: User, label: t("مسؤول التنفيذ", "Execution Owner"), value: decision.owner_name, required: true },
    { key: "deadline", icon: Clock, label: t("موعد التنفيذ", "Deadline"), value: decision.deadline ? dateOf(decision.deadline, lang) : null, required: true },
    { key: "outcome", icon: CheckCircle2, label: t("النتيجة", "Outcome"), value: decision.outcome, required: false },
    { key: "impact", icon: TrendingUp, label: t("تقييم الأثر", "Impact Assessment"), value: decision.impact, required: false },
  ];

  const completedCount = steps.filter((s) => s.value).length;
  const requiredSteps = steps.filter((s) => s.required);
  const completedRequired = requiredSteps.filter((s) => s.value).length;
  const proofScore = Math.round((completedCount / steps.length) * 100);
  const isProven = completedRequired === requiredSteps.length;

  return (
    <div className="raqeem-card p-5 border-s-4 border-s-primary">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> {t("سلسلة البرهان", "Proof-Carrying Decision")}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("كل قرار يحمل سنده وحيثياته وأدلته وأصواته ونتيجته وأثره", "Every decision carries its mandate, rationale, evidence, votes, outcome and impact")}
          </p>
        </div>
        <div className="text-center shrink-0">
          <div className={`text-2xl font-bold ${isProven ? "text-state-success-ink" : "text-state-warning-ink"}`}>{proofScore}%</div>
          <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isProven ? "bg-state-success-surface text-state-success-ink" : "bg-state-warning-surface text-state-warning-ink"}`}>
            {isProven ? t("برهان مكتمل", "Proof complete") : t(`${completedRequired}/${requiredSteps.length} إلزامي`, `${completedRequired}/${requiredSteps.length} required`)}
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="absolute start-[15px] top-2 bottom-2 w-0.5 bg-border" />
        <div className="space-y-3">
          {steps.map((step) => {
            const Icon = step.icon;
            const has = !!step.value;
            return (
              <div key={step.key} className="flex items-start gap-3 relative">
                <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${has ? "bg-state-success-surface text-state-success-ink" : step.required ? "bg-state-danger-surface text-destructive" : "bg-secondary text-muted-foreground/50"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground">{step.label}</span>
                    {has ? (
                      <CheckCircle2 className="w-3 h-3 text-state-success-ink" />
                    ) : step.required ? (
                      <span className="text-[10px] text-destructive font-medium">{t("إلزامي ناقص", "Required — missing")}</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">{t("اختياري", "Optional")}</span>
                    )}
                  </div>
                  {has ? (
                    <div className="mt-1">
                      {step.link && committee ? (
                        <Link to={step.link} className="text-xs text-primary hover:underline">
                          <LocalizedField entity="Committee" record={committee} />
                        </Link>
                      ) : null}
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{step.value}</p>
                      {step.detail}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/40 italic mt-0.5">{t("غير محدد", "Not specified")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {supersedingDecision && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 p-3 bg-secondary/30 rounded-md">
          <GitBranch className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="text-xs">
            <span className="text-muted-foreground">{t("أُلغي بقرار لاحق:", "Superseded by a later decision:")} </span>
            <Link to={`${basePath}/decisions/${supersedingDecision.id}`} className="text-primary hover:underline font-medium">
              <LocalizedField entity="Decision" record={supersedingDecision} base="title" />
            </Link>
          </div>
        </div>
      )}

      {meeting && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Link to={`${basePath}/meetings/${meeting.id}`} className="text-primary hover:underline">
            {t("الاجتماع:", "Meeting:")} <LocalizedField entity="Meeting" record={meeting} base="title" />
          </Link>
        </div>
      )}
    </div>
  );
}