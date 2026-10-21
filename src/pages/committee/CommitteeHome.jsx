import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import SovereignCard from "@/components/raqeem/SovereignCard";
import WorkInbox from "@/components/raqeem/WorkInbox";
import ChairBrief from "@/components/raqeem/ChairBrief";
import SecretaryOperations from "@/components/raqeem/SecretaryOperations";
import InstitutionalTimeMachine from "@/components/raqeem/InstitutionalTimeMachine";
import CommitteeChairCard from "@/components/raqeem/CommitteeChairCard";
import CommitteeActivationPanel from "@/components/raqeem/CommitteeActivationPanel";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import ChairHomeEnhanced from "@/components/raqeem/homes/ChairHomeEnhanced";
import SecretaryHomeEnhanced from "@/components/raqeem/homes/SecretaryHomeEnhanced";
import MemberHomeEnhanced from "@/components/raqeem/homes/MemberHomeEnhanced";
import ObserverHomeEnhanced from "@/components/raqeem/homes/ObserverHomeEnhanced";
import { L } from "@/lib/l10n";
import {
  UserCircle, ArrowLeft, Lock, ChevronDown, ChevronUp, History,
} from "lucide-react";
import { CardSkeleton } from "@/components/raqeem/LoadingSkeleton";

export default function CommitteeHome() {
  const { data, reload } = useCommittee();
  const { t } = useLanguage();
  const { orgRef, committeeRef } = useParams();
  const { user } = useAuth();
  const [timeMachineOpen, setTimeMachineOpen] = useState(false);

  if (!data) return (
    <div className="space-y-4">
      <CardSkeleton />
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );

  const { committee, my_role, is_recused } = data;
  const base = `/o/${orgRef}/c/${committeeRef}`;
  const isAdminRole = ["chair", "vice_chair", "secretary", "committee_administrator"].includes(my_role);

  // The chair is an OFFICE resolved from the stored seat — and the mark shown is the institution's.
  const chairSeat = (data.members || []).find((m) => m.role === "chair") || null;
  const chairOrg = chairSeat?.represented_organization_id
    ? (data.org_index || {})[chairSeat.represented_organization_id]
    : null;

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
              <h1 className="ui-title text-foreground">{L.name(committee)}</h1>
              {committee.name_en && committee.name_ar && (
                <p className="text-xs text-muted-foreground mt-0.5">{committee.name_en}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge label={L.label(COMMITTEE_STATUS, committee.status, committee.status)} colorClass={COMMITTEE_STATUS[committee.status]?.color} size="md" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/5 text-primary border border-primary/15">
                <UserCircle className="w-4 h-4" aria-hidden="true" />
                {roleLabel}
              </span>
              {isAdminRole && (
                <button
                  onClick={() => setTimeMachineOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                  title={t("عرض اللجنة كما كانت في تاريخ…", "View committee as of date…")}
                >
                  <History className="w-4 h-4" aria-hidden="true" />
                  {t("تتبع التغييرات", "Change Tracker")}
                </button>
              )}
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

      {/* The committee's first governed transition (draft → active). Shown while the committee is not
          yet in force; the gate and the authority decision are the server's, and its refusal is shown. */}
      <CommitteeActivationPanel committee={committee} onActivated={reload} />

      {chairSeat && <CommitteeChairCard chair={chairSeat} org={chairOrg} logoUrl={chairOrg?.logo_url} />}

      {/* Role-specific calm brief — appears above WorkInbox */}
      <ChairBrief data={data} base={base} />
      <SecretaryOperations data={data} base={base} />

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

      {/* Institutional Change Tracker™ — Section 9 */}
      {isAdminRole && (
        <InstitutionalTimeMachine
          open={timeMachineOpen}
          onClose={() => setTimeMachineOpen(false)}
          committeeId={committee.id}
          committeeName={L.name(committee)}
        />
      )}
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