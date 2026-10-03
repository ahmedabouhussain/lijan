import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, Gavel, ChevronLeft, Plus, Loader2,
  ShieldCheck, Crown, Pen, User, AlertCircle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import BrandLogo from "@/components/raqeem/BrandLogo";
import BrandWordmark from "@/components/brand/BrandWordmark";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import { BRAND } from "@/lib/brand";
import { COMMITTEE_STATUS, COMMITTEE_TYPES } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { WorkspaceSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { cn } from "@/lib/utils";

const ROLE_ICONS = {
  chair: Crown,
  vice_chair: Crown,
  secretary: Pen,
  committee_administrator: ShieldCheck,
  member: User,
  observer: User,
  advisor: User,
  alternate: User,
};

const ROLE_LABELS = {
  chair: { ar: "رئيس", en: "Chair" },
  vice_chair: { ar: "نائب الرئيس", en: "Vice Chair" },
  secretary: { ar: "أمين", en: "Secretary" },
  committee_administrator: { ar: "مدير اللجنة", en: "Committee Admin" },
  member: { ar: "عضو", en: "Member" },
  observer: { ar: "مراقب", en: "Observer" },
  advisor: { ar: "مستشار", en: "Advisor" },
  alternate: { ar: "بديل", en: "Alternate" },
  owner: { ar: "مالك", en: "Owner" },
  admin: { ar: "مدير", en: "Admin" },
  committee_member: { ar: "عضو لجنة", en: "Committee Member" },
};

export default function UnifiedWorkspace() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDemoMode, effectiveActor } = useEffectiveActor();
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const res = await base44.functions.invoke("GetMyOrganizations", { demo_mode: isDemoMode });
        if (stale) return;
        const d = res.data || res;
        if (d.error) setError(d.error);
        else { setData(d); setError(null); }
      } catch (e) {
        if (stale) return;
        setError(e?.response?.data?.error || e?.message || "تعذّر التحميل");
      }
      if (!stale) setLoading(false);
    })();
    return () => { stale = true; };
  }, [isDemoMode]);

  if (loading) {
    return <WorkspaceSkeleton />;
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t("تعذّر تحميل البيانات", "Failed to load data")}
        description={error}
      />
    );
  }

  const { organizations, total_committees, user_profile } = data || { organizations: [], total_committees: 0, user_profile: null };

  // In demo mode, always use the demo persona's identity — never fall back to the real user.
  // This prevents identity mixing (e.g., showing the founder's name alongside the demo email).
  const displayName = isDemoMode
    ? (lang === "ar" ? effectiveActor?.data?.display_name_ar : effectiveActor?.data?.display_name_en) || t("فهد الفهيدي", "Fahad Al-Fihaidi")
    : (user_profile?.display_name_ar || user?.full_name || t("المستخدم", "User"));
  const displayJobTitle = isDemoMode
    ? (lang === "ar" ? effectiveActor?.data?.job_title_ar : effectiveActor?.data?.job_title_en)
    : (user_profile?.job_title_ar);
  const displayOrg = isDemoMode
    ? (lang === "ar" ? effectiveActor?.data?.primary_org_ar : effectiveActor?.data?.primary_org_en)
    : (user_profile?.primary_org_ar);

  if (organizations.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title={t("لم تتم إضافتك إلى أي منظمة بعد", "You haven't been added to any organization yet")}
        description={t("ابدأ بإنشاء بوابة منظمتك المؤسسية لإدارة المجالس واللجان.", "Start by creating your organization portal to manage councils and committees.")}
        action={
          <button
            onClick={() => navigate("/create-portal")}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t("إنشاء بوابة منظمة", "Create Organization Portal")}
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t("مرحبًا", "Welcome")}, {displayName}
          </h1>
          {displayJobTitle && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {displayJobTitle}
              {displayOrg && " — "}
              {displayOrg}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            {t(
              `تمثل ${organizations.length} جهات وتشارك في ${total_committees} لجان بأدوار ومسؤوليات مختلفة`,
              `Representing ${organizations.length} organizations · ${total_committees} committees with various roles`
            )}
          </p>
        </div>
        <button
          onClick={() => navigate("/create-portal")}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
        >
          <Plus className="w-4 h-4" />
          {t("بوابة منظمة جديدة", "New Organization")}
        </button>
      </div>

      {/* Organizations + Committees */}
      <div className="space-y-4">
        {organizations.map((org) => {
          const orgRef = org.slug ? `${org.slug}--${org.public_id}` : org.public_id;
          const orgRoleLabel = ROLE_LABELS[org.my_role]?.[lang] || org.my_role;
          const OrgRoleIcon = ROLE_ICONS[org.my_role] || User;

          return (
            <div key={org.id} className="raqeem-card overflow-hidden">
              {/* Org header */}
              <button
                onClick={() => navigate(`/o/${orgRef}`)}
                className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors text-right"
                dir={lang === "ar" ? "rtl" : "ltr"}
              >
                <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm font-semibold text-foreground truncate">{org.name_ar || org.name_en}</div>
                  <div className="text-xs text-muted-foreground truncate">{org.name_en}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {org.is_primary && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-medium border border-primary/20">
                      {t("جهتي الأساسية", "Primary Organization")}
                    </span>
                  )}
                   <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-secondary text-secondary-foreground">
                     <OrgRoleIcon className="w-3 h-3" />
                     {orgRoleLabel}
                   </span>
                  {org.status === "sandbox_active" && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-800">
                      {t("بيئة تجريبية", "Sandbox")}
                    </span>
                  )}
                  <ChevronLeft className={cn("w-4 h-4 text-muted-foreground", lang === "ar" ? "" : "rotate-180")} />
                </div>
              </button>

              {/* Committees under this org */}
              {org.committees && org.committees.length > 0 ? (
                <div className="border-t border-border">
                  <div className="px-4 py-2 bg-secondary/20 flex items-center gap-1.5">
                    <Gavel className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("لجاني في هذه المنظمة", "My Committees")} ({org.committees.length})
                    </span>
                  </div>
                  <div className="divide-y divide-border">
                    {org.committees.map((c) => {
                      const cRef = `${c.slug || c.id}--${c.public_id || c.id}`;
                      const cRoleLabel = ROLE_LABELS[c.my_role]?.[lang] || c.my_role;
                      const CRoleIcon = ROLE_ICONS[c.my_role] || User;
                      return (
                        <button
                          key={c.id}
                          onClick={() => navigate(`/o/${orgRef}/c/${cRef}`)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors text-right"
                          dir={lang === "ar" ? "rtl" : "ltr"}
                        >
                          <div className="w-8 h-8 rounded bg-accent/10 flex items-center justify-center shrink-0">
                            <Users className="w-4 h-4 text-accent" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className="text-sm font-medium text-foreground truncate">{c.name_ar || c.name_en}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {c.name_en} · {COMMITTEE_TYPES[c.type]?.[lang] || c.type}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/5 text-primary">
                              <CRoleIcon className="w-3 h-3" />
                              {cRoleLabel}
                            </span>
                            <StatusBadge
                              label={COMMITTEE_STATUS[c.status]?.[lang] || c.status}
                              colorClass={COMMITTEE_STATUS[c.status]?.color}
                            />
                            <ChevronLeft className={cn("w-4 h-4 text-muted-foreground", lang === "ar" ? "" : "rotate-180")} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="border-t border-border px-4 py-4 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-muted/50 flex items-center justify-center shrink-0">
                    <Users className="w-3.5 h-3.5 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">{t("لا توجد لجان لك في هذه المنظمة", "No committees assigned in this organization")}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {user?.role === "admin" && !isDemoMode && (
        <button
          onClick={() => navigate("/national-adoption-showcase")}
          className="w-full flex items-center gap-3 p-4 text-right raqeem-card-interactive"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <div className="w-10 h-10 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-semibold text-foreground">
              {t("عرض تبنّي اللجان الوطنية والأثر", "National Committee Adoption & Impact Showcase")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("سيناريو توضيحي للقيادات — لجنة تنمية الشركات الصغيرة والمتوسطة", "Executive demonstration scenario — SME Development Committee")}
            </div>
          </div>
          <ChevronLeft className={cn("w-4 h-4 text-muted-foreground shrink-0", lang === "ar" ? "" : "rotate-180")} />
        </button>
      )}

      <PoweredByConnection variant="dark" />
    </div>
  );
}