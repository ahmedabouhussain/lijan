import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import SovereignCard from "@/components/raqeem/SovereignCard";
import WorkInbox from "@/components/raqeem/WorkInbox";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import ChairHomeEnhanced from "@/components/raqeem/homes/ChairHomeEnhanced";
import SecretaryHomeEnhanced from "@/components/raqeem/homes/SecretaryHomeEnhanced";
import MemberHomeEnhanced from "@/components/raqeem/homes/MemberHomeEnhanced";
import ObserverHomeEnhanced from "@/components/raqeem/homes/ObserverHomeEnhanced";
import {
  UserCircle, ArrowLeft, Lock, ChevronDown, ChevronUp,
} from "lucide-react";

export default function CommitteeHome() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  const { orgRef, committeeRef } = useParams();
  const { user } = useAuth();

  if (!data) return null;

  const { committee, my_role, is_recused } = data;
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
      {/* Slim context header — no gradient, no dashboard numbers */}
      <SovereignCard className="p-5">
        <div className="flex flex-col gap-3">
          <Link to={`/o/${orgRef}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors sovereign-focus rounded w-fit">
            <ArrowLeft className="w-3 h-3" aria-hidden="true" />
            {t("العودة لبوابة المنظمة", "Back to Organization Portal")}
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground tracking-tight">{committee.name_ar || committee.name_en}</h1>
              {committee.name_en && committee.name_ar && (
                <p className="text-xs text-muted-foreground mt-0.5">{committee.name_en}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} size="md" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/5 text-primary border border-primary/15">
                <UserCircle className="w-4 h-4" aria-hidden="true" />
                {roleLabel}
              </span>
            </div>
          </div>
          {is_recused && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <Lock className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
              <p className="text-xs text-red-800">{t("أنت متنحّي من هذه اللجنة. وضع القراءة فقط.", "You are recused from this committee. Read-only mode.")}</p>
            </div>
          )}
        </div>
      </SovereignCard>

      {/* ما المطلوب مني الآن؟ — primary screen */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          {t("ما المطلوب مني الآن؟", "What's Required of Me Now?")}
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          {t("إجراءات تحتاج انتباهك مباشرة", "Actions that need your direct attention")}
        </p>
        <WorkInbox data={data} base={base} />
      </div>

      {/* Progressive disclosure — role details on demand */}
      <RoleDetailsToggle>
        {renderRoleHome()}
      </RoleDetailsToggle>
    </div>
  );
}

function RoleDetailsToggle({ children }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors sovereign-focus rounded px-2 py-1"
        aria-expanded={open}
      >
        {open ? (
          <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        {t("تفاصيل إضافية", "More details")}
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}