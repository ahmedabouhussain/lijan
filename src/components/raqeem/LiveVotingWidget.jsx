import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ThumbsUp, ThumbsDown, Minus, CheckSquare, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LiveVotingWidget({ decision, canCallVote, canCastVote, onVoted }) {
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
  const showControls = decision.status === "proposed" || decision.status === "voting";

  if (!showControls && total === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border">
      {/* Vote counts */}
      <div className="flex items-center gap-4 text-xs mb-2">
        <span className="flex items-center gap-1">
          <ThumbsUp className="w-3 h-3 text-emerald-600" /> موافق: <strong className="text-foreground">{decision.vote_for || 0}</strong>
        </span>
        <span className="flex items-center gap-1">
          <ThumbsDown className="w-3 h-3 text-red-600" /> معارض: <strong className="text-foreground">{decision.vote_against || 0}</strong>
        </span>
        <span className="flex items-center gap-1">
          <Minus className="w-3 h-3 text-muted-foreground" /> ممتنع: <strong className="text-foreground">{decision.vote_abstain || 0}</strong>
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
      {decision.status === "proposed" && canCallVote && (
        <Button size="sm" disabled={voting} onClick={() => handle("OpenVote", base)}>
          {voting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
          فتح التصويت
        </Button>
      )}

      {decision.status === "voting" && (
        <div className="flex items-center gap-2 flex-wrap">
          {canCastVote && (
            <>
              <Button size="sm" variant="outline" disabled={voting} onClick={() => handle("CastVote", { ...base, vote_choice: "for" })}>
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" /> موافق
              </Button>
              <Button size="sm" variant="outline" disabled={voting} onClick={() => handle("CastVote", { ...base, vote_choice: "against" })}>
                <ThumbsDown className="w-3.5 h-3.5 text-red-600" /> معارض
              </Button>
              <Button size="sm" variant="outline" disabled={voting} onClick={() => handle("CastVote", { ...base, vote_choice: "abstain" })}>
                <Minus className="w-3.5 h-3.5" /> ممتنع
              </Button>
            </>
          )}
          {canCallVote && (
            <Button size="sm" disabled={voting} onClick={() => handle("CloseVote", base)}>
              {voting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              إغلاق التصويت
            </Button>
          )}
          {!canCastVote && !canCallVote && (
            <span className="text-xs text-muted-foreground">التصويت مفتوح للعضوية المصوّتة</span>
          )}
        </div>
      )}
    </div>
  );
}