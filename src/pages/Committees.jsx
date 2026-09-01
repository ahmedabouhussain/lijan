import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Plus, Users, ChevronLeft, Search } from "lucide-react";
import { COMMITTEE_TYPES, COMMITTEE_STATUS, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

export default function Committees() {
  const [loading, setLoading] = useState(true);
  const [committees, setCommittees] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.Committee.list();
        setCommittees(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = committees.filter(
    (c) =>
      !search ||
      c.name_ar?.includes(search) ||
      c.name_en?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">اللجان · Committees</h1>
          <p className="text-sm text-muted-foreground mt-1">{committees.length} لجنة · {committees.length} committees</p>
        </div>
        <Link
          to="/committees/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          إنشاء لجنة
        </Link>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث في اللجان..."
          className="w-full pr-10 pl-4 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "لا توجد نتائج" : "لا توجد لجان بعد"}
          description={search ? "جرّب تعديل البحث" : "ابدأ بإنشاء أول لجنة لإطلاق دورة الحوكمة المؤسسية"}
          action={
            !search && (
              <Link
                to="/committees/new"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-dark"
              >
                <Plus className="w-4 h-4" />
                إنشاء لجنة
              </Link>
            )
          }
        />
      ) : (
        <div className="raqeem-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 font-medium">اللجنة</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">النوع</th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">الرئيس</th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">المدة</th>
                <th className="text-right py-3 px-4 font-medium">الحالة</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-4">
                    <Link to={`/committees/${c.id}`} className="block">
                      <div className="font-medium text-foreground hover:text-primary">{c.name_ar || c.name_en}</div>
                      <div className="text-xs text-muted-foreground">{c.name_en}</div>
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                    {COMMITTEE_TYPES[c.type]?.ar || c.type}
                  </td>
                  <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">{c.chair_name || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">
                    {formatDate(c.term_start)} — {formatDate(c.term_end)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge label={COMMITTEE_STATUS[c.status]?.ar || c.status} colorClass={COMMITTEE_STATUS[c.status]?.color} />
                  </td>
                  <td className="py-3 px-4 text-left">
                    <Link to={`/committees/${c.id}`}>
                      <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}