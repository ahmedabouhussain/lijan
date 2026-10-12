import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Users, Search, Building2, Calendar, Loader2, Globe, Bot } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { Image } from "@/components/ui/image";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LanguageSwitcher from "@/components/raqeem/LanguageSwitcher";
import PoweredByConnection from "@/components/brand/PoweredByConnection";

const COMMITTEE_TYPE_LABELS = {
  permanent_council: { ar: "مجلس دائم", en: "Permanent Council" },
  permanent_committee: { ar: "لجنة دائمة", en: "Permanent Committee" },
  temporary_committee: { ar: "لجنة مؤقتة", en: "Temporary Committee" },
  ministerial_committee: { ar: "لجنة وزارية", en: "Ministerial Committee" },
  national_committee: { ar: "لجنة وطنية", en: "National Committee" },
  task_force: { ar: "فريق عمل", en: "Task Force" },
  working_group: { ar: "مجموعة عمل", en: "Working Group" },
  advisory_committee: { ar: "لجنة استشارية", en: "Advisory Committee" },
  special_committee: { ar: "لجنة خاصة", en: "Special Committee" },
  joint_committee: { ar: "لجنة مشتركة", en: "Joint Committee" },
  cross_institutional: { ar: "بين الجهات", en: "Cross-Institutional" },
};

const CADENCE_LABELS = {
  weekly: { ar: "أسبوعي", en: "Weekly" },
  biweekly: { ar: "كل أسبوعين", en: "Biweekly" },
  monthly: { ar: "شهري", en: "Monthly" },
  quarterly: { ar: "ربع سنوي", en: "Quarterly" },
  ad_hoc: { ar: "حسب الطلب", en: "Ad hoc" },
};

export default function PublicCommittees() {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const [committees, setCommittees] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");

  useEffect(() => {
    loadPublicCommittees();
  }, []);

  useEffect(() => {
    document.title = isAr ? "السجل العمومي للجان | لِجان" : "Public Committees Registry | LIJAN";
  }, [isAr]);

  const loadPublicCommittees = async () => {
    setLoading(true);
    setError(false);
    try {
      const all = await base44.entities.Committee.filter(
        { classification: "public", status: "active" },
        "-created_date",
        200
      );
      setCommittees(all || []);
      const orgIds = [...new Set((all || []).map((c) => c.organization_id).filter(Boolean))];
      if (orgIds.length > 0) {
        const orgData = await base44.entities.Organization.list("-created_date", 200);
        setOrgs((orgData || []).filter((o) => orgIds.includes(o.id)));
      }
    } catch (e) {
      console.error("Failed to load public committees", e);
      setError(true);
    }
    setLoading(false);
  };

  const filtered = committees.filter((c) => {
    if (orgFilter !== "all" && c.organization_id !== orgFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.name_ar || "").toLowerCase().includes(q) ||
      (c.name_en || "").toLowerCase().includes(q) ||
      (c.mandate || "").toLowerCase().includes(q)
    );
  });

  const orgMap = Object.fromEntries(orgs.map((o) => [o.id, o]));
  const getOrgName = (orgId) => {
    const org = orgMap[orgId];
    if (!org) return "—";
    return isAr ? org.name_ar : org.name_en;
  };

  return (
    <div className="min-h-app bg-background flex flex-col" dir={dir}>
      <header className="border-b border-border bg-card sticky top-[env(safe-area-inset-top)] z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate("/")}
            aria-label={isAr ? "العودة للرئيسية" : "Back to home"}
            className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary hover:bg-secondary/50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
          >
            {isAr ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            <span className="hidden sm:inline">{isAr ? "الرئيسية" : "Home"}</span>
          </button>
          <div className="h-9 w-28 overflow-hidden shrink-0">
            <Image
              src="https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/8c4576066_image.png"
              alt="LIJAN™"
              fittingType="fit"
              className="w-full h-full"
            />
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-primary/10">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                {isAr ? "السجل العمومي للجان" : "Public Committees Registry"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {isAr
                  ? "تصفّح اللجان النشطة المعلنة من الجهات المؤسسية"
                  : "Browse active public committees from institutions"}
              </p>
            </div>
            <button
              onClick={() => navigate("/ai-register")}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark hover:bg-primary/5 px-3 py-1.5 rounded-md border border-primary/20 font-medium transition-colors shrink-0"
            >
              <Bot className="w-4 h-4" />
              {isAr ? "سجل الذكاء" : "AI Register"}
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isAr ? "بحث بالاسم أو الصلاحية..." : "Search by name or mandate..."}
                aria-label={isAr ? "بحث" : "Search"}
                className="pl-9 rtl:pl-0 rtl:pr-9"
              />
            </div>
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              aria-label={isAr ? "تصفية حسب الجهة" : "Filter by organization"}
              className="px-3 py-2 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">{isAr ? "كل الجهات" : "All organizations"}</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {isAr ? o.name_ar : o.name_en}
                </option>
              ))}
            </select>
          </div>

          {!loading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              {isAr ? `${filtered.length} لجنة` : `${filtered.length} committees`}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-destructive/40 mx-auto mb-3" />
              <p className="text-sm text-destructive">
                {isAr ? "تعذّر تحميل اللجان. حاول مرة أخرى." : "Failed to load committees. Try again."}
              </p>
              <button
                onClick={loadPublicCommittees}
                className="mt-3 text-sm text-primary hover:underline font-medium"
              >
                {isAr ? "إعادة المحاولة" : "Retry"}
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {isAr ? "لا توجد لجان عمومية مسجّلة حالياً" : "No public committees registered yet"}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((c) => {
                const typeLabel = COMMITTEE_TYPE_LABELS[c.type] || { ar: c.type, en: c.type };
                return (
                  <div key={c.id} className="raqeem-card p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <h3 className="text-sm font-semibold text-foreground leading-snug">
                        {isAr ? c.name_ar : c.name_en}
                      </h3>
                      <StatusBadge
                        label={isAr ? typeLabel.ar : typeLabel.en}
                        colorClass="text-primary bg-primary/10"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{getOrgName(c.organization_id)}</span>
                    </div>
                    {c.mandate && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-3">
                        {c.mandate}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground pt-3 border-t border-border">
                      {c.meeting_cadence && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {CADENCE_LABELS[c.meeting_cadence]?.[lang] || c.meeting_cadence}
                        </span>
                      )}
                      {c.chair_name && (
                        <span className="truncate">{isAr ? "الرئيس" : "Chair"}: {c.chair_name}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <PoweredByConnection variant="dark" />
          </div>
        </div>
      </main>
    </div>
  );
}