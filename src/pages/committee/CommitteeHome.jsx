import React from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import StatCard from "@/components/raqeem/StatCard";
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

  const { committee, mandate, my_role, is_recused, members, meetings, registers, counters } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;

  const roleLabel = t(
    { chair: "رئيس اللجنة", vice_chair: "نائب الرئيس", secretary: "أمين السر", committee_administrator: "مدير اللجنة", member: "عضو", alternate: "بديل", observer: "مراقب", advisor: "مستشار" }[my_role] || my_role,
    { chair: "Committee Chair", vice_chair: "Vice Chair", secretary: "Secretary", committee_administrator: "Committee Administrator", member: "Member", alternate: "Alternate", observer: "Observer", advisor: "Advisor" }[my_role] || my_role
  );

  // Render role-specific home
  const renderRoleHome = () => {
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
      <div className="raqeem-card overflow-hidden">
        <div className="h-1.5" style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--accent)))" }} />
        <div className="p-5">
          <div className="flex flex-col gap-3">
            <Link to={`/o/${orgRef}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-3 h-3" />
              {t("العودة لبوابة المنظمة", "Back to Organization Portal")}
            </Link>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold text-foreground tracking-tight">{committee.name_ar || committee.name_en}</h1>
                {committee.name_en && committee.name_ar && (
                  <p className="text-sm text-muted-foreground mt-1">{committee.name_en}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} size="md" />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-primary/5 text-primary border border-primary/15">
                  <UserCircle className="w-4 h-4" />
                  {roleLabel}
                </span>
              </div>
            </div>
            {is_recused && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-md bg-red-50 border border-red-200">
                <Lock className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-xs text-red-800">{t("أنت متنحّي من هذه اللجنة. وضع القراءة فقط.", "You are recused from this committee. Read-only mode.")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Committee identity grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Building2} label={t("الجهة المعيّنة", "Appointing Authority")} value={committee.appointing_authority || committee.establishing_authority || "—"} />
        <StatCard icon={Clock} label={t("المدة", "Term")} value={`${formatDate(committee.term_start)} — ${formatDate(committee.term_end)}`} />
        <StatCard icon={ShieldCheck} label={t("التصنيف", "Classification")} value={committee.classification || "—"} />
        <StatCard icon={Users} label={t("الأعضاء", "Members")} value={counters?.members || 0} accent="hsl(var(--accent))" />
      </div>

      {/* Mandate */}
      <div className="raqeem-card p-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1 h-full" style={{ background: "hsl(var(--accent))" }} />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-accent-foreground" style={{ color: "hsl(var(--accent))" }} />
          {t("الصلاحية", "Mandate")}
        </h3>
        <p className="text-sm text-foreground/80 leading-relaxed pr-2">{mandate?.text || committee.mandate || t("لم يتم تعريف الصلاحية بعد", "Mandate not yet defined")}</p>
      </div>

      {/* What Needs Attention — calm predictive layer */}
      <WhatNeedsAttention data={data} />

      {/* Role-specific home */}
      {renderRoleHome()}
    </div>
  );
}