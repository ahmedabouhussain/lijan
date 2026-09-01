import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Gavel, Search } from "lucide-react";
import { DECISION_STATUS, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

export default function Decisions() {
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  const filtered = decisions.filter((d) => {
    const matchSearch = !search || d.title?.includes(search) || d.decision_number?.includes(search);
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

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
        <p className="text-sm text-muted-foreground mt-1">{decisions.length} قرار · {decisions.length} decisions</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
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
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(DECISION_STATUS).map(([k, v]) => (
            <option key={k} value={k}>{v.ar}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Gavel}
          title={search || statusFilter !== "all" ? "لا توجد نتائج" : "لا توجد قرارات بعد"}
          description={search || statusFilter !== "all" ? "جرّب تعديل البحث" : "القرارات تُنشأ من اجتماعات اللجان"}
        />
      ) : (
        <div className="raqeem-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 font-medium">القرار</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">اللجنة</th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">الرقم</th>
                <th className="text-right py-3 px-4 font-medium">الحالة</th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">الموعد</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                  <td className="py-3 px-4 font-medium text-foreground max-w-xs truncate">{d.title}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell truncate max-w-[150px]">{commName(d.committee_id)}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{d.decision_number || "—"}</td>
                  <td className="py-3 px-4"><StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} /></td>
                  <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{formatDate(d.deadline)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}