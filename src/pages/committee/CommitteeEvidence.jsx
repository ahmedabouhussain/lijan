import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import EmptyState from "@/components/raqeem/EmptyState";
import StatusBadge from "@/components/raqeem/StatusBadge";
import ActionEvidencePanel from "@/components/raqeem/ActionEvidencePanel";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { ACTION_STATUS, formatDate } from "@/lib/raqeemUtils";
import { verificationStateOf } from "@/lib/actionState";
import { ShieldCheck } from "lucide-react";
import { L } from "@/lib/l10n";

// Evidence & Verification — the queue of what still needs a step: work awaiting evidence, evidence
// returned for correction, and submissions awaiting an INDEPENDENT verdict. An accepted record
// leaves this queue: closure is its own act on the action itself.
export default function CommitteeEvidence() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("evidence");

  if (!data) return <TableSkeleton rows={4} />;
  const { my_role, is_oversight, is_recused } = data;

  const queue = (data.registers?.actions || []).filter((a) => {
    const state = verificationStateOf(a);
    if (a.status === "closed" || a.status === "verified") return false;
    return a.status === "evidence_pending" || state === "returned" || state === "submitted" || a.status === "under_review";
  });

  // A UI hint only: whether THIS seat holds the verification right is decided server-side by the
  // kernel, and a refusal is shown on the record.
  const canJudge = ["chair", "secretary"].includes(my_role) && !is_oversight && !is_recused;

  return (
    <div className="space-y-4">
      <PageHeader
        icon={ShieldCheck}
        title={getTitle("الأدلة والتحقق", "Evidence & Verification", lang)}
        subtitle={getDescription(
          "تقديم الدليل من المُنفِّذ، وتحقق مستقل من مقعد آخر، ثم الإغلاق",
          "Evidence submitted by the performer, judged independently by another seat, then closure",
          lang,
        )}
        badge={<span className="text-sm text-muted-foreground">({queue.length})</span>}
      />

      {queue.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("لا توجد أدلة بانتظار خطوة", "No Evidence Awaiting A Step")}
          description={t("لا يوجد إجراء بانتظار تقديم دليل أو تحقق مستقل.", "No action awaits evidence or an independent verdict.")}
        />
      ) : (
        <div className="space-y-2">
          {queue.map((a) => (
            <div key={a.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{L.title(a)}</div>
                  <div className="text-xs text-muted-foreground">
                    {lang === "ar" ? a.owner_name : a.owner_name_en || a.owner_name} · {formatDate(a.deadline)}
                  </div>
                </div>
                <StatusBadge label={L.label(ACTION_STATUS, a.status, a.status)} colorClass={ACTION_STATUS[a.status]?.color} />
              </div>
              <ActionEvidencePanel action={a} onChanged={reload} allowVerify={canJudge} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}