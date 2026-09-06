import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronRight, Gavel, FileText, User, Clock, Scale, CheckSquare, MessageSquare, GitBranch, Link2 } from "lucide-react";
import { DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import DecisionWorkflow from "@/components/raqeem/DecisionWorkflow";
import ProofChain from "@/components/raqeem/ProofChain";
import ProofChainSnapshot from "@/components/raqeem/ProofChainSnapshot";
import ProofChainDrawer from "@/components/raqeem/ProofChainDrawer";
import DecisionDocuments from "@/components/raqeem/DecisionDocuments";

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{value || "—"}</div>
      </div>
    </div>
  );
}

export default function DecisionDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState(null);
  const [committee, setCommittee] = useState(null);
  const [meeting, setMeeting] = useState(null);
  const [actions, setActions] = useState([]);
  const [votes, setVotes] = useState([]);
  const [supersedingDecision, setSupersedingDecision] = useState(null);

  async function load() {
    try {
      const d = await base44.entities.Decision.get(id);
      setDecision(d);
      if (d.committee_id) {
        const c = await base44.entities.Committee.get(d.committee_id).catch(() => null);
        setCommittee(c);
      }
      if (d.meeting_id) {
        const m = await base44.entities.Meeting.get(d.meeting_id).catch(() => null);
        setMeeting(m);
      }
      if (d.superseded_by) {
        const sd = await base44.entities.Decision.get(d.superseded_by).catch(() => null);
        setSupersedingDecision(sd);
      }
      const [acts, voteList] = await Promise.all([
        base44.entities.Action.filter({ decision_id: id }).catch(() => []),
        base44.entities.Vote.filter({ decision_id: id }).catch(() => []),
      ]);
      setActions(acts || []);
      setVotes(voteList || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!decision) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">القرار غير موجود</p>
        <Link to="/decisions" className="text-primary hover:underline mt-2 inline-block">العودة للقرارات</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        {committee && <Link to={`/committees/${committee.id}`} className="hover:text-foreground">{committee.name_ar}</Link>}
        {committee && <ChevronRight className="w-4 h-4 rotate-180" />}
        {meeting && <Link to={`/meetings/${meeting.id}`} className="hover:text-foreground">{meeting.title}</Link>}
        {meeting && <ChevronRight className="w-4 h-4 rotate-180" />}
        <span className="text-foreground truncate">{decision.title}</span>
      </div>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">{decision.title}</h1>
          {decision.decision_number && <span className="text-sm text-muted-foreground font-mono">{decision.decision_number}</span>}
          <ProofChainDrawer entityType="Decision" entityId={decision.id} entityTitle={decision.title} />
        </div>
        {decision.title_ar && decision.title_ar !== decision.title && (
          <p className="text-sm text-muted-foreground">{decision.title_ar}</p>
        )}
      </div>

      {/* Workflow */}
      <div className="raqeem-card p-5">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Gavel className="w-4 h-4 text-primary" /> دورة عمل القرار · Decision Workflow
        </h2>
        <DecisionWorkflow decision={decision} onChanged={load} />
      </div>

      {/* Proof-Carrying Decision — the decision carries its own proof */}
      <ProofChain
        decision={decision}
        committee={committee}
        meeting={meeting}
        votes={votes}
        actions={actions}
        supersedingDecision={supersedingDecision}
      />

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
            <Link2 className="w-4 h-4 text-primary" /> التبعيات · Dependencies
          </h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{decision.dependencies}</p>
        </div>
      )}

      <div className="raqeem-card p-5">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-primary" /> إجراءات التنفيذ · Execution Actions
        </h2>
        {actions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد إجراءات تنفيذية مسندة</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.owner_name} · {formatDate(a.deadline)}</div>
                </div>
                <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}