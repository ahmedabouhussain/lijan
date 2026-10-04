import React from "react";
import { Link, useParams } from "react-router-dom";
import { useOrg } from "@/lib/OrgContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS, COMMITTEE_TYPES } from "@/lib/raqeemUtils";
import { Plus, ChevronLeft, ChevronRight, Users, Building2, ShieldCheck, Lock } from "lucide-react";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { Image } from "@/components/ui/image";
import { L } from "@/lib/l10n";

export default function OrgPortal() {
  const { data } = useOrg();
  const { orgRef } = useParams();
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const EnterIcon = isAr ? ChevronRight : ChevronLeft;

  if (!data) return <TableSkeleton rows={4} />;

  const { organization: org, portal, my_role, committees } = data;
  const allCommittees = [...committees.active, ...committees.draft, ...committees.suspended, ...committees.closing];
  const myCommitteeIds = new Set(data.my_committee_ids || []);
  const myCommittees = allCommittees.filter((c) => myCommitteeIds.has(c.id));
  const otherCommittees = allCommittees.filter((c) => !myCommitteeIds.has(c.id));
  const isAdmin = my_role === "owner" || my_role === "admin";
  const buildCRef = (c) => `${c.slug || c.id}--${c.public_id || c.id}`;

  const roleLabel = {
    owner: t("مالك المنظمة", "Organization Owner"),
    admin: t("مدير المنظمة", "Organization Admin"),
    member: t("عضو", "Member"),
    admin_oversight: t("إشراف إداري", "Administrative Oversight"),
  }[my_role] || my_role;

  return (
    <div className="space-y-6">
      {/* Org header */}
      <div className="raqeem-card p-5" style={{ borderTop: `4px solid ${org.branding_primary_color || "hsl(var(--primary))"}` }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {org.logo_url ? (
              <Image
                src={org.logo_url}
                alt={L.name(org)}
                fittingType="fit"
                className="h-12 w-20 shrink-0 rounded bg-white"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: org.branding_primary_color || "hsl(var(--primary))" }}>
                <Building2 className="w-6 h-6 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-foreground">{L.name(org)}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {portal.sandbox_badge && (
              <StatusBadge label={t("بيئة تجريبية", "Sandbox")} colorClass="bg-amber-100 text-amber-700" />
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
              <ShieldCheck className="w-3.5 h-3.5" />
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      {/* My committees */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            {t("لجاني", "My Committees")}
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{myCommittees.length}</span>
          </h2>
          {isAdmin && (
            <Link to={`/o/${orgRef}/create-committee`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
              <Plus className="w-4 h-4" />
              {t("إنشاء لجنة", "Create Committee")}
            </Link>
          )}
        </div>

        {myCommittees.length === 0 ? (
          <div className="raqeem-card p-10 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">{t("لم تتم إضافتك إلى أي لجنة بعد", "You have not been assigned to any committee yet")}</p>
            {isAdmin && (
              <Link to={`/o/${orgRef}/create-committee`} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Plus className="w-4 h-4" />
                {t("إنشاء لجنة", "Create Committee")}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myCommittees.map((c) => {
              const cRef = buildCRef(c);
              const committeeRoleLabel = {
                chair: t("رئيس", "Chair"),
                vice_chair: t("نائب الرئيس", "Vice Chair"),
                secretary: t("أمين السر", "Secretary"),
                member: t("عضو", "Member"),
                observer: t("مراقب", "Observer"),
                advisor: t("مستشار", "Advisor"),
              }[c.my_role_in_committee] || t("عضو", "Member");
              return (
                <Link
                  key={c.id}
                  to={`/o/${orgRef}/c/${cRef}`}
                  className="raqeem-card p-4 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{L.name(c)}</h3>
                    </div>
                    <StatusBadge label={L.label(COMMITTEE_STATUS, c.status, c.status)} colorClass={COMMITTEE_STATUS[c.status]?.color} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      {committeeRoleLabel}
                    </span>
                    <span>· {L.label(COMMITTEE_TYPES, c.type, c.type)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t("الدخول للجنة", "Enter Committee")}</span>
                    <EnterIcon className="w-4 h-4 text-primary group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px] transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Other committees (oversight) */}
      {isAdmin && otherCommittees.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            {t("لجان أخرى (إشراف)", "Other Committees (Oversight)")}
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{otherCommittees.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherCommittees.map((c) => {
              const cRef = buildCRef(c);
              return (
                <Link
                  key={c.id}
                  to={`/o/${orgRef}/c/${cRef}`}
                  className="raqeem-card p-4 hover:shadow-md transition-shadow group opacity-75"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-foreground truncate">{L.name(c)}</h3>
                    </div>
                    <StatusBadge label={L.label(COMMITTEE_STATUS, c.status, c.status)} colorClass={COMMITTEE_STATUS[c.status]?.color} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-3 h-3" />
                    <span>{t("إشراف قراءة فقط", "Read-only oversight")}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Oversight notice */}
      {my_role === "admin_oversight" && (
        <div className="raqeem-card p-4 flex items-start gap-3">
          <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">{t("وضع الإشراف الإداري", "Administrative Oversight Mode")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t("يمكنك عرض جميع اللجان ولكن لا يمكنك التصويت أو التوقيع أو رئاسة أي لجنة ما لم تكن عضواً معيناً فيها.", "You can view all committees but cannot vote, sign, or chair any committee unless separately assigned as a member.")}</p>
          </div>
        </div>
      )}
    </div>
  );
}