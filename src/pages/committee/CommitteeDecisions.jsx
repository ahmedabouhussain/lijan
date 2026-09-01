import React from "react";
import { Link } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS } from "@/lib/raqeemUtils";
import { Gavel } from "lucide-react";

export default function CommitteeDecisions() {
  const { data } = useCommittee();
  const { t } = useLanguage();

  if (!data) return null;
  const decisions = data.registers.decisions || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("قرارات اللجنة", "Committee Decisions")}</h1>
        <span className="text-sm text-muted-foreground">({decisions.length})</span>
      </div>

      {decisions.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <Gavel className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد قرارات", "No decisions recorded")}</p>
        </div>
      ) : (
        <div className="raqeem-card divide-y divide-border">
          {decisions.map((d) => (
            <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between p-3 hover:bg-secondary/30">
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
              </div>
              <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}