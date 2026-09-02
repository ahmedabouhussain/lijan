import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, Gavel, ChevronLeft, Plus, Loader2,
  ShieldCheck, Crown, Pen, User, AlertCircle,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import BrandLogo from "@/components/raqeem/BrandLogo";
import BrandWordmark from "@/components/brand/BrandWordmark";
import PoweredByConnection from "@/components/brand/PoweredByConnection";
import { BRAND } from "@/lib/brand";
import { COMMITTEE_STATUS, COMMITTEE_TYPES } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
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
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await base44.functions.invoke("GetMyOrganizations", {});
        const d = res.data || res;
        if (d.error) setError(d.error);
        else setData(d);
      } catch (e) {
        setError(e?.response?.data?.error || e?.message || "تعذّر التحميل");
      }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-7 h-7 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const { organizations, total_committees } = data || { organizations: [], total_committees: 0 };

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Building2 className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{t("لم تتم إضافتك إلى أي منظمة بعد", "You haven't been added to any organization yet")}</p>
        <button
          onClick={() => navigate("/create-portal")}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("إنشاء بوابة منظمة", "Create Organization Portal")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("مساحتي", "My Workspace")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t(
              `${organizations.length} منظمة · ${total_committees} لجنة`,
              `${organizations.length} organizations · ${total_committees} committees`
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
                <div className="border-t border-border px-4 py-3">
                  <p className="text-xs text-muted-foreground">{t("لا توجد لجان لك في هذه المنظمة", "No committees assigned in this organization")}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <PoweredByConnection variant="dark" />
    </div>
  );
}