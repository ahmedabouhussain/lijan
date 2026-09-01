import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Gavel, Search, ChevronLeft, Clock, Layers, User,
} from "lucide-react";
import { DECISION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

const STAGE_GROUPS = {
  all: { label: "الكل", statuses: null },
  review: { label: "قيد المراجعة", statuses: ["draft", "in_review", "proposed"] },
  voting: { label: "للتصويت", statuses: ["voting"] },
  approved: { label: "معتمدة", statuses: ["approved", "issued"] },
  executing: { label: "قيد التنفيذ", statuses: ["executing"] },
  done: { label: "مكتملة", statuses: ["completed", "closed"] },
  other: { label: "أخرى", statuses: ["rejected", "deferred", "superseded"] },
};

function VoteBar({ d }) {
  const total = (d.vote_for || 0) + (d.vote_against || 0) + (d.vote_abstain || 0);
  if (total === 0) return null;
  const forPct = ((d.vote_for || 0) / total) * 100;
  const againstPct = ((d.vote_against || 0) / total) * 100;
  const abstainPct = ((d.vote_abstain || 0) / total) * 100;
  return (
    <div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
        <div className="bg-emerald-500" style={{ width: `${forPct}%` }} />
        <div className="bg-destructive" style={{ width: `${againstPct}%` }} />
        <div className="bg-amber-400" style={{ width: `${abstainPct}%` }} />
      </div>
      <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
        <span className="text-emerald-600">مع {d.vote_for || 0}</span>
        <span className="text-destructive">ضد {d.vote_against || 0}</span>
        <span className="text-amber-600">ممتنع {d.vote_abstain || 0}</span>
      </div>
    </div>
  );
}

function DecisionCard({ d, commName }) {
  const status = DECISION_STATUS[d.status] || { ar: d.status };
  const overdue = d.deadline && isOverdue(d.deadline) && !["completed", "closed", "rejected"].includes(d.status);
  return (
    <Link
      to={`/decisions/${d.id}`}
      className="raqeem-card p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            {d.decision_number && (
              <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                {d.decision_number}
              </span>
            )}
            {d.superseded_by && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Layers className="w-3 h-3" /> ملغى بقرار لاحق
              </span>
            )}
          </div>
          <div className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {d.title}
          </div>
        </div>
        <StatusBadge label={status.ar} colorClass={status.color} />
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 truncate">
          <Gavel className="w-3 h-3" /> {commName(d.committee_id)}
        </span>
        {d.owner_name && (
          <span className="inline-flex items-center gap-1 truncate">
            <User className="w-3 h-3" /> {d.owner_name}
          </span>
        )}
      </div>

      {(d.vote_for || d.vote_against || d.vote_abstain) ? (
        <VoteBar d={d} />
      ) : (
        d.deadline && (
          <div className={`flex items-center gap-1.5 text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
            <Clock className="w-3 h-3" />
            <span>الموعد: {formatDate(d.deadline)}</span>
            {overdue && <span className="font-medium">· متأخر</span>}
          </div>
        )
      )}

      <div className="flex items-center justify-end pt-1 border-t border-border">
        <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

export default function Decisions() {
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const [decs, coms] = await Promise.all([
          base44.entities.Decision.list().catch(() => []),
          base44.entities.Committee.list().catch(() => []),
        ]);
        setDecisions(decs || []);
        setCommittees(coms || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const commName = (cid) => committees.find((c) => c.id === cid)?.name_ar || "—";

  const counts = useMemo(() => {
    const c = { all: decisions.length };
    Object.entries(STAGE_GROUPS).forEach(([key, group]) => {
      if (key === "all") return;
      c[key] = decisions.filter((d) => group.statuses.includes(d.status)).length;
    });
    return c;
  }, [decisions]);

  const filtered = useMemo(() => {
    const group = STAGE_GROUPS[stage];
    return decisions.filter((d) => {
      const matchSearch = !search || d.title?.includes(search) || d.decision_number?.includes(search);
      const matchStage = stage === "all" || group.statuses.includes(d.status);
      return matchSearch && matchStage;
    });
  }, [decisions, search, stage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">سجل القرارات · Decision Register</h1>
        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
          <span>{decisions.length} قرار</span>
          {counts.voting > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-purple-600">{counts.voting} للتصويت</span>
            </>
          )}
          {counts.executing > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-blue-600">{counts.executing} قيد التنفيذ</span>
            </>
          )}
          {counts.done > 0 && (
            <>
              <span className="text-border">·</span>
              <span className="text-emerald-600">{counts.done} مكتملة</span>
            </>
          )}
        </div>
      </div>

      {/* Search + stage chips */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في القرارات..."
            className="w-full pr-10 pl-4 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(STAGE_GROUPS).map(([key, group]) => (
            <button
              key={key}
              onClick={() => setStage(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                stage === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {group.label} {counts[key] > 0 && <span className="opacity-70">· {counts[key]}</span>}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title={search || stage !== "all" ? "لا توجد نتائج" : "لا توجد قرارات بعد"}
          description={search || stage !== "all" ? "جرّب تعديل البحث أو الفلترة" : "القرارات تُنشأ من اجتماعات اللجان"}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <DecisionCard key={d.id} d={d} commName={commName} />
          ))}
        </div>
      )}
    </div>
  );
}