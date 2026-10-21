import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Activity, LogIn, Search, ShieldAlert, Sparkles, Users, Eye, Clock, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { Image } from "@/components/ui/image";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/raqeem/StatusBadge";
import PoweredByConnection from "@/components/brand/PoweredByConnection";

export default function ActivityLog() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const [tab, setTab] = useState("logins"); // "logins" | "demos"
  const [loginEvents, setLoginEvents] = useState([]);
  const [demoEvents, setDemoEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") return;
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const [logins, demos] = await Promise.all([
        base44.entities.AuditEvent.filter({ action: "login" }, "-created_date", 200),
        base44.entities.AuditEvent.filter({ action: "demo_explore" }, "-created_date", 200),
      ]);
      setLoginEvents(logins || []);
      setDemoEvents(demos || []);
    } catch (e) {
      console.error("Failed to load activity log", e);
    }
    setLoading(false);
  };

  // Non-admin guard
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-app bg-background flex items-center justify-center" dir={dir}>
        <div className="text-center space-y-3">
          <ShieldAlert className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">
            {isAr ? "هذه الصفحة مخصصة لمديري المنصة فقط" : "This page is restricted to platform administrators"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-primary hover:underline font-medium"
          >
            {isAr ? "العودة للرئيسية" : "Back to Home"}
          </button>
        </div>
      </div>
    );
  }

  const uniqueLoginUsers = new Set(loginEvents.map((e) => e.actor_email).filter((e) => e && e !== "anonymous@visitor")).size;
  const anonymousDemos = demoEvents.filter((e) => !e.actor_user_id || e.actor_user_id === "anonymous").length;
  // Explorations performed by an identified user, as distinct from anonymous visitors.
  const authenticatedDemos = demoEvents.length - anonymousDemos;

  const activeEvents = tab === "logins" ? loginEvents : demoEvents;
  const filtered = activeEvents.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.actor_name || "").toLowerCase().includes(q) ||
      (e.actor_email || "").toLowerCase().includes(q) ||
      (e.action || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-app bg-background flex flex-col" dir={dir}>
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-[env(safe-area-inset-top)] z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAr ? "رجوع" : "Back"}</span>
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
              <h1 className="ui-title text-foreground">
                {isAr ? "لوحة تحكم مدير النظام" : "System Admin Dashboard"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isAr ? "تتبع من سجّل الدخول ومن استكشف التجربة" : "Track who logged in and who explored the demo"}
              </p>
            </div>
          </div>

          {/* Link to Audit Trail */}
          <button
            onClick={() => navigate("/audit-trail")}
            className="w-full mb-6 inline-flex items-center justify-center gap-2 border border-accent/40 text-accent px-4 py-2.5 rounded-md text-sm font-medium hover:bg-accent/10 transition-colors"
          >
            <FileText className="w-4 h-4" />
            {isAr ? "سجل العمليات التفصيلي — كل تغيير على المستندات والقرارات" : "Detailed Operations Log — Every document & decision change"}
          </button>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard
              icon={<LogIn className="w-4 h-4" />}
              value={loginEvents.length}
              label={isAr ? "إجمالي عمليات الدخول" : "Total Logins"}
              color="emerald"
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              value={uniqueLoginUsers}
              label={isAr ? "مستخدمون فريدون" : "Unique Users"}
              color="primary"
            />
            <StatCard
              icon={<Sparkles className="w-4 h-4" />}
              value={demoEvents.length}
              label={isAr ? "استكشافات التجربة" : "Demo Explorations"}
              color="accent"
            />
            <StatCard
              icon={<Eye className="w-4 h-4" />}
              value={anonymousDemos}
              label={isAr ? "زوار مجهولون" : "Anonymous Visitors"}
              color="muted"
            />
            <StatCard
              icon={<Sparkles className="w-4 h-4" />}
              value={authenticatedDemos}
              label={isAr ? "مستكشفون موثّقون" : "Authenticated Explorers"}
              color="emerald"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border">
            <TabButton
              active={tab === "logins"}
              onClick={() => setTab("logins")}
              icon={<LogIn className="w-4 h-4" />}
              label={isAr ? "سجل الدخول" : "Login Log"}
              count={loginEvents.length}
            />
            <TabButton
              active={tab === "demos"}
              onClick={() => setTab("demos")}
              icon={<Sparkles className="w-4 h-4" />}
              label={isAr ? "استكشاف التجربة" : "Demo Explorations"}
              count={demoEvents.length}
            />
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAr ? "بحث بالاسم أو البريد..." : "Search by name or email..."}
              className="pl-9"
            />
          </div>

          {/* Log Table */}
          <div className="raqeem-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">
                {tab === "logins"
                  ? isAr ? "أحداث الدخول" : "Login Events"
                  : isAr ? "جلسات استكشاف التجربة" : "Demo Exploration Sessions"}
                <span className="text-muted-foreground font-normal"> ({filtered.length})</span>
              </h3>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {isAr ? "جارٍ التحميل…" : "Loading…"}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {isAr ? "لا توجد أحداث مسجّلة" : "No events recorded"}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map((e) => {
                  const isLogin = e.action === "login";
                  const isAnonymous = !e.actor_user_id || e.actor_user_id === "anonymous";
                  return (
                    <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                        isLogin ? "bg-emerald-50" : "bg-accent/10"
                      }`}>
                        {isLogin
                          ? <LogIn className="w-4 h-4 text-emerald-600" />
                          : <Sparkles className="w-4 h-4 text-accent" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">
                            {e.actor_name || (isAr ? "— بدون اسم —" : "— No name —")}
                          </span>
                          {isLogin ? (
                            <StatusBadge
                              label={isAr ? "دخول" : "Login"}
                              colorClass="text-emerald-700 bg-emerald-50"
                            />
                          ) : (
                            <StatusBadge
                              label={isAr ? "استكشاف" : "Demo"}
                              colorClass="text-accent bg-accent/10"
                            />
                          )}
                          {!isLogin && isAnonymous && (
                            <StatusBadge
                              label={isAr ? "زائر" : "Visitor"}
                              colorClass="text-muted-foreground bg-secondary"
                            />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate" dir="ltr">
                          {e.actor_email || "—"}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-left shrink-0 flex items-center gap-1" dir="ltr">
                        <Clock className="w-3 h-3" />
                        {e.created_date ? new Date(e.created_date).toLocaleString(isAr ? "ar-QA" : "en-GB", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : "—"}
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

function TabButton({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? "bg-primary/10" : "bg-secondary"}`}>
        {count}
      </span>
    </button>
  );
}