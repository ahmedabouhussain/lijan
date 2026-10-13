import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { base44 } from "@/api/base44Client";
import { FileText, Save, Loader2, FileDown, FileType2, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { REPORT_STAGE_LABELS } from "@/lib/legislativeFileLabels";

// LegislativeReportPanel — the committee report editor.
//
// The secretary drafts conclusions and recommendations, advances the report through its own
// lifecycle (draft → review → approved → issued), and exports the report to PDF and Word.
// Saving persists via UpdateLegislativeReport; exports are built client-side from the file's
// metadata + comparison table + the drafted sections. No fabricated content.

const formatDate = (d) => (d ? new Date(d).toLocaleDateString("en-GB") : "—");

export default function LegislativeReportPanel({ file, onUpdated }) {
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
      const { saveAs } = await import("file-saver");
      const safeName = (file.reference_number || "legislative-file").replace(/[^a-zA-Z0-9-]/g, "_");

      if (format === "pdf") {
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ unit: "pt", format: "a4" });
        const margin = 48;
        let y = margin;
        const addLine = (text, size = 11, bold = false, gap = 6) => {
          doc.setFont("helvetica", bold ? "bold" : "normal");
          doc.setFontSize(size);
          const lines = doc.splitTextToSize(text || "—", 595 - margin * 2);
          lines.forEach((ln) => {
            if (y > 780) { doc.addPage(); y = margin; }
            doc.text(ln, margin, y); y += size + 3;
          });
          y += gap;
        };
        addLine(isAr ? "تقرير اللجنة التشريعي" : "Legislative Committee Report", 16, true, 12);
        addLine(`${file.reference_number}`, 12, true, 10);
        addLine(`${isAr ? file.subject_title_ar : (file.subject_title_en || file.subject_title_ar)}`, 12, true, 12);
        addLine(`${t("الجهة المحيلة:", "Referring body:")} ${isAr ? file.referring_body : (file.referring_body_en || file.referring_body)}`, 10, false, 4);
        addLine(`${t("اللجنة المختصة:", "Committee:")} ${isAr ? file.committee_name_ar : (file.committee_name_en || file.committee_name_ar || "—")}`, 10, false, 4);
        addLine(`${t("المرحلة:", "Stage:")} ${t(stageLabel.ar, stageLabel.en)}`, 10, false, 10);
        addLine(t("النتائج", "Conclusions"), 13, true, 4);
        addLine(conclusions, 11, false, 10);
        addLine(t("التوصيات", "Recommendations"), 13, true, 4);
        addLine(recommendations, 11, false, 10);
        if (file.comparison_table?.length) {
          addLine(t("جدول المقارنة", "Comparison Table"), 13, true, 4);
          (file.comparison_table).forEach((row, i) => {
            addLine(`${t("المادة", "Art.")} ${row.article_no || i + 1}`, 11, true, 2);
            addLine(`${t("النص المحال:", "Referred:")} ${row.referred_text || "—"}`, 10, false, 2);
            addLine(`${t("الصياغة النهائية:", "Final:")} ${row.final_wording || row.proposed_text || "—"}`, 10, false, 6);
          });
        }
        doc.save(`${safeName}.pdf`);
      } else {
        // Word export via docx
        const docx = await import("docx");
        const children = [
          new docx.Paragraph({ text: isAr ? "تقرير اللجنة التشريعي" : "Legislative Committee Report", heading: docx.HeadingLevel.HEADING_1 }),
          new docx.Paragraph({ text: file.reference_number, bold: true }),
          new docx.Paragraph({ text: isAr ? file.subject_title_ar : (file.subject_title_en || file.subject_title_ar), bold: true }),
          new docx.Paragraph({ text: `${t("الجهة المحيلة:", "Referring body:")} ${isAr ? file.referring_body : (file.referring_body_en || file.referring_body)}` }),
          new docx.Paragraph({ text: `${t("المرحلة:", "Stage:")} ${t(stageLabel.ar, stageLabel.en)}` }),
          new docx.Paragraph({ text: t("النتائج", "Conclusions"), heading: docx.HeadingLevel.HEADING_2 }),
          new docx.Paragraph({ text: conclusions || "—" }),
          new docx.Paragraph({ text: t("التوصيات", "Recommendations"), heading: docx.HeadingLevel.HEADING_2 }),
          new docx.Paragraph({ text: recommendations || "—" }),
        ];
        if (file.comparison_table?.length) {
          children.push(new docx.Paragraph({ text: t("جدول المقارنة", "Comparison Table"), heading: docx.HeadingLevel.HEADING_2 }));
          const rows = [
            new docx.TableRow({ children: [t("مادة", "Art."), t("النص المحال", "Referred"), t("الصياغة النهائية", "Final")].map((h) => new docx.TableCell({ children: [new docx.Paragraph({ text: h, bold: true })] })) }),
            ...file.comparison_table.map((r, i) => new docx.TableRow({
              children: [String(r.article_no || i + 1), r.referred_text || "—", r.final_wording || r.proposed_text || "—"].map((c) => new docx.TableCell({ children: [new docx.Paragraph({ text: c })] })),
            })),
          ];
          children.push(new docx.Table({ rows, width: { size: 100, type: docx.WidthType.PERCENTAGE } }));
        }
        const doc = new docx.Document({ sections: [{ properties: {}, children }] });
        const blob = await docx.Packer.toBlob(doc);
        saveAs(blob, `${safeName}.docx`);
      }
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