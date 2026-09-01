import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { Lock, Loader2, X } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CommitteeClosure() {
  const { data, reload } = useCommittee();
  const { t } = useLanguage();
  const [showClose, setShowClose] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  if (!data) return null;
  const { committee, my_role, is_oversight } = data;
  const canClose = !is_oversight && (my_role === "chair" || my_role === "secretary");
  const isClosed = ["closed", "archived"].includes(committee.status);
  const hasOpenActions = (data.registers?.actions || []).some((a) => !["closed", "verified"].includes(a.status));
  const hasOpenDecisions = (data.registers?.decisions || []).some((d) => ["draft", "in_review", "proposed", "voting"].includes(d.status));

  const submit = async (initiateOnly) => {
    setSubmitting(true); setError("");
    try {
      await base44.functions.invoke("CloseCommittee", { committee_id: committee.id, reason, initiate_only: initiateOnly });
      setShowClose(false); setReason(""); reload();
    } catch (e) { setError(e?.response?.data?.error || e?.message || "Failed"); }
    setSubmitting(false);
  };

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
          {canClose && (hasOpenActions || hasOpenDecisions) && (
            <div className="raqeem-card p-4 bg-amber-50">
              <p className="text-xs text-amber-700">{t("لا يمكن إغلاق اللجنة بينما توجد سجلات غير محلولة. أكمل أو أغلق جميع الإجراءات والقرارات أولاً.", "Cannot close the committee while unresolved records exist. Complete or close all actions and decisions first.")}</p>
            </div>
          )}
          {canClose && !hasOpenActions && !hasOpenDecisions && !showClose && (
            <Button onClick={() => setShowClose(true)} className="w-full">
              <Lock className="w-4 h-4" />
              {t("بدء إغلاق اللجنة", "Initiate Committee Closure")}
            </Button>
          )}
          {showClose && (
            <div className="raqeem-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("تأكيد الإغلاق", "Confirm Closure")}</h3>
                <button onClick={() => setShowClose(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              {error && <div className="p-2 rounded-md bg-destructive/10 text-destructive text-sm">{error}</div>}
              <div><Label>{t("سبب الإغلاق", "Closure Reason")}</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Term completed" /></div>
              <div className="flex gap-2">
                <Button variant="outline" disabled={submitting} onClick={() => submit(true)} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("بدء الإغلاق", "Initiate")}
                </Button>
                <Button disabled={submitting || !reason.trim()} onClick={() => submit(false)} className="flex-1">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("إغلاق نهائي", "Final Close")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}