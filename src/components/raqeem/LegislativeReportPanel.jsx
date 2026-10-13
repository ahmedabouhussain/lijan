import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import { FileText, Save, Loader2, FileDown, FileType2, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { REPORT_STAGE_LABELS, CLASSIFICATION_LABELS } from "@/lib/legislativeFileLabels";
import { exportInstitutionalDocument, saveExportResult } from "@/lib/institutionalExportEngine";

// LegislativeReportPanel — the committee report editor.
//
// The secretary drafts conclusions and recommendations, advances the report through its own
// lifecycle (draft → review → approved → issued), and exports the report to PDF and Word.
// Saving persists via UpdateLegislativeReport; exports are built client-side from the file's
// metadata + comparison table + the drafted sections. No fabricated content.

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function LegislativeReportPanel({ file, onUpdated, committee, organizationName }) {
  const { lang } = useLanguage();
  const isAr = lang === "ar";
  const t = (ar, en) => (isAr ? ar : en);
  const { canManageGovernance } = useCommitteeAdmin();

  const [conclusions, setConclusions] = useState(file.report_conclusions || "");
  const [recommendations, setRecommendations] = useState(file.report_recommendations || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const reportStage = file.report_stage || "not_started";
  const stageLabel = REPORT_STAGE_LABELS[reportStage] || REPORT_STAGE_LABELS.not_started;

  // Forward-allowed next stages (mirrors the backend adjacency map).
  const FORWARD = {
    not_started: ["draft"],
    draft: ["under_review"],
    under_review: ["approved", "amendments_required"],
    amendments_required: ["resubmitted"],
    resubmitted: ["under_review"],
    approved: ["issued"],
    issued: ["amended_new_version", "archived"],
    amended_new_version: ["issued", "archived"],
    archived: [],
  };
  const nextStages = FORWARD[reportStage] || [];

  const handleSave = async (targetStage) => {
    setSaving(true);
    setError("");
    try {
      const payload = { file_id: file.id, report_conclusions: conclusions, report_recommendations: recommendations };
      if (targetStage) payload.target_report_stage = targetStage;
      await base44.functions.invoke("UpdateLegislativeReport", payload);
      onUpdated?.();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || t("فشل الحفظ", "Save failed"));
    }
    setSaving(false);
  };

  const handleExport = async (format) => {
    setExporting(true);
    try {
      const cls = CLASSIFICATION_LABELS[file.subject_classification] || CLASSIFICATION_LABELS.other;
      const committeeName = committee
        ? { ar: committee.name_ar || committee.name, en: committee.name_en || committee.name_ar || committee.name }
        : null;
      const result = await exportInstitutionalDocument({
        productType: "legislative_dossier",
        organizationId: file.organization_id || null,
        organizationName: organizationName || null,
        committeeName,
        language: lang,
        classification: "internal",
        format: format === "word" ? "docx" : "pdf",
        referenceNumber: file.reference_number,
        data: {
          file,
          conclusions,
          recommendations,
          classification_label: cls,
          stage_label: t(stageLabel.ar, stageLabel.en),
          committee_name_ar: committeeName?.ar,
          committee_name_en: committeeName?.en,
        },
      });
      await saveExportResult(result);
    } catch (e) {
      setError(e?.message || t("فشل التصدير", "Export failed"));
    }
    setExporting(false);
  };

  return (
    <div className="raqeem-card p-5 space-y-3" dir={isAr ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <h2 className="raqeem-section-title flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary" />
          {t("محرر تقرير اللجنة", "Committee Report Editor")}
        </h2>
        <StatusBadge label={t(stageLabel.ar, stageLabel.en)} colorClass="bg-primary/10 text-primary" size="sm" />
      </div>

      <div>
        <label className="text-xs text-muted-foreground">{t("النتائج", "Conclusions")}</label>
        <textarea
          value={conclusions}
          onChange={(e) => setConclusions(e.target.value)}
          disabled={!canManageGovernance}
          placeholder={t("اكتب نتائج اللجنة...", "Draft the committee's conclusions...")}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[100px] mt-1"
        />
      </div>
      <div>
        <label className="text-xs text-muted-foreground">{t("التوصيات", "Recommendations")}</label>
        <textarea
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
          disabled={!canManageGovernance}
          placeholder={t("اكتب التوصيات...", "Draft the recommendations...")}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm min-h-[80px] mt-1"
        />
      </div>

      {file.report_last_updated_at && (
        <p className="text-[11px] text-muted-foreground">
          {t("آخر تحديث:", "Last updated:")} {formatDate(file.report_last_updated_at)}
          {file.report_last_updated_by_name && ` · ${file.report_last_updated_by_name}`}
        </p>
      )}

      {error && <p className="text-xs text-state-danger-ink">{error}</p>}

      {canManageGovernance && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-border">
          <button onClick={() => handleSave()} disabled={saving}
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 min-h-[40px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t("حفظ المسودة", "Save Draft")}
          </button>
          {nextStages.map((s) => {
            const sl = REPORT_STAGE_LABELS[s] || { ar: s, en: s };
            return (
              <button key={s} onClick={() => handleSave(s)} disabled={saving}
                className="inline-flex items-center gap-1.5 border border-border px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary/50 disabled:opacity-50 min-h-[40px]">
                <ChevronRight className="w-3.5 h-3.5" />
                {t(sl.ar, sl.en)}
              </button>
            );
          })}
        </div>
      )}

      {/* Export — built client-side from the file's own fields, nothing fabricated */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <button onClick={() => handleExport("pdf")} disabled={exporting}
          className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-md text-xs hover:bg-secondary/50 disabled:opacity-50">
          <FileDown className="w-3.5 h-3.5" />
          {t("تصدير PDF", "Export PDF")}
        </button>
        <button onClick={() => handleExport("word")} disabled={exporting}
          className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 rounded-md text-xs hover:bg-secondary/50 disabled:opacity-50">
          <FileType2 className="w-3.5 h-3.5" />
          {t("تصدير Word", "Export Word")}
        </button>
        {exporting && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground self-center" />}
      </div>
    </div>
  );
}