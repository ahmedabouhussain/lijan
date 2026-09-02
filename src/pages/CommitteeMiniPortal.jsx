import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ChevronLeft, Users, Calendar, Gavel, CheckSquare, FileText, AlertTriangle,
  ShieldCheck, Clock, Building2, Network, GitCompare, Sparkles, Archive, Settings,
  Lock, UserCircle,
} from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS, COMMITTEE_TYPES, MEMBER_ROLE, MEETING_STATUS, DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

const ROLE_ORDER = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };

const REGISTER_TABS = [
  { key: "members", label: "الأعضاء", icon: Users },
  { key: "meetings", label: "الاجتماعات", icon: Calendar },
  { key: "agenda", label: "جدول الأعمال", icon: FileText, deferred: true },
  { key: "documents", label: "المستندات", icon: FileText, deferred: true },
  { key: "minutes", label: "المحاضر", icon: FileText },
  { key: "decisions", label: "القرارات", icon: Gavel },
  { key: "actions", label: "الإجراءات", icon: CheckSquare },
  { key: "risks", label: "المخاطر والتبعيات", icon: Network, deferred: true },
  { key: "reports", label: "التقارير", icon: GitCompare, deferred: true },
  { key: "audit", label: "التدقيق", icon: ShieldCheck, deferred: true },
  { key: "settings", label: "الإعدادات", icon: Settings, deferred: true },
];

