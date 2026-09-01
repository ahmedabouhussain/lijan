import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { Lock } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";

export default function CommitteeClosure() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  if (!data) return null;
  const { committee, my_role, is_oversight } = data;
  const canClose = my_role === "chair" || my_role === "secretary";
  const isClosed = ["closed", "archived"].includes(committee.status);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("إغلاق اللجنة", "Committee Closure")}</h1>
      </div>
      {isClosed ? (
        <div className="raqeem-card p-6 text-center">
          <Lock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium">{t("هذه اللجنة مغلقة", "This committee is closed")}</p>
          <p className="text-xs text-muted-foreground mt-1">{t("تم أرشفة السجلات والذاكرة المؤسسية.", "Records and institutional memory have been archived.")}</p>
        </div>
      ) : (
        <>
          <div className="raqeem-card p-5">
            <h3 className="text-sm font-semibold mb-3">{t("حالة اللجنة", "Committee Status")}</h3>
            <div className="flex items-center gap-2 mb-4">
              <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} />
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t("القرارات الصادرة", "Issued Decisions")}</span><span>{(data.registers?.decisions || []).filter((d) => ["issued", "completed", "closed"].includes(d.status)).length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("الإجراءات المكتملة", "Completed Actions")}</span><span>{(data.registers?.actions || []).filter((a) => ["closed", "verified"].includes(a.status)).length}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t("الإجراءات المفتوحة", "Open Actions")}</span><span>{(data.registers?.actions || []).filter((a) => !["closed", "verified"].includes(a.status)).length}</span></div>
            </div>
          </div>
          {!canClose && !is_oversight && (
            <div className="raqeem-card p-4 bg-amber-50">
              <p className="text-xs text-amber-700">{t("فقط الرئيس أو أمين السر يمكنه بدء إغلاق اللجنة.", "Only the Chair or Secretary can initiate committee closure.")}</p>
            </div>
          )}
          {canClose && (data.registers?.actions || []).some((a) => !["closed", "verified"].includes(a.status)) && (
            <div className="raqeem-card p-4 bg-amber-50">
              <p className="text-xs text-amber-700">{t("لا يمكن إغلاق اللجنة بينما توجد إجراءات مفتوحة. أكمل أو أغلق جميع الإجراءات أولاً.", "Cannot close the committee while open actions exist. Complete or close all actions first.")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}