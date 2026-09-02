import React, { useState } from "react";
import { Check, X, Eye, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { useLanguage } from "@/lib/LanguageContext";
import { useCrudAction } from "@/hooks/useCrudAction";

// MemoryReviewPanel — Review and Approval Workflow for institutional memory records.
// Actions are gated by capabilities: canApprove (chair/vice_chair), canReview (secretary).
export default function MemoryReviewPanel({ record, canApprove, canReview, onReviewed }) {
  const { t } = useLanguage();
  const { submitting, execute } = useCrudAction();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");

  const handleAction = async (action) => {
    await execute("ReviewMemoryRecord", { ledger_id: record.id, action, review_notes: notes }, () => {
      setExpanded(false);
      setNotes("");
      onReviewed?.();
    });
  };

  const statusConfig = {
    generated: { label: t("مُولَّد", "Generated"), class: "bg-blue-50 text-blue-700" },
    under_review: { label: t("قيد المراجعة", "Under Review"), class: "bg-amber-50 text-amber-700" },
    approved: { label: t("معتمَد", "Approved"), class: "bg-emerald-50 text-emerald-700" },
    rejected: { label: t("مرفوض", "Rejected"), class: "bg-destructive/10 text-destructive" },
    amended: { label: t("مُعدَّل", "Amended"), class: "bg-purple-50 text-purple-700" },
  };
  const badge = statusConfig[record.status] || statusConfig.generated;

  const canAct = canApprove || canReview;
  const needsReview = record.status !== "approved" && record.status !== "rejected";

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <StatusBadge label={badge.label} colorClass={badge.class} />
          {record.human_reviewed && (
            <span className="text-xs text-muted-foreground">
              {t("راجَع:", "Reviewed by:")} {record.reviewed_by_name || "—"}
            </span>
          )}
        </div>
        {canAct && needsReview && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className="min-h-[40px]"
          >
            {expanded ? t("إغلاق", "Close") : t("مراجعة", "Review")}
          </Button>
        )}
      </div>

      {record.review_notes && !expanded && (
        <p className="text-xs text-muted-foreground italic">
          {t("ملاحظات:", "Notes:")} {record.review_notes}
        </p>
      )}

      {expanded && canAct && (
        <div className="space-y-3 pt-2 border-t border-border">
          <div>
            <Label className="text-xs mb-1.5">
              {t("ملاحظات المراجعة", "Review Notes")}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("أضف ملاحظات المراجعة هنا...", "Add review notes here...")}
              rows={3}
              className="text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {canReview && record.status === "generated" && (
              <Button
                size="sm"
                variant="outline"
                disabled={submitting}
                onClick={() => handleAction("mark_under_review")}
                className="min-h-[40px]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                {t("بدء المراجعة", "Start Review")}
              </Button>
            )}
            {canReview && (
              <Button
                size="sm"
                variant="outline"
                disabled={submitting}
                onClick={() => handleAction("amend")}
                className="min-h-[40px]"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {t("تعديل وإعادة", "Amend")}
              </Button>
            )}
            {canApprove && (
              <>
                <Button
                  size="sm"
                  disabled={submitting}
                  onClick={() => handleAction("approve")}
                  className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {t("اعتماد", "Approve")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleAction("reject")}
                  className="min-h-[40px] text-destructive border-destructive/30 hover:bg-destructive/5"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  {t("رفض", "Reject")}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}