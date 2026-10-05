import React from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Gavel, CheckSquare, Link2 } from "lucide-react";
import { ACTION_STATUS, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import DecisionWorkflow from "@/components/raqeem/DecisionWorkflow";
import ProofChain from "@/components/raqeem/ProofChain";
import ProofChainSnapshot from "@/components/raqeem/ProofChainSnapshot";
import IssuanceIntegrityPanel from "@/components/raqeem/IssuanceIntegrityPanel";
import ProofChainDrawer from "@/components/raqeem/ProofChainDrawer";
import DecisionDocuments from "@/components/raqeem/DecisionDocuments";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";
import LocalizedField from "@/components/raqeem/LocalizedField";
import useCommitteeRecord from "@/hooks/useCommitteeRecord";
import ExplorationNotice from "@/components/raqeem/ExplorationNotice";
import RegisterStatePanel from "@/components/raqeem/RegisterStatePanel";
import { SURFACE_STATE } from "@/lib/governedState";

export default function DecisionDetail() {
  const { t } = useLanguage();
  const { id, orgRef, committeeRef } = useParams();
  // The same governed read as the register that listed this decision — so a decision that is
  // listed always opens, with its committee, meeting, votes and resulting actions.
  const { bundle, state, reload: load } = useCommitteeRecord("Decision", id);
  const decision = bundle?.record || null;
  const committee = bundle?.committee || null;
  const meeting = bundle?.meeting || null;
  const actions = bundle?.actions || [];
  const votes = bundle?.votes || [];
  const supersedingDecision = bundle?.superseding_decision || null;
  const isExploration = bundle?.is_demo_mode === true;

  // ONE state surface for every outcome that is not a loaded decision: loading, no authority,
  // out of scope, unavailable or a technical failure. A refusal is never shown as an empty page.
  if (state || !decision) {
    const backTo = orgRef && committeeRef ? `/o/${orgRef}/c/${committeeRef}/decisions` : "/";
    return (
      <div className="max-w-lg mx-auto my-10 space-y-3">
        <RegisterStatePanel state={state || SURFACE_STATE.NOT_FOUND} onRetry={load} icon={Gavel} />
        <p className="text-center">
          <Link to={backTo} className="text-primary hover:underline text-sm font-medium">
            {t("العودة إلى سجل القرارات", "Back to the decisions register")}
          </Link>
        </p>
      </div>
    );
  }

  // Inside a committee workspace every link stays in that workspace; the legacy flat
  // route (/decisions/:id) falls back to the redirecting legacy committee route.
  const basePath = orgRef && committeeRef ? `/o/${orgRef}/c/${committeeRef}` : "";
  const committeeHref = basePath || (committee ? `/committees/${committee.id}` : null);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        {committee && <Link to={committeeHref} className="hover:text-foreground"><LocalizedField entity="Committee" record={committee} /></Link>}
        {committee && <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />}
        {meeting && <Link to={`${basePath}/meetings/${meeting.id}`} className="hover:text-foreground"><LocalizedField entity="Meeting" record={meeting} base="title" /></Link>}
        {meeting && <ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />}
        <span className="text-foreground truncate"><LocalizedField entity="Decision" record={decision} base="title" /></span>
      </div>

      {isExploration && <ExplorationNotice />}

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground"><LocalizedField entity="Decision" record={decision} base="title" /></h1>
          {decision.decision_number && <span className="text-sm text-muted-foreground font-mono">{decision.decision_number}</span>}
          <ProofChainDrawer entityType="Decision" entityId={decision.id} entityTitle={L.title(decision)} />
        </div>
      </div>

      {/* Workflow */}
      <div className="raqeem-card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" /> {t("دورة عمل القرار", "Decision Workflow")}
        </h2>
        <DecisionWorkflow decision={decision} onChanged={load} />
      </div>

      {/* Proof-Carrying Decision — the decision carries its own proof */}
      <ProofChain
        decision={decision}
        committee={committee}
        meeting={meeting}
        votes={votes}
        supersedingDecision={supersedingDecision}
        committeeHref={committeeHref}
        basePath={basePath}
      />

      {/* Issuance integrity — verified server-side on every read (P0-01) */}
      <IssuanceIntegrityPanel decisionId={decision.id} />

      {/* Immutable Proof Chain Snapshot */}
      <ProofChainSnapshot
        decision={decision}
        committee={committee}
        votes={votes}
        signatures={[]}
        actions={actions}
      />

      {/* Legal References & Execution Documents */}
      <DecisionDocuments decision={decision} committee={committee} />

      {/* Dependencies & Execution Actions */}
      {decision.dependencies && (
        <div className="raqeem-card p-5">
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" /> {t("التبعيات", "Dependencies")}
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{decision.dependencies}</p>
        </div>
      )}

      <div className="raqeem-card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" /> {t("إجراءات التنفيذ", "Execution Actions")}
        </h2>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد إجراءات تنفيذية مسندة", "No execution actions assigned")}</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate"><LocalizedField entity="Action" record={a} base="title" /></div>
                  <div className="text-xs text-muted-foreground">{a.owner_name} · {formatDate(a.deadline)}</div>
                </div>
                <StatusBadge label={t(ACTION_STATUS[a.status]?.ar || a.status, ACTION_STATUS[a.status]?.en || a.status)} colorClass={ACTION_STATUS[a.status]?.color} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}