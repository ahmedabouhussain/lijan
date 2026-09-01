import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CalendarClock,
  Gavel,
  Users,
  ShieldCheck,
  FileCheck,
  Clock,
  ArrowLeft,
  Sparkles,
  Building2,
  ListChecks,
} from "lucide-react";
import { MEETING_STATUS, DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue, daysUntil } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";

function PulseRing({ percent }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, percent)) / 100) * c;
  const color = percent >= 75 ? "#0f7a5f" : percent >= 50 ? "#b59a5b" : "#8A1538";
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-foreground">{percent}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">اكتمال الحوكمة</span>
      </div>
    </div>
  );
}

function AttentionRow({ icon: Icon, title, subtitle, badge, to, urgency }) {
  return (
    <Link to={to} className="group flex items-center gap-3 py-3 border-b border-border last:border-0 hover:bg-secondary/40 -mx-2 px-2 rounded-md transition-colors">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${urgency === "critical" ? "bg-red-50 text-destructive" : urgency === "high" ? "bg-amber-50 text-amber-600" : "bg-secondary text-muted-foreground"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</div>}
      </div>
      {badge}
      <ArrowLeft className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </Link>
  );
}

function QuickNav() {
  const items = [
    { to: "/committees", icon: Users, label: "اللجان" },
    { to: "/calendar", icon: CalendarClock, label: "الاجتماعات" },
    { to: "/decisions", icon: Gavel, label: "القرارات" },
    { to: "/execution", icon: ListChecks, label: "التنفيذ" },
    { to: "/memory", icon: Sparkles, label: "الذاكرة" },
  ];
  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <Link key={it.to} to={it.to} className="raqeem-card p-3 flex flex-col items-center gap-1.5 hover:border-primary/40 hover:bg-secondary/30 transition-colors group">
            <Icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-[11px] font-medium text-foreground">{it.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function GovernanceOverview({ data, roleLabel, RoleIcon }) {
  const { committees, members, meetings, decisions, actions, institution, user } = data;

  const governanceRate = committees.length > 0
    ? Math.round((committees.filter((c) => c.governance_complete).length / committees.length) * 100)
    : 0;

  const activeCommittees = committees.filter((c) => c.status === "active");
  const approvedDecisions = decisions.filter((d) => ["approved", "issued", "executing", "completed"].includes(d.status));
  const overdueActions = actions.filter((a) => isOverdue(a.deadline) && a.status !== "closed" && a.status !== "verified");

  // Unified, prioritized attention stream
  const attention = useMemo(() => {
    const items = [];

    // Critical overdue actions
    actions.forEach((a) => {
      if (isOverdue(a.deadline) && a.status !== "closed" && a.status !== "verified") {
        const days = daysUntil(a.deadline);
        items.push({
          urgency: ["critical", "high"].includes(a.priority) ? "critical" : "high",
          icon: AlertTriangle,
          title: a.title,
          subtitle: `${a.owner_name || "—"} · متأخر ${Math.abs(days)} يوم`,
          badge: <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />,
          to: "/execution",
          sort: 1 + (a.priority === "critical" ? 0 : 0.5),
        });
      }
    });

    // Extension requests pending review
    actions.forEach((a) => {
      if (a.extension_status === "requested") {
        items.push({
          urgency: "high",
          icon: Clock,
          title: `طلب تمديد: ${a.title}`,
          subtitle: `الموعد المقترح: ${formatDate(a.extension_new_deadline)}`,
          badge: <StatusBadge label="للمراجعة" colorClass="text-amber-700 bg-amber-50" />,
          to: "/execution",
          sort: 2,
        });
      }
    });

    // Decisions in voting
    decisions.forEach((d) => {
      if (["voting", "proposed"].includes(d.status)) {
        items.push({
          urgency: "high",
          icon: Gavel,
          title: d.title,
          subtitle: d.decision_number || "قرار",
          badge: <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />,
          to: "/decisions",
          sort: 3,
        });
      }
    });

    // Upcoming meetings (next 14 days)
    const now = new Date();
    meetings.forEach((m) => {
      const d = new Date(m.date);
      if (d >= now && m.status === "scheduled") {
        const days = Math.ceil((d - now) / 86400000);
        if (days <= 14) {
          items.push({
            urgency: days <= 2 ? "high" : "normal",
            icon: CalendarClock,
            title: m.title || m.title_ar,
            subtitle: `${formatDate(m.date)} · ${days === 0 ? "اليوم" : `بعد ${days} يوم`}`,
            badge: <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />,
            to: `/meetings/${m.id}`,
            sort: 4 + days / 100,
          });
        }
      }
    });

    // Committees pending activation
    committees.forEach((c) => {
      if (["draft", "pending_activation"].includes(c.status)) {
        items.push({
          urgency: "normal",
          icon: ShieldCheck,
          title: c.name_ar || c.name_en,
          subtitle: "بانتظار استكمال الحوكمة والتفعيل",
          badge: <StatusBadge label="مسودة" colorClass="text-muted-foreground bg-secondary" />,
          to: `/committees/${c.id}`,
          sort: 5,
        });
      }
    });

    // Compliance pending evidence
    actions.forEach((a) => {
      if (a.status === "evidence_pending" && !isOverdue(a.deadline)) {
        items.push({
          urgency: "normal",
          icon: FileCheck,
          title: a.title,
          subtitle: `${a.owner_name || "—"} · بانتظار الأدلة`,
          badge: <StatusBadge label="أدلة" colorClass="text-amber-700 bg-amber-50" />,
          to: "/execution",
          sort: 6,
        });
      }
    });

    return items.sort((a, b) => a.sort - b.sort).slice(0, 8);
  }, [actions, decisions, meetings, committees]);

  const briefing = useMemo(() => {
    const parts = [];
    if (overdueActions.length > 0) parts.push(`${overdueActions.length} إجراء متأخر`);
    const voting = decisions.filter((d) => d.status === "voting").length;
    if (voting > 0) parts.push(`${voting} قرار قيد التصويت`);
    const pendingExt = actions.filter((a) => a.extension_status === "requested").length;
    if (pendingExt > 0) parts.push(`${pendingExt} طلب تمديد للمراجعة`);
    if (parts.length === 0) return "الحوكمة في حالة مستقرة — لا توجد أمور عاجلة تتطلب تدخلاً الآن.";
    return `${parts.join("، ")} يتطلب انتباهك.`;
  }, [overdueActions, decisions, actions]);

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="space-y-6">
      {/* Hero: Governance Pulse */}
      <div className="raqeem-card p-6 bg-gradient-to-l from-primary/5 via-card to-card">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <PulseRing percent={governanceRate} />
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Building2 className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                {institution ? `${institution.name_ar} · ${institution.name_en}` : "المجلس الأعلى للحوكمة"}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-foreground">{roleLabel.ar} · {roleLabel.en}</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                <RoleIcon className="w-3 h-3" /> {roleLabel.en}
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>{briefing}</span>
            </div>
            <div className="text-xs text-muted-foreground">{today}</div>
          </div>
        </div>
      </div>

      {/* Mini stats — only 3 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="raqeem-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
          <div>
            <div className="text-xl font-bold text-foreground">{activeCommittees.length}</div>
            <div className="text-xs text-muted-foreground">لجنة نشطة</div>
          </div>
        </div>
        <div className="raqeem-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><Gavel className="w-4 h-4 text-emerald-600" /></div>
          <div>
            <div className="text-xl font-bold text-foreground">{approvedDecisions.length}</div>
            <div className="text-xs text-muted-foreground">قرار معتمد</div>
          </div>
        </div>
        <div className="raqeem-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle className="w-4 h-4 text-destructive" /></div>
          <div>
            <div className="text-xl font-bold text-destructive">{overdueActions.length}</div>
            <div className="text-xs text-muted-foreground">إجراء متأخر</div>
          </div>
        </div>
      </div>

      {/* Attention stream */}
      <div className="raqeem-card p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">يحتاج انتباهك الآن · Priority Attention</h2>
          </div>
          {attention.length > 0 && <span className="text-xs text-muted-foreground">{attention.length} عناصر</span>}
        </div>
        {attention.length === 0 ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> كل شيء يسير وفق الجدول — لا توجد أمور عاجلة
          </div>
        ) : (
          <div>
            {attention.map((it, i) => (
              <AttentionRow key={i} {...it} />
            ))}
          </div>
        )}
      </div>

      {/* Quick navigation */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">تنقّل سريع · Quick Access</h2>
        <QuickNav />
      </div>
    </div>
  );
}