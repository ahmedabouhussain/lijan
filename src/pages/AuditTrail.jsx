import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, FileText, Gavel, CheckSquare, Building2,
  Calendar, Users, Vote as VoteIcon, PenTool, Activity, Clock,
  Search, ShieldAlert, ChevronRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { Image } from "@/components/ui/image";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/raqeem/StatusBadge";
import PoweredByConnection from "@/components/brand/PoweredByConnection";

const ENTITY_ICONS = {
  Decision: Gavel,
  Document: FileText,
  Action: CheckSquare,
  Committee: Building2,
  Meeting: Calendar,
  CommitteeMembership: Users,
  Vote: VoteIcon,
  Signature: PenTool,
};

const ENTITY_LABELS = {
  Decision: { ar: "قرار", en: "Decision" },
  Document: { ar: "مستند", en: "Document" },
  Action: { ar: "إجراء", en: "Action" },
  Committee: { ar: "لجنة", en: "Committee" },
  Meeting: { ar: "اجتماع", en: "Meeting" },
  CommitteeMembership: { ar: "عضوية", en: "Membership" },
  Vote: { ar: "تصويت", en: "Vote" },
  Signature: { ar: "توقيع", en: "Signature" },
};

const ACTION_LABELS = {
  create: { ar: "إنشاء", en: "Create", color: "text-emerald-700 bg-emerald-50" },
  update: { ar: "تحديث", en: "Update", color: "text-state-info-ink bg-state-info-surface" },
  delete: { ar: "حذف", en: "Delete", color: "text-destructive bg-destructive/10" },
  status_change: { ar: "تغيير حالة", en: "Status Change", color: "text-amber-700 bg-amber-50" },
  issue: { ar: "إصدار", en: "Issue", color: "text-primary bg-primary/10" },
  approve: { ar: "اعتماد", en: "Approve", color: "text-emerald-700 bg-emerald-50" },
  reject: { ar: "رفض", en: "Reject", color: "text-destructive bg-destructive/10" },
  sign: { ar: "توقيع", en: "Sign", color: "text-accent bg-accent/10" },
  vote: { ar: "تصويت", en: "Vote", color: "text-state-info-ink bg-state-info-surface" },
  close: { ar: "إغلاق", en: "Close", color: "text-muted-foreground bg-secondary" },
  escalate: { ar: "تصعيد", en: "Escalate", color: "text-orange-700 bg-orange-50" },
  activate: { ar: "تفعيل", en: "Activate", color: "text-emerald-700 bg-emerald-50" },
  suspend: { ar: "تعليق", en: "Suspend", color: "text-orange-700 bg-orange-50" },
};

function getActionLabel(action) {
  // Handle custom actions like "decision.issue", "action.progress"
  const baseAction = action?.split(".").pop() || action;
  return ACTION_LABELS[baseAction] || ACTION_LABELS[action] || { ar: action, en: action, color: "text-muted-foreground bg-secondary" };
}

