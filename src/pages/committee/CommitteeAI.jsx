import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import { Bot, Loader2, Sparkles, CheckCircle, XCircle } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import AIAccuracyDashboard from "@/components/raqeem/AIAccuracyDashboard";
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
  const { getTitle, getDescription } = usePageConfig("ai");
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("مخرجات الذكاء الاصطناعي", "AI Outputs", lang)}</h1>
          <span className="text-sm text-muted-foreground">({records.length})</span>
        </div>
        {canManageGovernance && (
          <Button size="sm" onClick={() => setShowGenerate(!showGenerate)}>
            <Sparkles className="w-4 h-4" />
            {t("توليد جديد", "New Generation")}
          </Button>
        )}
      </div>

      {showGenerate && canManageGovernance && (
        <div className="raqeem-card p-4 space-y-3">
          <h3 className="text-sm font-semibold">{t("توليد مخرج ذكاء اصطناعي", "Generate AI Output")}</h3>
          <div>
            <label className="text-xs text-muted-foreground">{t("نوع المهمة", "Task Type")}</label>
            <select className="w-full h-9 rounded-md border border-input px-3 text-sm mt-1 bg-transparent" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
              {TASK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.label_ar, o.label_en)}</option>)}
            </select>
          </div>
          <div className="p-2 rounded-md bg-secondary/60 text-xs text-muted-foreground">
            {t("سيتم توليد مقترح يحتاج إلى مراجعة بشرية قبل الاعتماد.", "A proposal will be generated requiring human review before approval.")}
          </div>
          <Button onClick={handleGenerate} disabled={submitting} className="w-full min-h-[44px]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t("توليد", "Generate")}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={Bot} title={t("لا توجد مخرجات", "No AI Outputs")} description={t("لم يتم توليد مخرجات ذكاء اصطناعي لهذه اللجنة.", "No AI outputs generated for this committee.")} />
      ) : (
        <>
        {/* AI Accuracy Dashboard — Section 15 */}
        <AIAccuracyDashboard records={records} />
        <div className="space-y-2">
          {records.map((r) => {
            const ti = OUTPUT_TYPE[r.output_type] || OUTPUT_TYPE.other;
            return (
              <div key={r.id} className="raqeem-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge label={t(ti.ar, ti.en)} colorClass="bg-secondary text-muted-foreground" />
                    <span className="text-sm font-medium">{r.source_title || t("مخرج", "Output")}</span>
                  </div>
                  <StatusBadge
                    label={r.approved ? t("معتمد", "Approved") : t("بانتظار المراجعة", "Pending Review")}
                    colorClass={r.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                  />
                </div>
                {r.output_summary && <p className="text-xs text-muted-foreground">{r.output_summary}</p>}
                <div className="text-xs text-muted-foreground mt-1 flex items-center justify-between">
                  <span>{r.model_used && `${r.model_used} · `}{r.generated_at && formatDate(r.generated_at)}</span>
                  {canManageGovernance && !r.approved && (
                    <div className="flex gap-1">
                      <button onClick={() => handleApprove(r.id, true)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleApprove(r.id, false)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}
    </div>
  );
}