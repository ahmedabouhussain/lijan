import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Activity, LogIn, Search, ShieldAlert } from "lucide-react";
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
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (user && user.role !== "admin") return;
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const [logins, logouts] = await Promise.all([
        base44.entities.AuditEvent.filter({ action: "login" }, "-created_date", 200),
        base44.entities.AuditEvent.filter({ action: "logout" }, "-created_date", 200),
      ]);
      const merged = [...(logins || []), ...(logouts || [])].sort(
        (a, b) => new Date(b.created_date) - new Date(a.created_date)
      );
      setEvents(merged);
    } catch (e) {
      console.error("Failed to load activity log", e);
    }
    setLoading(false);
  };

  // Non-admin guard
  if (user && user.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={dir}>
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

  const filtered = events.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.actor_name || "").toLowerCase().includes(q) ||
      (e.actor_email || "").toLowerCase().includes(q) ||
      (e.action || "").toLowerCase().includes(q)
    );
  });

  const loginCount = events.filter((e) => e.action === "login").length;
  const uniqueUsers = new Set(events.filter((e) => e.action === "login").map((e) => e.actor_email).filter(Boolean)).size;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={dir}>
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-30">
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
              <Activity className="w-5.5 h-5.5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {isAr ? "سجل النشاط" : "Activity Log"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isAr ? "من سجّل الدخول ومتى" : "Who logged in and when"}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="raqeem-card p-4">
              <div className="text-2xl font-bold text-foreground">{loginCount}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "إجمالي عمليات الدخول" : "Total Login Events"}
              </div>
            </div>
            <div className="raqeem-card p-4">
              <div className="text-2xl font-bold text-foreground">{uniqueUsers}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {isAr ? "مستخدمون فريدون" : "Unique Users"}
              </div>
            </div>
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
                {isAr ? "أحداث الدخول والخروج" : "Login & Logout Events"}
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
                  return (
                    <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                        isLogin ? "bg-emerald-50" : "bg-secondary"
                      }`}>
                        <LogIn className={`w-4 h-4 ${isLogin ? "text-emerald-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">
                            {e.actor_name || (isAr ? "— بدون اسم —" : "— No name —")}
                          </span>
                          <StatusBadge
                            label={isLogin ? (isAr ? "دخول" : "Login") : (isAr ? "خروج" : "Logout")}
                            colorClass={isLogin ? "text-emerald-700 bg-emerald-50" : "text-muted-foreground bg-secondary"}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground truncate" dir="ltr">
                          {e.actor_email || "—"}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground text-left shrink-0" dir="ltr">
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