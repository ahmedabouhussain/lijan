import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

const EVIDENCE_FIELDS = [
  { key: "purpose", label: { ar: "الهدف", en: "Purpose" } },
  { key: "requested_outcome", label: { ar: "النتيجة المطلوبة", en: "Requested Outcome" } },
  { key: "mandate_reference", label: { ar: "مرجع الصلاحية", en: "Mandate Reference" } },
  { key: "decision_required", label: { ar: "القرار المطلوب", en: "Decision Required" } },
  { key: "legal_reference", label: { ar: "المرجع القانوني", en: "Legal/Policy Reference" } },
  { key: "financial_impact", label: { ar: "الأثر المالي", en: "Financial Impact" } },
  { key: "operational_impact", label: { ar: "الأثر التشغيلي", en: "Operational Impact" } },
  { key: "risk_assessment", label: { ar: "تقييم المخاطر", en: "Risk Assessment" } },
  { key: "stakeholder_impact", label: { ar: "أثر أصحاب المصلحة", en: "Stakeholder Impact" } },
  { key: "options_considered", label: { ar: "البدائل المطروحة", en: "Options Considered" } },
  { key: "recommended_option", label: { ar: "الخيار الموصى به", en: "Recommended Option" } },
  { key: "supporting_documents", label: { ar: "الوثائق الداعمة", en: "Supporting Documents" } },
  { key: "data_source", label: { ar: "مصدر البيانات", en: "Data Source" } },
  { key: "data_date", label: { ar: "تاريخ البيانات", en: "Data Date" } },
  { key: "evidence_owner", label: { ar: "مالك الدليل", en: "Evidence Owner" } },
  { key: "conflict_declarations", label: { ar: "إقرارات التعارض", en: "Conflict Declarations" } },
];

export function computeReadiness(item) {
  if (!item) return { total: EVIDENCE_FIELDS.length, filled: 0, missing: EVIDENCE_FIELDS.map((f) => f.key), percentage: 0 };
  const filled = EVIDENCE_FIELDS.filter((f) => {
    const val = item[f.key];
    return val && String(val).trim().length > 0;
  });
  const missing = EVIDENCE_FIELDS.filter((f) => !item[f.key] || !String(item[f.key]).trim());
  return {
    total: EVIDENCE_FIELDS.length,
    filled: filled.length,
    missing: missing.map((f) => f.key),
    percentage: Math.round((filled.length / EVIDENCE_FIELDS.length) * 100),
  };
}

export function readinessState(item) {
  const r = computeReadiness(item);
  if (r.percentage === 0) return "incomplete";
  if (r.percentage < 50) return "evidence_missing";
  if (r.percentage < 80) return "ready_for_secretary";
  if (r.percentage < 100) return "ready_for_chair";
  return "approved_for_agenda";
}

const STATE_LABELS = {
  incomplete: { ar: "غير مكتمل", en: "Incomplete", color: "bg-red-50 text-red-700" },
  evidence_missing: { ar: "دليل ناقص", en: "Evidence Missing", color: "bg-amber-50 text-amber-700" },
  ready_for_secretary: { ar: "جاهز لمراجعة الأمين", en: "Ready for Secretary Review", color: "bg-blue-50 text-blue-700" },
  ready_for_chair: { ar: "جاهز لمراجعة الرئيس", en: "Ready for Chair Review", color: "bg-indigo-50 text-indigo-700" },
  approved_for_agenda: { ar: "معتمد لجدول الأعمال", en: "Approved for Agenda", color: "bg-emerald-50 text-emerald-700" },
};

export default function EvidenceReadinessGate({ item, compact = false }) {
  const { t, lang } = useLanguage();
  const readiness = computeReadiness(item);
  const state = readinessState(item);
  const stateLabel = STATE_LABELS[state] || STATE_LABELS.incomplete;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              readiness.percentage === 100 ? "bg-emerald-500" : readiness.percentage >= 50 ? "bg-blue-500" : "bg-amber-500"
            )}
            style={{ width: `${readiness.percentage}%` }}
          />
        </div>
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", stateLabel.color)}>
          {t(stateLabel.ar, stateLabel.en)}
        </span>
      </div>
    );
  }

  return (
    <div className="raqeem-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("بوابة جاهزية الدليل", "Evidence Readiness Gate")}
        </h4>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded", stateLabel.color)}>
          {t(stateLabel.ar, stateLabel.en)}
        </span>
      </div>

      {/* Decomposed progress - no unexplained percentage */}
      <div className="space-y-1.5 mb-3">
        {EVIDENCE_FIELDS.map((field) => {
          const isFilled = item && item[field.key] && String(item[field.key]).trim();
          return (
            <div key={field.key} className="flex items-center gap-2 text-xs">
              {isFilled ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              )}
              <span className={isFilled ? "text-foreground/80" : "text-muted-foreground"}>
                {t(field.label.ar, field.label.en)}
              </span>
            </div>
          );
        })}
      </div>

      {readiness.missing.length > 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            {t(
              `${readiness.missing.length} عنصر دليل مطلوب قبل أن يصل هذا البند للاجتماع`,
              `${readiness.missing.length} evidence items required before this item can reach the meeting`
            )}
          </div>
        </div>
      )}
    </div>
  );
}