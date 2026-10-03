import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import CrudFormDialog from "@/components/raqeem/CrudFormDialog";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { FileText, Plus, CheckCircle, ArrowLeftCircle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

const STATUS_LABELS = {
  draft: { ar: "مسودة", en: "Draft", color: "bg-secondary text-muted-foreground" },
  in_review: { ar: "قيد المراجعة", en: "In Review", color: "bg-amber-50 text-amber-700" },
  approved: { ar: "معتمد", en: "Approved", color: "bg-emerald-50 text-emerald-700" },
  issued: { ar: "صادر", en: "Issued", color: "bg-primary/10 text-primary" },
  amended: { ar: "معدّل", en: "Amended", color: "bg-secondary text-muted-foreground" },
  superseded: { ar: "مُستبدل", en: "Superseded", color: "bg-secondary text-muted-foreground" },
};

const PROTECTED_STATES = ["approved", "issued", "amended", "superseded"];

export default function CommitteeMinutes() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("minutes");
  const { canManageMinutes } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [showCreate, setShowCreate] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [actionType, setActionType] = useState("");

  if (!data) return <TableSkeleton rows={4} />;
  const minutes = data.registers?.minutes || [];
  const meetings = [...(data.meetings?.upcoming || []), ...(data.meetings?.previous || [])];

  const handleAction = async (minutesId, type) => {
    const fn = type === "approve" ? "ApproveMinutes" : "ReturnCommitteeRecordForCorrection";
    await execute(fn, {
      entity_type: "MeetingMinutes",
      record_id: minutesId,
      committee_id: data.committee.id,
    }, () => {
      setActionId(null);
      setActionType("");
      reload();
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={FileText}
        title={getTitle("محاضر اللجنة", "Committee Minutes", lang)}
        badge={<span className="text-sm text-muted-foreground">({minutes.length})</span>}
        actions={canManageMinutes && meetings.length > 0 && (
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t("إنشاء مسودة", "Create Draft")}
          </Button>
        )}
      />

      {showCreate && canManageMinutes && (
        <CrudFormDialog
          open={showCreate}
          onClose={() => setShowCreate(false)}
          title={t("إنشاء مسودة محضر", "Create Minutes Draft")}
          functionName="GenerateMeetingMinutes"
          payload={{ committee_id: data.committee.id }}
          onSuccess={reload}
          submitLabel={t("إنشاء", "Create")}
          fields={[
            {
              name: "meeting_id",
              label: t("الاجتماع", "Meeting"),
              type: "select",
              required: true,
              options: meetings.map((m) => ({
                value: m.id,
                label_ar: m.title_ar || m.title, label_en: m.title || m.title_ar,
                label_en: m.title || m.title_ar,
              })),
            },
          ]}
        />
      )}

      {minutes.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد محاضر", "No minutes recorded")}</p>
        </div>
      ) : (
        <div className="raqeem-card divide-y divide-border">
          {minutes.map((m) => {
            const st = STATUS_LABELS[m.status] || { ar: m.status, en: m.status, color: "bg-secondary text-muted-foreground" };
            const isProtected = PROTECTED_STATES.includes(m.status);
            return (
              <div key={m.id} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      {isProtected && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      {t("محضر", "Minutes")} {m.minutes_number || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{m.drafted_by_name || "—"}</div>
                  </div>
                  <StatusBadge label={t(st.ar, st.en)} colorClass={st.color} />
                </div>
                {/* Workflow actions */}
                {canManageMinutes && !isProtected && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {m.status === "draft" && (
                      <Button size="sm" variant="outline" disabled={submitting && actionId === m.id}
                        onClick={() => { setActionId(m.id); setActionType("submit"); handleAction(m.id, "submit"); }}
                        className="min-h-[36px]">
                        {t("إرسال", "Submit")}
                      </Button>
                    )}
                    {m.status === "in_review" && (
                      <>
                        <Button size="sm" disabled={submitting && actionId === m.id}
                          onClick={() => { setActionId(m.id); setActionType("approve"); handleAction(m.id, "approve"); }}
                          className="min-h-[36px]">
                          {submitting && actionId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          {t("اعتماد", "Approve")}
                        </Button>
                        <Button size="sm" variant="outline" disabled={submitting && actionId === m.id}
                          onClick={() => { setActionId(m.id); setActionType("return"); handleAction(m.id, "return"); }}
                          className="min-h-[36px]">
                          <ArrowLeftCircle className="w-3.5 h-3.5" />
                          {t("إرجاع", "Return")}
                        </Button>
                      </>
                    )}
                  </div>
                )}
                {isProtected && (
                  <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {t("سجل محمي — استخدم الاستبدال الرسمي للتصحيح", "Protected record — use formal supersession for corrections")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}