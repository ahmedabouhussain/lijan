import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { Bot } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
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

export default function CommitteeAI() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.committee?.id) return;
    base44.entities.AIOutputLedger.filter({ committee_id: data.committee.id })
      .then((res) => setRecords(res || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [data?.committee?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Bot className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("مخرجات الذكاء الاصطناعي", "AI Outputs")}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={Bot} title={t("لا توجد مخرجات", "No AI Outputs")} description={t("لم يتم توليد مخرجات ذكاء اصطناعي لهذه اللجنة.", "No AI outputs generated for this committee.")} />
      ) : (
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
                    colorClass={r.approved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                  />
                </div>
                {r.output_summary && <p className="text-xs text-muted-foreground">{r.output_summary}</p>}
                <div className="text-xs text-muted-foreground mt-1">
                  {r.model_used && <span>{r.model_used} · </span>}
                  {r.generated_at && formatDate(r.generated_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}