import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ThumbsUp, ThumbsDown, Minus, CheckSquare, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";

export default function LiveVotingWidget({ decision, canCallVote, canCastVote, onVoted }) {
  const { t } = useLanguage();
  const [voting, setVoting] = useState(false);

  const handle = async (fn, payload) => {
    setVoting(true);
    try {
      await base44.functions.invoke(fn, payload);
      onVoted();
    } catch (e) {
      console.error("Vote action failed:", e);
    }
    setVoting(false);
  };

  const base = { committee_id: decision.committee_id, decision_id: decision.id };
  const total = (decision.vote_for || 0) + (decision.vote_against || 0) + (decision.vote_abstain || 0);
  // States a round may be opened from — mirrors decision-lifecycle-1.1.0 (a reviewed draft is votable).
  const votableStates = ["draft", "proposed", "in_review"];
  const showControls = votableStates.includes(decision.status) || decision.status === "voting";

  if (!showControls && total === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {/* Vote counts */}
      <div className="flex items-center gap-4 text-xs mb-2">
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-emerald-600" /> {t("موافق", "For")}: <strong className="text-foreground">{decision.vote_for || 0}</strong>
        </span>
        <span className="flex items-center gap-1">
          <ThumbsDown className="w-3 h-3 text-red-600" /> {t("معارض", "Against")}: <strong className="text-foreground">{decision.vote_against || 0}</strong>
        </span>
        <span className="flex items-center gap-1">
          <Minus className="w-3 h-3 text-muted-foreground" /> {t("ممتنع", "Abstain")}: <strong className="text-foreground">{decision.vote_abstain || 0}</strong>
        </span>
      </div>

      {/* Visual bar */}
      {total > 0 && (
        <div className="flex h-2 rounded-full overflow-hidden mb-3">
          <div className="bg-emerald-500" style={{ width: `${((decision.vote_for || 0) / total) * 100}%` }} />
          <div className="bg-red-500" style={{ width: `${((decision.vote_against || 0) / total) * 100}%` }} />
          <div className="bg-gray-400" style={{ width: `${((decision.vote_abstain || 0) / total) * 100}%` }} />
        </div>
      )}

      {/* Controls */}
      {votableStates.includes(decision.status) && canCallVote && (
        <Button size="sm" disabled={voting} onClick={() => handle("OpenVote", base)}>
          {voting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
          {t("فتح التصويت", "Open vote")}
        </Button>
      )}

      {decision.status === "voting" && (
        <div className="flex items-center gap-2 flex-wrap">
          {canCastVote && (
            <>
              <Button size="sm" variant="outline" disabled={voting} onClick={() => handle("CastVote", { ...base, vote_choice: "for" })}>
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> {t("موافق", "For")}
              </Button>
              <Button size="sm" variant="outline" disabled={voting} onClick={() => handle("CastVote", { ...base, vote_choice: "against" })}>
                <ThumbsDown className="w-3.5 h-3.5 text-red-600" /> {t("معارض", "Against")}
              </Button>
              <Button size="sm" variant="outline" disabled={voting} onClick={() => handle("CastVote", { ...base, vote_choice: "abstain" })}>
                <Minus className="w-3.5 h-3.5" /> {t("ممتنع", "Abstain")}
              </Button>
            </>
          )}
          {canCallVote && (
            <Button size="sm" disabled={voting} onClick={() => handle("CloseVote", base)}>
              {voting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              {t("إغلاق التصويت", "Close vote")}
            </Button>
          )}
          {!canCastVote && !canCallVote && (
            <span className="text-xs text-muted-foreground">{t("التصويت مفتوح للعضوية المصوّتة", "Voting is open to voting members")}</span>
          )}
        </div>
      )}
    </div>
  );
}