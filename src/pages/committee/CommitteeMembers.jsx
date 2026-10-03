import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/raqeem/StatusBadge";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import OrganizationIdentity from "@/components/raqeem/OrganizationIdentity";
import PageHeader from "@/components/raqeem/PageHeader";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { MEMBER_ROLE, WORKSTREAM_ROLE } from "@/lib/raqeemUtils";
import CommitteeChairCard from "@/components/raqeem/CommitteeChairCard";
import { Users, Plus, UserMinus, Loader2, Network } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { L } from "@/lib/l10n";

const ROLE_ORDER = { chair: 1, vice_chair: 2, secretary: 3, committee_administrator: 4, member: 5, alternate: 6, observer: 7, advisor: 8 };

const ROLE_OPTIONS = [
  { value: "member", label_ar: "عضو", label_en: "Member" },
  { value: "secretary", label_ar: "أمين السر", label_en: "Secretary" },
  { value: "vice_chair", label_ar: "نائب الرئيس", label_en: "Vice Chair" },
  { value: "chair", label_ar: "الرئيس", label_en: "Chair" },
  { value: "committee_administrator", label_ar: "مدير اللجنة", label_en: "Committee Administrator" },
  { value: "observer", label_ar: "مراقب", label_en: "Observer" },
  { value: "advisor", label_ar: "مستشار", label_en: "Advisor" },
  { value: "alternate", label_ar: "بديل", label_en: "Alternate" },
];

export default function CommitteeMembers() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription, getEmptyState, isSectionVisible } = usePageConfig("members");
  const { canManageMembership } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [showCreate, setShowCreate] = useState(false);
  const [endingId, setEndingId] = useState(null);
  const [endReason, setEndReason] = useState("");

  if (!data) return <TableSkeleton rows={5} />;
  const { members, committee } = data;
  const ordered = [...members].sort((a, b) => (ROLE_ORDER[a.role] || 99) - (ROLE_ORDER[b.role] || 99));
  // Institutional identity (name + approved logo) resolved once for the whole committee context.
  const orgIndex = data.org_index || {};
  const displayName = (m) => (lang === "ar" ? m.full_name_ar || m.full_name : m.full_name);
  const workGroups = data.workstreams || [];

  // The chair is an office resolved from the stored seat; the mark shown is the institution's.
  const chairSeat = ordered.find((m) => m.role === "chair") || null;
  const chairOrg = chairSeat?.represented_organization_id ? orgIndex[chairSeat.represented_organization_id] : null;

  // Work-group seats are joined by the STORED link (committee_membership_id) — never by name, so a
  // person serving in more than one group keeps ONE file with several group seats shown inside it.
  const workGroupSeats = (m) =>
    (data.workstream_memberships || [])
      .filter((s) => s.committee_membership_id === m.id && s.status === "active")
      .map((s) => {
        const g = workGroups.find((w) => w.id === s.workstream_id);
        return { ...s, groupNameAr: g?.name_ar, groupNameEn: g?.name_en };
      })
      .filter((s) => s.groupNameAr || s.groupNameEn);

  const handleEnd = async (memberId) => {
    await execute("EndCommitteeMembership", {
      membership_id: memberId,
      reason: endReason || "Membership ended by administrator",
    }, () => {
      setEndingId(null);
      setEndReason("");
      reload();
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users}
        title={getTitle("أعضاء اللجنة", "Committee Members", lang)}
        subtitle={getDescription("تشكيل اللجنة وأدوار الأعضاء", "Committee composition and member roles", lang)}
        badge={<span className="text-sm text-muted-foreground">({ordered.length})</span>}
        actions={canManageMembership && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" />
            {t("دعوة عضو", "Invite Member")}
          </Button>
        )}
      />

      {chairSeat && <CommitteeChairCard chair={chairSeat} org={chairOrg} logoUrl={chairOrg?.logo_url} />}

      {showCreate && canManageMembership && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("دعوة عضو جديد", "Invite New Member")}
          functionName="InviteCommitteeMember"
          payload={{ committee_id: committee.id }}
          onSuccess={reload}
          submitLabel={t("إرسال الدعوة", "Send Invite")}
          fields={[
            { name: "full_name", label: t("الاسم الكامل", "Full Name"), required: true, placeholder: "Dr. Ahmed Al-Kuwari", fullWidth: true },
            { name: "email", label: t("البريد الإلكتروني", "Email"), type: "email", required: true, placeholder: "member@institution.gov.qa", fullWidth: true },
            { name: "role", label: t("الدور", "Role"), type: "select", required: true, options: ROLE_OPTIONS },
            { name: "institution_name", label: t("المؤسسة المُمثّلة", "Representing Institution"), placeholder: "Ministry of Health" },
          ]}
        />
      )}

      {ordered.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{getEmptyState("لا يوجد أعضاء مسجلون", "No members registered", lang)}</p>
        </div>
      ) : (
        <div className="raqeem-card divide-y divide-border">
          {ordered.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0 text-sm font-medium text-foreground">
                  {displayName(m).charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{displayName(m)}</div>
                  <div className="mt-0.5">
                    {(() => {
                      const org = orgIndex[m.represented_organization_id];
                      const identity = <OrganizationIdentity org={org} size="row" nameClassName="text-xs text-muted-foreground" />;
                      // The mark opens the institution's own file.
                      return org?.public_id ? (
                        <Link to={`/o/${org.public_id}`} className="sovereign-focus rounded inline-flex">
                          {identity}
                        </Link>
                      ) : (
                        identity
                      );
                    })()}
                  </div>
                  {workGroupSeats(m).length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {workGroupSeats(m).map((seat) => (
                        <span
                          key={seat.id}
                          className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border border-border text-muted-foreground"
                        >
                          <Network className="w-3 h-3" aria-hidden="true" />
                          {lang === "ar" ? seat.groupNameAr : seat.groupNameEn} · {L.label(WORKSTREAM_ROLE, seat.role, seat.role)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.role === "alternate" && !m.activated && (
                  <StatusBadge label={t("بديل غير مفعّل", "Inactive Alternate")} colorClass="bg-secondary text-muted-foreground" />
                )}
                <StatusBadge label={L.label(MEMBER_ROLE, m.role, m.role)} colorClass={MEMBER_ROLE[m.role]?.color} />
                {canManageMembership && m.status === "active" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 min-h-[36px]"
                    onClick={() => setEndingId(m.id)}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* End Membership Dialog */}
      {endingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEndingId(null)}>
          <div className="bg-card rounded-lg p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold">{t("إنهاء العضوية", "End Membership")}</h3>
            <p className="text-xs text-muted-foreground">{t("سيتم إنهاء العضوية بشكل غير تدميري مع الحفاظ على السجل التاريخي.", "Membership will be ended non-destructively, preserving the historical record.")}</p>
            <div>
              <label className="text-xs text-muted-foreground">{t("سبب الإنهاء", "End Reason")}</label>
              <textarea
                className="w-full mt-1 rounded-md border border-input p-2 text-sm"
                rows={2}
                value={endReason}
                onChange={(e) => setEndReason(e.target.value)}
                placeholder={t("مثال: انتهاء المدة المعيّنة", "e.g., Term expired")}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEndingId(null)}>{t("إلغاء", "Cancel")}</Button>
              <Button variant="destructive" size="sm" disabled={submitting} onClick={() => handleEnd(endingId)} className="min-h-[44px]">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("تأكيد الإنهاء", "Confirm End")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}