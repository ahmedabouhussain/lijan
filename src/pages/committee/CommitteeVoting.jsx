import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS } from "@/lib/raqeemUtils";
import { CheckSquare } from "lucide-react";

export default function CommitteeVoting() {
  const { data } = useCommittee();
  const { t } = useLanguage();

  if (!data) return null;
  const voting = (data.registers.decisions || []).filter((d) => d.status === "voting");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("التصويت", "Voting")}</h1>
      </div>

      {voting.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد قرارات قيد التصويت حالياً", "No decisions currently in voting")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {voting.map((d) => (
            <div key={d.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-foreground">{d.title}</div>
                <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{t("موافق", "For")}: <strong className="text-foreground">{d.vote_for || 0}</strong></span>
                <span>{t("معارض", "Against")}: <strong className="text-foreground">{d.vote_against || 0}</strong></span>
                <span>{t("ممتنع", "Abstain")}: <strong className="text-foreground">{d.vote_abstain || 0}</strong></span>
              </div>
              {d.proposal && <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{d.proposal}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}