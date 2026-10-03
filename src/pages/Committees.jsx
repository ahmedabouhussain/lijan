import React, { useEffect, useMemo, useState } from "react";
import { L } from "@/lib/l10n";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Plus, Users, Search, ShieldCheck, Gavel, Landmark, Briefcase,
  Network, Lightbulb, Sparkles, Layers, Building2, ChevronLeft, Clock,
} from "lucide-react";
import { COMMITTEE_TYPES, COMMITTEE_STATUS, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

const TYPE_ICONS = {
  permanent_council: Landmark,
  permanent_committee: ShieldCheck,
  temporary_committee: Clock,
  ministerial_committee: Building2,
  national_committee: Gavel,
  task_force: Briefcase,
  working_group: Users,
  advisory_committee: Lightbulb,
  special_committee: Sparkles,
  joint_committee: Network,
  cross_institutional: Layers,
};

const FILTER_CHIPS = [
  { key: "all", label: "الكل" },
  { key: "active", label: "نشطة" },
  { key: "pending_activation", label: "بانتظار التفعيل" },
  { key: "draft", label: "مسودة" },
  { key: "closed", label: "مغلقة" },
];

function CommitteeCard({ c }) {
  const TypeIcon = TYPE_ICONS[c.type] || ShieldCheck;
  const status = COMMITTEE_STATUS[c.status] || { ar: c.status };
  return (
    <Link
      to={`/committees/${c.id}`}
      className="raqeem-card p-5 flex flex-col gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
            <TypeIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {L.name(c)}
            </div>
            <div className="text-xs text-muted-foreground truncate">{c.name_en}</div>
          </div>
        </div>
        <StatusBadge label={status.ar} colorClass={status.color} />
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <div className="text-muted-foreground mb-0.5">النوع</div>
          <div className="text-foreground font-medium truncate">{COMMITTEE_TYPES[c.type]?.ar || c.type}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-0.5">الرئيس</div>
          <div className="text-foreground font-medium truncate">{c.chair_name || "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground mb-0.5">المدة</div>
          <div className="text-foreground font-medium truncate">
            {c.term_start ? `${formatDate(c.term_start)} — ${formatDate(c.term_end)}` : "—"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full ${c.governance_complete ? "bg-emerald-500 w-full" : "bg-amber-400 w-1/2"}`}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {c.governance_complete ? "حوكمة مكتملة" : "حوكمة غير مكتملة"}
          </span>
        </div>
        <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

export default function Committees() {
  const [loading, setLoading] = useState(true);
  const [committees, setCommittees] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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

  const filtered = useMemo(() => {
    return committees.filter((c) => {
      const matchSearch = !search ||
        c.name_ar?.includes(search) ||
        c.name_en?.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || c.status === filter;
      return matchSearch && matchFilter;
    });
  }, [committees, search, filter]);

  const counts = useMemo(() => ({
    active: committees.filter((c) => c.status === "active").length,
    pending: committees.filter((c) => c.status === "pending_activation").length,
  }), [committees]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">اللجان · Committees</h1>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
            <span>{committees.length} لجنة</span>
            <span className="text-border">·</span>
            <span className="text-emerald-600">{counts.active} نشطة</span>
            {counts.pending > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-amber-600">{counts.pending} بانتظار التفعيل</span>
              </>
            )}
          </div>
        </div>
        <Link
          to="/committees/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          إنشاء لجنة
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في اللجان..."
            className="w-full pr-10 pl-4 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === chip.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search || filter !== "all" ? "لا توجد نتائج" : "لا توجد لجان بعد"}
          description={search || filter !== "all" ? "جرّب تعديل البحث أو الفلترة" : "ابدأ بإنشاء أول لجنة لإطلاق دورة الحوكمة المؤسسية"}
          action={
            !search && filter === "all" && (
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <CommitteeCard key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}