import React from "react";
import { Link } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import AuthorityLens from "@/components/raqeem/AuthorityLens";
import { DECISION_STATUS } from "@/lib/raqeemUtils";
import { CheckSquare, Gavel } from "lucide-react";

export default function CommitteeVoting() {
  const { data } = useCommittee();
  const { t } = useLanguage();

  if (!data) return null;
  const { my_role, is_oversight, is_recused, committee } = data;
  const voting = (data.registers.decisions || []).filter((d) => d.status === "voting");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("التصويت", "Voting")}</h1>
      </div>

      {/* Authority Lens for voting capability */}
      <AuthorityLens
        capability="vote"
        role={my_role}
        isOversight={is_oversight}
        isRecused={is_recused}
        committeeName={committee.name_ar || committee.name_en}
      />

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
                <Link to={`/decisions/${d.id}`} className="text-sm font-medium text-foreground hover:text-primary">
                  {d.title}
                </Link>
                <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{t("موافق", "For")}: <strong className="text-foreground">{d.vote_for || 0}</strong></span>
                <span>{t("معارض", "Against")}: <strong className="text-foreground">{d.vote_against || 0}</strong></span>
                <span>{t("ممتنع", "Abstain")}: <strong className="text-foreground">{d.vote_abstain || 0}</strong></span>
              </div>
              {d.proposal && <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{d.proposal}</p>}
              {d.legal_basis && (
                <div className="mt-2 pt-2 border-t border-border flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Gavel className="w-3 h-3" />
                  <span>{t("الأساس القانوني", "Legal Basis")}: {d.legal_basis}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}