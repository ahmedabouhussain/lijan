import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/raqeem/StatusBadge";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import PageHeader from "@/components/raqeem/PageHeader";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { MEMBER_ROLE } from "@/lib/raqeemUtils";
import { Users, Plus, UserMinus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
                  {(m.full_name || "?").charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{m.full_name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {m.institution_name || "—"}
                    {m.user_email && ` · ${m.user_email}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {m.role === "alternate" && !m.activated && (
                  <StatusBadge label={t("بديل غير مفعّل", "Inactive Alternate")} colorClass="bg-secondary text-muted-foreground" />
                )}
                <StatusBadge label={MEMBER_ROLE[m.role]?.ar || m.role} colorClass={MEMBER_ROLE[m.role]?.color} />
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