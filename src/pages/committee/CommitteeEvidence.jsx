import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { ShieldCheck, Upload, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";
import { formatDate } from "@/lib/raqeemUtils";

export default function CommitteeEvidence() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("evidence");
  const { canManageExecution } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [uploadingFor, setUploadingFor] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");

  if (!data) return null;
  const actions = (data.registers?.actions || []).filter((a) => a.status === "evidence_pending" || (a.status === "under_review" && !a.compliance_verified));
  const committeeId = data.committee.id;

  const handleUpload = async (actionId) => {
    await execute("UpdateActionProgress", {
      action_id: actionId,
      evidence_url: evidenceUrl,
      status: "under_review",
    }, () => {
      setUploadingFor(null);
      setEvidenceUrl("");
      reload();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("الأدلة والتحقق", "Evidence & Verification", lang)}</h1>
        <span className="text-sm text-muted-foreground">({actions.length})</span>
      </div>

      {actions.length === 0 ? (
        <EmptyState icon={ShieldCheck} title={t("لا توجد أدلة بانتظار التحقق", "No Evidence Pending")} description={t("جميع الإجراءات مكتملة أو لا تتطلب أدلة.", "All actions are complete or don't require evidence.")} />
      ) : (
        <div className="space-y-2">
          {actions.map((a) => (
            <div key={a.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.title_ar || a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.owner_name} · {formatDate(a.deadline)}</div>
                </div>
                <StatusBadge label={a.status === "evidence_pending" ? t("بانتظار الدليل", "Evidence Pending") : t("قيد المراجعة", "Under Review")} colorClass="bg-amber-50 text-amber-700" />
              </div>
              {a.evidence_url && (
                <a href={a.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <ExternalLink className="w-3 h-3" /> {t("عرض الدليل الحالي", "View Current Evidence")}
                </a>
              )}
              {canManageExecution && (
                <>
                  {uploadingFor === a.id ? (
                    <div className="mt-2 space-y-2">
                      <div>
                        <Label className="text-xs">{t("رابط الدليل", "Evidence URL")}</Label>
                        <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." dir="ltr" />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" disabled={submitting || !evidenceUrl.trim()} onClick={() => handleUpload(a.id)} className="min-h-[36px] flex-1">
                          {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          {t("رفع", "Upload")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setUploadingFor(null); setEvidenceUrl(""); }}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="mt-2 min-h-[36px]" onClick={() => setUploadingFor(a.id)}>
                      <Upload className="w-3.5 h-3.5" />
                      {t("رفع دليل", "Upload Evidence")}
                    </Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}