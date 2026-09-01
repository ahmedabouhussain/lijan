import React from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS, formatDate } from "@/lib/raqeemUtils";
import ChairHomeEnhanced from "@/components/raqeem/homes/ChairHomeEnhanced";
import SecretaryHomeEnhanced from "@/components/raqeem/homes/SecretaryHomeEnhanced";
import MemberHomeEnhanced from "@/components/raqeem/homes/MemberHomeEnhanced";
import ObserverHomeEnhanced from "@/components/raqeem/homes/ObserverHomeEnhanced";
import WhatNeedsAttention from "@/components/raqeem/WhatNeedsAttention";
import {
  Building2, Clock, ShieldCheck, UserCircle, Users,
  ArrowLeft, Lock,
} from "lucide-react";

export default function CommitteeHome() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("home");
  const { orgRef, committeeRef } = useParams();
  const { user } = useAuth();

  if (!data) return null;

  const { committee, mandate, my_role, is_oversight, is_recused, members, meetings, registers, counters } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;

  const roleLabel = is_oversight
    ? t("إشراف قراءة فقط", "Oversight (Read-Only)")
    : t(
        { chair: "رئيس", vice_chair: "نائب الرئيس", secretary: "أمين السر", member: "عضو", alternate: "بديل", observer: "مراقب", advisor: "مستشار" }[my_role] || my_role,
        { chair: "Chair", vice_chair: "Vice Chair", secretary: "Secretary", member: "Member", alternate: "Alternate", observer: "Observer", advisor: "Advisor" }[my_role] || my_role
      );

  // Render role-specific home
  const renderRoleHome = () => {
    if (is_oversight) return <ObserverHomeEnhanced data={data} base={base} />;
    if (is_recused) return <ObserverHomeEnhanced data={data} base={base} />;
    switch (my_role) {
      case "chair":
      case "vice_chair":
        return <ChairHomeEnhanced data={data} base={base} />;
      case "secretary":
        return <SecretaryHomeEnhanced data={data} base={base} />;
      case "member":
      case "alternate":
      case "advisor":
        return <MemberHomeEnhanced data={data} base={base} userName={user?.full_name || user?.email} />;
      case "observer":
        return <ObserverHomeEnhanced data={data} base={base} />;
      default:
        return <ObserverHomeEnhanced data={data} base={base} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Context header */}
      <div className="raqeem-card p-5" style={{ borderTop: `4px solid hsl(var(--primary))` }}>
        <div className="flex flex-col gap-3">
          <Link to={`/o/${orgRef}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3 h-3" />
            {t("العودة لبوابة المنظمة", "Back to Organization Portal")}
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">{committee.name_ar || committee.name_en}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{committee.name_en}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} />
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground">
                <UserCircle className="w-3.5 h-3.5" />
                {roleLabel}
              </span>
            </div>
          </div>
          {is_oversight && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 border border-amber-200">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800">{t("وضع الإشراف: قراءة فقط. لا يمكنك تنفيذ عمليات اللجنة.", "Oversight mode: read-only. You cannot perform committee operations.")}</p>
            </div>
          )}
          {is_recused && !is_oversight && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200">
              <Lock className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <p className="text-xs text-red-800">{t("أنت متنحّي من هذه اللجنة. وضع القراءة فقط.", "You are recused from this committee. Read-only mode.")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Committee identity grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Building2, label: t("الجهة المعيّنة", "Appointing Authority"), value: committee.appointing_authority || committee.establishing_authority || "—" },
          { icon: Clock, label: t("المدة", "Term"), value: `${formatDate(committee.term_start)} — ${formatDate(committee.term_end)}` },
          { icon: ShieldCheck, label: t("التصنيف", "Classification"), value: committee.classification || "—" },
          { icon: Users, label: t("الأعضاء", "Members"), value: counters?.members || 0 },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="raqeem-card p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </div>
              <div className="text-sm font-medium text-foreground truncate">{item.value}</div>
            </div>
          );
        })}
      </div>

      {/* Mandate */}
      <div className="raqeem-card p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("الصلاحية", "Mandate")}</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">{mandate?.text || committee.mandate || t("لم يتم تعريف الصلاحية بعد", "Mandate not yet defined")}</p>
      </div>

      {/* What Needs Attention — calm predictive layer */}
      <WhatNeedsAttention data={data} />

      {/* Role-specific home */}
      {renderRoleHome()}
    </div>
  );
}