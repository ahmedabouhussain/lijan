import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/raqeem/StatusBadge";
import AuthorityLens from "@/components/raqeem/AuthorityLens";
import { DECISION_STATUS } from "@/lib/raqeemUtils";
import { CheckSquare, Gavel, Loader2, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { L } from "@/lib/l10n";

export default function CommitteeVoting() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("voting");
  const { orgRef, committeeRef } = useParams();
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState("");

  if (!data) return <TableSkeleton rows={4} />;
  const { my_role, is_oversight, is_recused, committee } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;
  const votingDecisions = (data.registers.decisions || []).filter((d) => d.status === "voting" || d.status === "proposed");
  const canCallVote = !is_oversight && !is_recused && ["chair", "vice_chair"].includes(my_role);
  const canCastVote = !is_oversight && !is_recused && ["chair", "vice_chair", "secretary", "member"].includes(my_role);

  const handleVoteAction = async (fn, payload, successMsg) => {
    setVoting(true); setError("");
    try {
      await base44.functions.invoke(fn, payload);
      reload();
    } catch (e) { setError(e?.response?.data?.error || e?.message || t("فشلت العملية", "Operation failed")); }
    setVoting(false);
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={CheckSquare} title={getTitle("التصويت", "Voting", lang)} />

      {/* Authority Lens for voting capability */}
      <AuthorityLens
        capability="vote"
        role={my_role}
        isOversight={is_oversight}
        isRecused={is_recused}
        committeeName={L.name(committee)}
      />

      {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
      {votingDecisions.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد قرارات قيد التصويت حالياً", "No decisions currently in voting")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {votingDecisions.map((d) => (
            <div key={d.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <Link to={`${base}/decisions/${d.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                  {d.title}
                </Link>
                <StatusBadge label={L.label(DECISION_STATUS, d.status, d.status)} colorClass={DECISION_STATUS[d.status]?.color} />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{t("موافق", "For")}: <strong className="text-foreground">{d.vote_for || 0}</strong></span>
                <span>{t("معارض", "Against")}: <strong className="text-foreground">{d.vote_against || 0}</strong></span>
                <span>{t("ممتنع", "Abstain")}: <strong className="text-foreground">{d.vote_abstain || 0}</strong></span>
              </div>
              {d.proposal && <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{d.proposal}</p>}
              {d.legal_basis && (
                <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Gavel className="w-3 h-3" aria-hidden="true" />
                  <span>{t("الأساس القانوني", "Legal Basis")}: {d.legal_basis}</span>
                </div>
              )}
              {/* Voting controls */}
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                {d.status === "proposed" && canCallVote && (
                  <Button size="sm" disabled={voting} onClick={() => handleVoteAction("OpenVote", { committee_id: committee.id, decision_id: d.id })}>
                    {voting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
                    {t("فتح التصويت", "Open Vote")}
                  </Button>
                )}
                {d.status === "voting" && canCastVote && (
                  <>
                    <Button size="sm" variant="outline" disabled={voting} onClick={() => handleVoteAction("CastVote", { committee_id: committee.id, decision_id: d.id, vote_choice: "for" })}>
                      <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> {t("موافق", "For")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={voting} onClick={() => handleVoteAction("CastVote", { committee_id: committee.id, decision_id: d.id, vote_choice: "against" })}>
                      <ThumbsDown className="w-3.5 h-3.5 text-red-600" aria-hidden="true" /> {t("معارض", "Against")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={voting} onClick={() => handleVoteAction("CastVote", { committee_id: committee.id, decision_id: d.id, vote_choice: "abstain" })}>
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" /> {t("ممتنع", "Abstain")}
                    </Button>
                  </>
                )}
                {d.status === "voting" && canCallVote && (
                  <Button size="sm" disabled={voting} onClick={() => handleVoteAction("CloseVote", { committee_id: committee.id, decision_id: d.id })}>
                    {t("إغلاق التصويت", "Close Vote")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}