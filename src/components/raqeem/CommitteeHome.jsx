import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Gavel, Calendar, FileText, Users, CheckSquare, AlertTriangle, ChevronLeft } from "lucide-react";
import { MEETING_STATUS, DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";

const ROLE_ICONS = {
  chair: Gavel,
  vice_chair: Gavel,
  secretary: FileText,
  member: Users,
  observer: Users,
  advisor: Users,
};

const ROLE_LABELS = {
  chair: { ar: "رئيس اللجنة", en: "Chair" },
  vice_chair: { ar: "نائب الرئيس", en: "Vice Chair" },
  secretary: { ar: "أمين السر", en: "Secretary" },
  member: { ar: "عضو", en: "Member" },
  observer: { ar: "مراقب", en: "Observer" },
  advisor: { ar: "مستشار", en: "Advisor" },
};

export default function CommitteeHome({ committee, members, meetings, decisions, actions, minutes }) {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const myRole = useMemo(() => {
    if (!currentUser) return "member";
    const memberRecord = members.find(
      (m) => m.email && currentUser.email && m.email.toLowerCase() === currentUser.email.toLowerCase()
    );
    if (memberRecord) return memberRecord.role;
    if (committee.chair_name && currentUser.full_name === committee.chair_name) return "chair";
    if (committee.secretary_name && currentUser.full_name === committee.secretary_name) return "secretary";
    if (currentUser.role === "admin") return "chair";
    return "member";
  }, [currentUser, members, committee]);

  const governanceScore = useMemo(() => {
    let score = 0;
    if (committee.mandate) score += 20;
    if (committee.chair_name) score += 15;
    if (committee.secretary_name) score += 15;
    if (members.length >= (committee.quorum_count || 3)) score += 20;
    if (meetings.length > 0) score += 15;
    if (decisions.length > 0) score += 15;
    return Math.min(score, 100);
  }, [committee, members, meetings, decisions]);

  const pulseColor = governanceScore >= 75 ? "#0f7a5f" : governanceScore >= 50 ? "#b59a5b" : "#8A1538";
  const r = 42;
  const c = 2 * Math.PI * r;

  const priorityItems = useMemo(() => {
    const items = [];

    if (myRole === "chair" || myRole === "vice_chair") {
      decisions
        .filter((d) => ["in_review", "proposed", "voting"].includes(d.status))
        .forEach((d) => {
          items.push({
            urgency: d.status === "voting" ? "high" : "normal",
            icon: Gavel,
            title: d.title,
            subtitle: `قرار ${DECISION_STATUS[d.status]?.ar || d.status}`,
            to: `/decisions/${d.id}`,
            badge: <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />,
          });
        });
    }

    if (myRole === "secretary") {
      meetings
        .filter((m) => m.status === "completed" && !minutes.some((min) => min.meeting_id === m.id))
        .forEach((m) => {
          items.push({
            urgency: "high",
            icon: FileText,
            title: m.title || m.title_ar,
            subtitle: "اجتماع مكتمل — محضر غير منشأ",
            to: `/meetings/${m.id}`,
            badge: <StatusBadge label="بدون محضر" colorClass="text-amber-700 bg-amber-50" />,
          });
        });
      minutes
        .filter((min) => min.status === "draft" || min.status === "in_review")
        .forEach((min) => {
          items.push({
            urgency: "high",
            icon: FileText,
            title: `محضر رقم ${min.minutes_number || "—"}`,
            subtitle: "بانتظار المراجعة أو الاعتماد",
            to: `/meetings/${min.meeting_id}`,
            badge: <StatusBadge label={min.status === "draft" ? "مسودة" : "للمراجعة"} colorClass="text-purple-700 bg-purple-50" />,
          });
        });
    }

    const now = new Date();
    meetings
      .filter((m) => new Date(m.date) >= now && m.status === "scheduled")
      .forEach((m) => {
        const days = Math.ceil((new Date(m.date) - now) / 86400000);
        if (days <= 14) {
          items.push({
            urgency: days <= 2 ? "high" : "normal",
            icon: Calendar,
            title: m.title || m.title_ar,
            subtitle: `${formatDate(m.date)} · ${days === 0 ? "اليوم" : `بعد ${days} يوم`}`,
            to: `/meetings/${m.id}`,
            badge: <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />,
          });
        }
      });

    actions
      .filter((a) => isOverdue(a.deadline) && a.status !== "closed" && a.status !== "verified")
      .forEach((a) => {
        items.push({
          urgency: "critical",
          icon: AlertTriangle,
          title: a.title,
          subtitle: `${a.owner_name || "—"} · متأخر`,
          to: "/execution",
          badge: <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />,
        });
      });

    return items.slice(0, 6);
  }, [myRole, decisions, meetings, minutes, actions]);

  const RoleIcon = ROLE_ICONS[myRole] || Users;
  const roleLabel = ROLE_LABELS[myRole] || ROLE_LABELS.member;

  const stats = [
    { icon: Users, label: "أعضاء", count: members.length, color: "text-primary bg-primary/10" },
    { icon: Calendar, label: "اجتماعات", count: meetings.length, color: "text-blue-700 bg-blue-50" },
    { icon: Gavel, label: "قرارات", count: decisions.length, color: "text-emerald-700 bg-emerald-50" },
    { icon: CheckSquare, label: "إجراءات", count: actions.length, color: "text-amber-700 bg-amber-50" },
  ];

  const roleBadgeClass =
    myRole === "chair"
      ? "bg-primary text-primary-foreground"
      : myRole === "secretary"
      ? "bg-accent text-accent-foreground"
      : myRole === "vice_chair"
      ? "bg-primary/80 text-primary-foreground"
      : "bg-secondary text-secondary-foreground";

  return (
    <div className="space-y-4">
      {/* Committee Home Header */}
      <div className="raqeem-card p-6 bg-gradient-to-l from-primary/5 via-card to-card">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={pulseColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c - (governanceScore / 100) * c}
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-foreground">{governanceScore}%</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider">اكتمال</span>
            </div>
          </div>

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground truncate">{committee.name_ar || committee.name_en}</h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ${roleBadgeClass}`}>
                <RoleIcon className="w-3 h-3" /> {roleLabel.ar} · {roleLabel.en}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{committee.name_en}</p>
            {committee.mandate && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{committee.mandate}</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="raqeem-card p-3 flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-bold text-foreground">{s.count}</div>
                <div className="text-[11px] text-muted-foreground truncate">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Role-based priorities */}
      {priorityItems.length > 0 && (
        <div className="raqeem-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">أولوياتك في هذه اللجنة · Your Priorities</h2>
            </div>
            <span className="text-xs text-muted-foreground">{priorityItems.length} عناصر</span>
          </div>
          <div className="divide-y divide-border">
            {priorityItems.map((it, i) => (
              <Link
                key={i}
                to={it.to}
                className="group flex items-center gap-3 py-2.5 hover:bg-secondary/40 -mx-2 px-2 rounded-md transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    it.urgency === "critical"
                      ? "bg-red-50 text-destructive"
                      : it.urgency === "high"
                      ? "bg-amber-50 text-amber-600"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  <it.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{it.title}</div>
                  {it.subtitle && <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>}
                </div>
                {it.badge}
                <ChevronLeft className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}