export default function CommitteeMiniPortal() {
  const { orgRef, committeeRef } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const publicId = committeeRef?.split("--").pop() || committeeRef;

  useEffect(() => {
    if (!publicId) return;
    load();
  }, [publicId]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetCommitteeMiniPortal", { public_id: publicId });
      const d = res.data || res;
      if (d.error) {
        setError(d.error);
      } else {
        setData(d);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر تحميل اللجنة");
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 space-y-3">
        <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Link to={`/o/${orgRef}`} className="text-primary hover:underline text-sm">العودة للبوابة</Link>
      </div>
    );
  }

  if (!data) return <TableSkeleton rows={4} />;

  const { committee, mandate, my_role, is_oversight, is_recused, members, meetings, registers, counters } = data;
  const orgRef2 = orgRef;

  // Governance readiness
  const readinessChecks = [
    { label: "الصلاحية", ready: !!(mandate || committee.mandate) },
    { label: "الرئيس", ready: !!committee.chair_name },
    { label: "الأمين", ready: !!committee.secretary_name },
    { label: "النصاب", ready: !!committee.quorum_count },
    { label: "قاعدة التصويت", ready: !!committee.voting_rule },
    { label: "تواريخ المدة", ready: !!(committee.term_start && committee.term_end) },
  ];
  const readinessScore = Math.round((readinessChecks.filter((c) => c.ready).length / readinessChecks.length) * 100);

  const overdueActions = (registers.actions || []).filter((a) => isOverdue(a.deadline) && a.status !== "closed");

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to={`/o/${orgRef2}`} className="hover:text-foreground">المنظمة</Link>
        <ChevronLeft className="w-4 h-4" />
        <span className="text-foreground truncate">{committee.name_ar || committee.name_en}</span>
      </div>

      {/* Committee Identity Header */}
      <div className="raqeem-card p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={readinessScore >= 100 ? "#0f7a5f" : "#b59a5b"} strokeWidth="6" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 - (readinessScore / 100) * 2 * Math.PI * 42}
                style={{ transition: "stroke-dashoffset 1s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-foreground">{readinessScore}%</span>
              <span className="text-[8px] text-muted-foreground uppercase">جاهزية</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground truncate">{committee.name_ar || committee.name_en}</h1>
              <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                <UserCircle className="w-3 h-3" />
                {is_oversight ? "إشراف قراءة فقط" : MEMBER_ROLE[my_role]?.ar || my_role}
              </span>
              {is_recused && <StatusBadge label="متتنحّ" colorClass="bg-red-50 text-red-700" />}
            </div>
            <p className="text-sm text-muted-foreground">{committee.name_en}</p>
            {committee.mandate && <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{committee.mandate}</p>}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
              <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> {committee.appointing_authority || committee.establishing_authority || "—"}</span>
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(committee.term_start)} — {formatDate(committee.term_end)}</span>
            </div>
          </div>
        </div>

        {/* Readiness checks */}
        {committee.status === "draft" && (
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 md:grid-cols-6 gap-2">
            {readinessChecks.map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 text-xs">
                {c.ready ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
                <span className={c.ready ? "text-foreground" : "text-amber-700"}>{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: Users, label: "أعضاء", count: counters.members, color: "text-primary bg-primary/10" },
          { icon: Calendar, label: "اجتماعات", count: counters.meetings, color: "text-blue-700 bg-blue-50" },
          { icon: Gavel, label: "قرارات", count: counters.decisions, color: "text-emerald-700 bg-emerald-50" },
          { icon: CheckSquare, label: "إجراءات", count: counters.actions, color: "text-amber-700 bg-amber-50" },
          { icon: AlertTriangle, label: "متأخرة", count: overdueActions.length, color: "text-red-700 bg-red-50" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="raqeem-card p-3 flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-bold text-foreground">{s.count}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Register Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          نظرة عامة
        </button>
        {REGISTER_TABS.map((tab) => (
          <button
            key={tab.key}
          onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {/* Upcoming meetings */}
          <div className="raqeem-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> الاجتماعات القادمة · Upcoming Meetings
            </h3>
            {meetings.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد اجتماعات قادمة مجدولة</p>
            ) : (
              <div className="space-y-2">
                {meetings.upcoming.slice(0, 5).map((m) => (
                  <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{m.title || m.title_ar}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.mode}</div>
                    </div>
                    <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="raqeem-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> الأعضاء · Members
            </h3>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد أعضاء مسجلون بعد</p>
            ) : (
              <div className="space-y-1.5">
                {members.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{m.full_name}</div>
                      <div className="text-xs text-muted-foreground">{m.institution_name || "—"}</div>
                    </div>
                    <StatusBadge label={MEMBER_ROLE[m.role]?.ar || m.role} colorClass={MEMBER_ROLE[m.role]?.color} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent decisions */}
          <div className="raqeem-card p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Gavel className="w-4 h-4 text-primary" /> أحدث القرارات · Recent Decisions
            </h3>
            {registers.decisions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد قرارات — ستظهر القرارات بعد الإصدار</p>
            ) : (
              <div className="space-y-2">
                {registers.decisions.slice(0, 5).map((d) => (
                  <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                      {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                    </div>
                    <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "members" && (
        <div className="raqeem-card p-5">
          <h3 className="text-sm font-semibold mb-3">الأعضاء · Members ({members.length})</h3>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا يوجد أعضاء</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{m.full_name}</div>
                    <div className="text-xs text-muted-foreground">{m.institution_name || "—"} · {m.user_email || ""}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "alternate" && !m.activated && <StatusBadge label="بديل غير مفعّل" colorClass="bg-secondary text-muted-foreground" />}
                    <StatusBadge label={MEMBER_ROLE[m.role]?.ar || m.role} colorClass={MEMBER_ROLE[m.role]?.color} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "meetings" && (
        <div className="space-y-4">
          <div className="raqeem-card p-5">
            <h3 className="text-sm font-semibold mb-3">القادمة · Upcoming ({meetings.upcoming.length})</h3>
            {meetings.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد اجتماعات قادمة</p>
            ) : (
              <div className="space-y-2">
                {meetings.upcoming.map((m) => (
                  <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                    <div><div className="text-sm font-medium">{m.title || m.title_ar}</div><div className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.mode}</div></div>
                    <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="raqeem-card p-5">
            <h3 className="text-sm font-semibold mb-3">السابقة · Previous ({meetings.previous.length})</h3>
            {meetings.previous.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد اجتماعات سابقة</p>
            ) : (
              <div className="space-y-2">
                {meetings.previous.map((m) => (
                  <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                    <div><div className="text-sm font-medium">{m.title || m.title_ar}</div><div className="text-xs text-muted-foreground">{formatDate(m.date)}</div></div>
                    <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "decisions" && (
        <div className="raqeem-card p-5">
          <h3 className="text-sm font-semibold mb-3">القرارات · Decisions ({registers.decisions.length})</h3>
          {registers.decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد قرارات</p>
          ) : (
            <div className="space-y-2">
              {registers.decisions.map((d) => (
                <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                  <div><div className="text-sm font-medium">{d.title}</div>{d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}</div>
                  <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "actions" && (
        <div className="raqeem-card p-5">
          <h3 className="text-sm font-semibold mb-3">الإجراءات · Actions ({registers.actions.length})</h3>
          {registers.actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد إجراءات</p>
          ) : (
            <div className="space-y-2">
              {registers.actions.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div><div className="text-sm font-medium">{a.title}</div><div className="text-xs text-muted-foreground">{a.owner_name} · {formatDate(a.deadline)}</div></div>
                  <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "minutes" && (
        <div className="raqeem-card p-5">
          <h3 className="text-sm font-semibold mb-3">المحاضر · Minutes ({registers.minutes.length})</h3>
          {registers.minutes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد محاضر</p>
          ) : (
            <div className="space-y-2">
              {registers.minutes.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div><div className="text-sm font-medium">محضر {m.minutes_number || "—"}</div><div className="text-xs text-muted-foreground">{m.drafted_by_name || "—"}</div></div>
                  <StatusBadge label={m.status === "draft" ? "مسودة" : m.status === "approved" ? "معتمد" : m.status === "issued" ? "صادر" : m.status} colorClass="bg-secondary text-muted-foreground" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Deferred registers */}
      {REGISTER_TABS.find((t) => t.key === activeTab && t.deferred) && (
        <div className="raqeem-card p-8 text-center">
          <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">مجدول للبوابة التنفيذية القادمة</p>
          <p className="text-xs text-muted-foreground mt-1">Scheduled for the next execution gate</p>
        </div>
      )}
    </div>
  );
}