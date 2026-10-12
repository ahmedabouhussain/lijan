import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import { Bot, Loader2, Sparkles, CheckCircle, XCircle } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import AIAccountabilityPanel from "@/components/raqeem/AIAccountabilityPanel";
import AISystemInventoryPanel from "@/components/raqeem/AISystemInventoryPanel";
import AIGovernancePostureBanner from "@/components/raqeem/AIGovernancePostureBanner";
import AIFeedbackPanel from "@/components/raqeem/AIFeedbackPanel";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/raqeemUtils";

const OUTPUT_TYPE = {
  meeting_minutes: { ar: "محاضر", en: "Minutes" },
  governance_doc: { ar: "وثيقة حوكمة", en: "Governance Doc" },
  decision_draft: { ar: "مسودة قرار", en: "Decision Draft" },
  policy_scenario: { ar: "سيناريو سياسة", en: "Policy Scenario" },
  institutional_memory: { ar: "ذاكرة مؤسسية", en: "Institutional Memory" },
  summary: { ar: "ملخص", en: "Summary" },
  other: { ar: "أخرى", en: "Other" },
};

const TASK_OPTIONS = [
  { value: "governance_doc", label_ar: "وثيقة حوكمة", label_en: "Governance Document" },
  { value: "institutional_memory", label_ar: "ذاكرة مؤسسية", label_en: "Institutional Memory" },
  { value: "summary", label_ar: "ملخص", label_en: "Summary" },
  { value: "decision_draft", label_ar: "مسودة قرار", label_en: "Decision Draft" },
];

export default function CommitteeAI() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("ai");
  const { canManageGovernance } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [taskType, setTaskType] = useState("summary");

  const committeeId = data?.committee?.id;

  const fetchRecords = async () => {
    if (!committeeId) return;
    try {
      const res = await base44.entities.AIOutputLedger.filter({ committee_id: committeeId });
      setRecords(res || []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [committeeId]);

  const handleGenerate = async () => {
    const fn = taskType === "institutional_memory" ? "GenerateInstitutionalMemory" : "GenerateCommitteeGovernance";
    await execute(fn, { committee_id: committeeId }, () => {
      setShowGenerate(false);
      fetchRecords();
    });
  };

  const handleApprove = async (recordId, approved) => {
    try {
      await base44.entities.AIOutputLedger.update(recordId, { approved, human_reviewed: true });
      fetchRecords();
    } catch { /* error */ }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Bot}
        title={getTitle("مخرجات الذكاء الاصطناعي", "AI Outputs", lang)}
        badge={<span className="text-sm text-muted-foreground">({records.length})</span>}
        actions={canManageGovernance && (
          <Button size="sm" onClick={() => setShowGenerate(!showGenerate)}>
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            {t("إنشاء جديد", "New Generation")}
          </Button>
        )}
      />

      {showGenerate && canManageGovernance && (
        <div className="raqeem-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t("إنشاء مخرج ذكاء اصطناعي", "Generate AI Output")}</h3>
          <div>
            <label className="text-xs text-muted-foreground">{t("نوع المهمة", "Task Type")}</label>
            <select aria-label={t("نوع المهمة", "Task Type")} className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1 bg-transparent" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              {TASK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.label_ar, o.label_en)}</option>)}
            </select>
          </div>
          <div className="p-2 rounded-md bg-secondary/60 text-xs text-muted-foreground">
            {t("سيتم إنشاء مقترح يحتاج إلى مراجعة بشرية قبل الاعتماد.", "A proposal will be generated requiring human review before approval.")}
          </div>
          <Button onClick={handleGenerate} disabled={submitting} className="w-full min-h-[44px]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t("إنشاء", "Generate")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={Bot} title={t("لا توجد مخرجات", "No AI Outputs")} description={t("لم يتم إنشاء مخرجات ذكاء اصطناعي لهذه اللجنة.", "No AI outputs generated for this committee.")} />
      ) : (
        <>
        {/* National AI Governance Posture — executive glance at the five conditions */}
        <AIGovernancePostureBanner records={records} />
        {/* AI Systems Register & Impact Assessment — ISO 42001 §6.1.2/§8.3 · EU AI Act */}
        <AISystemInventoryPanel committeeId={committeeId} />
        {/* AI Accountability Report — server-computed (OECD AI / NIST AI RMF) */}
        <AIAccountabilityPanel committeeId={committeeId} />
        <div className="space-y-2">
          {records.map((r) => {
            const ti = OUTPUT_TYPE[r.output_type] || OUTPUT_TYPE.other;
            const hasConfidence = typeof r.confidence_score === "number";
            return (
              <div key={r.id} className="raqeem-card p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={t(ti.ar, ti.en)} colorClass="bg-secondary text-muted-foreground" />
                    <span className="text-sm font-medium">{r.source_title || t("مخرج", "Output")}</span>
                  </div>
                  <StatusBadge
                    label={r.approved ? t("معتمد", "Approved") : t("بانتظار المراجعة", "Pending Review")}
                    colorClass={r.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                  />
                </div>
                {r.output_summary && <p className="text-xs text-muted-foreground leading-relaxed">{r.output_summary}</p>}
                {/* الإفصاح الوطني للمخرج — OECD Transparency: النموذج، الثقة، المراجع البشري، الاستشارية */}
                <div className="rounded-md border border-border bg-secondary/30 p-2.5 text-[11px] text-muted-foreground space-y-1" dir={lang === "ar" ? "rtl" : "ltr"}>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {r.model_used && <span><span className="text-foreground/70">{t("النموذج:", "Model:")}</span> {r.model_used}</span>}
                    {hasConfidence && <span><span className="text-foreground/70">{t("الثقة:", "Confidence:")}</span> {Math.round(r.confidence_score * 100)}%</span>}
                    {r.generated_at && <span><span className="text-foreground/70">{t("تاريخ:", "Date:")}</span> {formatDate(r.generated_at)}</span>}
                  </div>
                  {r.generated_by_name && (
                    <div><span className="text-foreground/70">{t("أعدّه:", "Generated by:")}</span> {r.generated_by_name}</div>
                  )}
                  {r.human_reviewed && r.reviewed_by_name && (
                    <div><span className="text-foreground/70">{t("راجعه:", "Reviewed by:")}</span> {r.reviewed_by_name}{r.reviewed_at && ` · ${formatDate(r.reviewed_at)}`}</div>
                  )}
                  <div className="pt-1 border-t border-border/60 text-foreground/60">
                    {t("مخرج استشاري لا يُغيّر حالة الحوكمة — الحكم النهائي بشري.", "Advisory output — does not change governance state. The final verdict is human.")}
                  </div>
                </div>
                <AIFeedbackPanel
                  ledgerId={r.id}
                  confidenceScore={r.confidence_score}
                  confidenceBasis={r.confidence_basis}
                  onSubmitted={fetchRecords}
                />
                {canManageGovernance && !r.approved && (
                  <div className="flex justify-end gap-1 pt-1">
                    <button onClick={() => handleApprove(r.id, true)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 rounded" title={t("اعتماد", "Approve")}>
                      <CheckCircle className="w-4 h-4" />
                      {t("اعتماد", "Approve")}
                    </button>
                    <button onClick={() => handleApprove(r.id, false)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-700 hover:bg-red-50 rounded" title={t("رفض", "Reject")}>
                      <XCircle className="w-4 h-4" />
                      {t("رفض", "Reject")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}