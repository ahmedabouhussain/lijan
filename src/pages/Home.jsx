import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  AlertCircle,
  Gavel,
  CheckSquare,
  Calendar,
  TrendingUp,
  ChevronLeft,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";
import { COMMITTEE_STATUS, DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue, daysUntil } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="raqeem-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${accent || "text-muted-foreground"}`} />
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
    </div>
  );
}

function AttentionItem({ title, subtitle, badge, to }) {
  return (
    <Link to={to || "#"} className="flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-secondary/50 -mx-2 px-2 rounded-md transition-colors">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</div>}
      </div>
      {badge}
      <ArrowRight className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
    </Link>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [committees, setCommittees] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const [comms, decs, acts] = await Promise.all([
          base44.entities.Committee.list().catch(() => []),
          base44.entities.Decision.list().catch(() => []),
          base44.entities.Action.list().catch(() => []),
        ]);
        setCommittees(comms || []);
        setDecisions(decs || []);
        setActions(acts || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const activeCommittees = committees.filter((c) => c.status === "active");
  const pendingDecisions = decisions.filter((d) => ["draft", "in_review", "proposed", "voting"].includes(d.status));
  const overdueActions = actions.filter((a) => isOverdue(a.deadline) || a.status === "overdue");
  const inProgressActions = actions.filter((a) => ["assigned", "in_progress", "blocked", "evidence_pending"].includes(a.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">المجلس الأعلى للحوكمة · Supreme Council for Governance</div>
        <h1 className="text-2xl font-bold text-foreground">الملخص التنفيذي · Executive Brief</h1>
        <p className="text-sm text-muted-foreground mt-1">ما يتطلب انتباهك الآن · What requires your attention</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="لجان نشطة" value={activeCommittees.length} accent="text-primary" />
        <StatCard icon={Gavel} label="قرارات معلقة" value={pendingDecisions.length} accent="text-amber-600" />
        <StatCard icon={Clock} label="إجراءات متأخرة" value={overdueActions.length} accent="text-destructive" />
        <StatCard icon={CheckSquare} label="إجراءات جارية" value={inProgressActions.length} accent="text-blue-600" />
      </div>

      {/* Two-column: Attention + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attention Required */}
        <div className="raqeem-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <h2 className="text-sm font-semibold text-foreground">يتطلب انتباهًا · Attention Required</h2>
          </div>
          {overdueActions.length === 0 && pendingDecisions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">لا توجد أمور عاجلة · No urgent items</p>
          ) : (
            <div>
              {overdueActions.slice(0, 4).map((a) => (
                <AttentionItem
                  key={a.id}
                  title={a.title}
                  subtitle={`المسؤول: ${a.owner_name || "—"} · الموعد: ${formatDate(a.deadline)}`}
                  badge={<StatusBadge label="متأخر" colorClass={ACTION_STATUS.overdue.color} />}
                  to="/execution"
                />
              ))}
              {pendingDecisions.slice(0, 3).map((d) => (
                <AttentionItem
                  key={d.id}
                  title={d.title}
                  subtitle={`اللجنة · ${d.decision_number || "—"}`}
                  badge={<StatusBadge label={DECISION_STATUS[d.status]?.en || d.status} colorClass={DECISION_STATUS[d.status]?.color} />}
                  to="/decisions"
                />
              ))}
            </div>
          )}
        </div>

        {/* Active Committees */}
        <div className="raqeem-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">اللجان النشطة · Active Committees</h2>
            </div>
            <Link to="/committees" className="text-xs text-primary hover:underline flex items-center gap-1">
              عرض الكل <ChevronLeft className="w-3 h-3" />
            </Link>
          </div>
          {activeCommittees.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground mb-3">لا توجد لجان نشطة بعد</p>
              <Link to="/committees/new" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Users className="w-4 h-4" /> إنشاء لجنة جديدة
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {activeCommittees.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  to={`/committees/${c.id}`}
                  className="flex items-center justify-between py-2.5 px-2 -mx-2 rounded-md hover:bg-secondary/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{c.name_ar || c.name_en}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.name_en}</div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Decisions */}
      <div className="raqeem-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">أحدث القرارات · Recent Decisions</h2>
          </div>
          <Link to="/decisions" className="text-xs text-primary hover:underline flex items-center gap-1">
            سجل القرارات <ChevronLeft className="w-3 h-3" />
          </Link>
        </div>
        {decisions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">لا توجد قرارات بعد · No decisions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border">
                  <th className="text-right py-2 font-medium">القرار</th>
                  <th className="text-right py-2 font-medium hidden sm:table-cell">الرقم</th>
                  <th className="text-right py-2 font-medium">الحالة</th>
                  <th className="text-right py-2 font-medium hidden sm:table-cell">الموعد</th>
                </tr>
              </thead>
              <tbody>
                {decisions.slice(0, 6).map((d) => (
                  <tr key={d.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium text-foreground truncate max-w-xs">{d.title}</td>
                    <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{d.decision_number || "—"}</td>
                    <td className="py-2.5">
                      <StatusBadge label={DECISION_STATUS[d.status]?.en || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
                    </td>
                    <td className="py-2.5 text-muted-foreground hidden sm:table-cell">{formatDate(d.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}