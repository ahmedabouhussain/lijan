import React from "react";
import { Link } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { DECISION_STATUS } from "@/lib/raqeemUtils";
import { Gavel, ShieldCheck } from "lucide-react";

export default function CommitteeDecisions() {
  const { data } = useCommittee();
  const { t } = useLanguage();

  if (!data) return null;
  const decisions = data.registers.decisions || [];
  const { my_role, is_oversight, is_recused, committee } = data;

  const issued = decisions.filter((d) => ["issued", "executing", "completed", "closed"].includes(d.status));
  const inProgress = decisions.filter((d) => !["issued", "executing", "completed", "closed", "rejected", "superseded"].includes(d.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("قرارات اللجنة", "Committee Decisions")}</h1>
        <span className="text-sm text-muted-foreground">({decisions.length})</span>
      </div>

      {/* In-progress decisions */}
      {inProgress.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("قيد المعالجة", "In Progress")}</h3>
          <div className="raqeem-card divide-y divide-border">
            {inProgress.map((d) => (
              <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between p-3 hover:bg-secondary/30">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                  {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                </div>
                <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Issued decisions with proof chain indicator */}
      {issued.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t("القرارات الصادرة", "Issued Decisions")}
          </h3>
          <div className="raqeem-card divide-y divide-border">
            {issued.map((d) => (
              <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between p-3 hover:bg-secondary/30">
                <div className="min-w-0 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                    {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                  </div>
                </div>
                <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {decisions.length === 0 && (
        <div className="raqeem-card p-8 text-center">
          <Gavel className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد قرارات", "No decisions recorded")}</p>
        </div>
      )}
    </div>
  );
}