export default function AuditTrail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  useEffect(() => {
    if (user && user.role !== "admin") return;
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.AuditEvent.filter({}, "-created_date", 500);
      // Exclude login and demo events (those are in ActivityLog)
      setEvents((all || []).filter((e) => e.action !== "login" && e.action !== "demo_explore"));
    } catch (e) {
      console.error("Failed to load audit trail", e);
    }
    setLoading(false);
  };

  if (user && user.role !== "admin") {
    return (
      <div className="min-h-app bg-background flex items-center justify-center" dir={dir}>
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">
            {isAr ? "هذه الصفحة مخصصة لمديري المنصة فقط" : "This page is restricted to platform administrators"}
          </p>
          <button onClick={() => navigate("/")} className="text-sm text-primary hover:underline font-medium">
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </button>
        </div>
      </div>
    );
  }

  const entityTypes = ["all", ...Array.from(new Set(events.map((e) => e.entity_type).filter(Boolean)))];

  const filtered = events.filter((e) => {
    if (entityFilter !== "all" && e.entity_type !== entityFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.entity_title || "").toLowerCase().includes(q) ||
      (e.description || "").toLowerCase().includes(q) ||
      (e.actor_name || "").toLowerCase().includes(q) ||
      (e.action || "").toLowerCase().includes(q)
    );
  });

  const docCount = events.filter((e) => e.entity_type === "Document").length;
  const decisionCount = events.filter((e) => e.entity_type === "Decision").length;
  const actionCount = events.filter((e) => e.entity_type === "Action").length;

  return (
    <div className="min-h-app bg-background flex flex-col" dir={dir}>
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-[env(safe-area-inset-top)] z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/activity-log")}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAr ? "لوحة المدير" : "Admin Dashboard"}</span>
          </button>
          <div className="h-9 w-28 overflow-hidden shrink-0">
            <Image
              src="https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/8c4576066_image.png"
              alt="LIJAN™"
              fittingType="fit"
              className="w-full h-full"
            />
          </div>
          <div className="w-20" />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/10">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {isAr ? "سجل العمليات التفصيلي" : "Detailed Operations Log"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "كل تغيير على مستندات اللجان والقرارات لتعزيز الشفافية والمساءلة"
                  : "Every change to committee documents and decisions for transparency and accountability"}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard icon={<Activity className="w-4 h-4" />} value={events.length} label={isAr ? "إجمالي العمليات" : "Total Events"} color="primary" />
            <StatCard icon={<FileText className="w-4 h-4" />} value={docCount} label={isAr ? "تغييرات المستندات" : "Document Changes"} color="accent" />
            <StatCard icon={<Gavel className="w-4 h-4" />} value={decisionCount} label={isAr ? "تغييرات القرارات" : "Decision Changes"} color="emerald" />
            <StatCard icon={<CheckSquare className="w-4 h-4" />} value={actionCount} label={isAr ? "تغييرات المهام" : "Action Changes"} color="muted" />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? "بحث بالعنوان أو الوصف أو الفاعل..." : "Search by title, description, or actor..."}
                className="pl-9"
              />
            </div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {entityTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all"
                    ? isAr ? "كل الأنواع" : "All Types"
                    : ENTITY_LABELS[type]?.[lang] || type}
                </option>
              ))}
            </select>
          </div>

          {/* Event List */}
          <div className="raqeem-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">
                {isAr ? "سجل التغييرات" : "Change Log"}
                <span className="text-muted-foreground font-normal"> ({filtered.length})</span>
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {isAr ? "جارٍ التحميل…" : "Loading…"}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {isAr ? "لا توجد عمليات مسجّلة" : "No events recorded"}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((e) => {
                  const Icon = ENTITY_ICONS[e.entity_type] || Activity;
                  const actionInfo = getActionLabel(e.action);
                  return (
                    <div key={e.id} className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-secondary/50">
                          <Icon className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <StatusBadge
                              label={ENTITY_LABELS[e.entity_type]?.[lang] || e.entity_type || "—"}
                              colorClass="text-primary bg-primary/10"
                            />
                            <StatusBadge
                              label={actionInfo[lang]}
                              colorClass={actionInfo.color}
                            />
                            {e.entity_title && (
                              <span className="text-sm font-medium text-foreground truncate">
                                {e.entity_title}
                              </span>
                            )}
                          </div>
                          {e.description && (
                            <p className="text-xs text-muted-foreground mb-1.5">{e.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{e.actor_name || e.actor_email || "—"}</span>
                            {e.old_value && e.new_value && (
                              <span className="flex items-center gap-1" dir="ltr">
                                <span className="line-through opacity-60">{e.old_value}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="font-medium">{e.new_value}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1" dir="ltr">
                              <Clock className="w-3 h-3" />
                              {e.created_date
                                ? new Date(e.created_date).toLocaleString(isAr ? "ar-QA" : "en-GB", {
                                    year: "numeric", month: "short", day: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                  })
                                : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <PoweredByConnection variant="dark" />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, value, label, color }) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-600",
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    muted: "bg-secondary text-muted-foreground",
  };
  return (
    <div className="raqeem-card p-4">
      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full mb-2 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}