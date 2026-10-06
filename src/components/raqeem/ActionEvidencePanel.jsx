import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCrudAction } from "@/hooks/useCrudAction";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VERIFICATION_LABELS, verificationStateOf } from "@/lib/actionState";
import { formatDate } from "@/lib/raqeemUtils";
import { ShieldCheck, Upload, Undo2, Loader2, ExternalLink } from "lucide-react";
import AuditChainPanel from "@/components/raqeem/AuditChainPanel";

// ActionEvidencePanel — the evidence trail of ONE execution action, in the order the acts happen:
// the owner submits a revision → an independent verifier accepts it or returns it with a reason →
// closure (a separate act, offered by the page once a verdict is accepted). Submitting is never
// presented as verification, and every server refusal is shown rather than swallowed.
export default function ActionEvidencePanel({ action, onChanged, allowVerify = false }) {
  const { t, lang } = useLanguage();
  const { submitting, error, execute } = useCrudAction();
  const [form, setForm] = useState(null); // "submit" | "return"
  const [url, setUrl] = useState(action.evidence_url || "");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(action.progress_percent === undefined ? "" : String(action.progress_percent));
  const [reason, setReason] = useState("");

  const state = verificationStateOf(action);
  const meta = VERIFICATION_LABELS[state];
  const revision = Number(action.evidence_revision || 0);
  const done = action.status === "closed" || action.status === "verified";

  const submitEvidence = () => execute("SubmitActionEvidence", {
    action_id: action.id,
    evidence_url: url.trim(),
    notes: notes || undefined,
    progress_percent: progress === "" ? undefined : Number(progress),
  }, () => { setForm(null); setNotes(""); onChanged?.(); });

  const judge = (verdict) => execute("ReviewActionEvidence", {
    action_id: action.id,
    verdict,
    return_reason: verdict === "returned" ? reason.trim() : undefined,
  }, () => { setForm(null); setReason(""); onChanged?.(); });

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${meta.color}`}>
          <ShieldCheck className="w-3 h-3" />{lang === "ar" ? meta.ar : meta.en}
        </span>
        {revision > 0 && (
          <span className="text-[11px] text-muted-foreground">{t(`رقعة الدليل ${revision}`, `Evidence revision ${revision}`)}</span>
        )}
        {state === "accepted" && action.verified_by_name && (
          <span className="text-[11px] text-muted-foreground">
            {t(`قبله ${action.verified_by_name}`, `Accepted by ${action.verified_by_name}`)}
            {action.verified_at ? ` · ${formatDate(action.verified_at)}` : ""}
          </span>
        )}
        {action.evidence_url && (
          <a href={action.evidence_url} target="_blank" rel="noreferrer" className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline">
            <ExternalLink className="w-3 h-3" />{t("عرض الدليل", "View evidence")}
          </a>
        )}
      </div>

      {state === "returned" && action.return_reason && (
        <p className="text-[11px] text-state-warning-ink bg-state-warning-surface rounded-md px-2 py-1">
          {t("أُعيد للتعديل:", "Returned for correction:")} {action.return_reason}
          {action.returned_by_name ? ` — ${action.returned_by_name}` : ""}
        </p>
      )}

      {state === "submitted" && (
        allowVerify && !done ? (
          form === "return" ? (
            <div className="space-y-1.5">
              <Label className="text-xs">{t("سبب الإعادة (إلزامي)", "Reason for return (required)")}</Label>
              <Input aria-label={t("سبب الإعادة", "Reason for return")} value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={submitting || reason.trim().length < 5} onClick={() => judge("returned")} className="min-h-[36px]">
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
                  {t("إعادة للتعديل", "Return for correction")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setForm(null); setReason(""); }}>{t("إلغاء", "Cancel")}</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button size="sm" disabled={submitting} onClick={() => judge("accepted")} className="min-h-[36px]">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                {t("قبول الدليل", "Accept evidence")}
              </Button>
              <Button size="sm" variant="outline" disabled={submitting} onClick={() => setForm("return")} className="min-h-[36px]">
                <Undo2 className="w-3.5 h-3.5" />{t("إعادة للتعديل", "Return for correction")}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {t("التحقق عمل مستقل: لا يتحقق مقدّم الدليل ولا مالك الإجراء من دليله.", "Verification is independent: neither the submitter nor the action owner may judge the evidence.")}
              </span>
            </div>
          )
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {t("بانتظار تحقق مستقل (الرئيس أو أمين اللجنة).", "Awaiting independent verification (chair or secretary).")}
          </p>
        )
      )}

      {state === "accepted" && (
        <p className="text-[11px] text-muted-foreground">
          {t("الإغلاق خطوة منفصلة على هذا السجل.", "Closure is a separate act on this record.")}
        </p>
      )}

      {!done && state !== "submitted" && state !== "accepted" && (
        form === "submit" ? (
          <div className="space-y-1.5">
            <div>
              <Label className="text-xs">{t("مرجع الدليل", "Evidence reference")}</Label>
              <Input aria-label={t("مرجع الدليل", "Evidence reference")} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." dir="ltr" />
            </div>
            <div className="flex items-end gap-2">
              <div className="w-24">
                <Label className="text-xs">{t("الإنجاز %", "Progress %")}</Label>
                <Input aria-label={t("الإنجاز %", "Progress %")} type="number" min="0" max="100" value={progress} onChange={(e) => setProgress(e.target.value)} dir="ltr" />
              </div>
              <Input aria-label={t("ملاحظة", "Note")} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("ملاحظة (اختياري)", "Note (optional)")} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={submitting || !url.trim()} onClick={submitEvidence} className="min-h-[36px]">
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {t("تقديم الدليل", "Submit evidence")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setForm(null)}>{t("إلغاء", "Cancel")}</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("التقديم ليس تحققًا: يبقى الإجراء مفتوحًا حتى يقرّه متحقّق مستقل.", "Submitting is not verification: the action stays open until an independent verifier judges it.")}
            </p>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setForm("submit")} className="min-h-[36px]">
            <Upload className="w-3.5 h-3.5" />{t("تقديم الدليل", "Submit evidence")}
          </Button>
        )
      )}

      {error && (
        <p className="text-[11px] text-state-danger-ink bg-state-danger-surface rounded-md px-2 py-1">{error}</p>
      )}

      {/* G-5: the evidence trail as a chain — an absent required step (submission, independent verdict,
          closure) is a named gap, and the hold state is shown as a gate rather than a note. */}
      <AuditChainPanel committeeId={action.committee_id} entityType="Action" entityId={action.id} chain="evidence" title={action.title_ar || action.title} />
    </div>
  );
}