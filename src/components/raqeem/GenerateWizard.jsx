import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import SovereignCard from "@/components/raqeem/SovereignCard";
import PreflightChecklist, { runPreflightChecks } from "@/components/raqeem/PreflightChecklist";
import { Button } from "@/components/ui/button";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  FileText, ScrollText, BookOpen, Package, Lock, BarChart3,
  ChevronLeft, Check, Sparkles, Loader2, AlertCircle,
  FileCheck, FileSpreadsheet, Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * GenerateWizard™ — Section 7
 * 3-step wizard replacing long forms for product generation.
 * Step 1: What do you want? (product type)
 * Step 2: What scope? (period, records, language, detail, classification)
 * Step 3: Preview & Issue (preview, gap check, format, review/approve)
 *
 * The system auto-suggests the best format per product type.
 */

const PRODUCT_TYPES = [
  { key: "executive_report", icon: BarChart3, label_ar: "تقرير تنفيذي", label_en: "Executive Report", default_format: "pdf" },
  { key: "periodic_report", icon: BarChart3, label_ar: "تقرير دوري", label_en: "Periodic Report", default_format: "pdf" },
  { key: "official_record", icon: ScrollText, label_ar: "سجل رسمي", label_en: "Official Record", default_format: "pdf" },
  { key: "committee_memory", icon: BookOpen, label_ar: "ذاكرة لجنة", label_en: "Committee Memory", default_format: "pdf" },
  { key: "delivery_pack", icon: Package, label_ar: "حزمة تسليم", label_en: "Delivery Pack", default_format: "pdf" },
  { key: "closure_pack", icon: Lock, label_ar: "حزمة إغلاق", label_en: "Closure Pack", default_format: "pdf" },
  { key: "custom_analysis", icon: FileText, label_ar: "تحليل مخصص", label_en: "Custom Analysis", default_format: "docx" },
];

const FORMAT_SUGGESTION = {
  pdf: { icon: FileText, label_ar: "PDF/A — أرشيف رسمي", label_en: "PDF/A — Official Archive" },
  docx: { icon: FileText, label_ar: "DOCX — مسودة قابلة للمراجعة", label_en: "DOCX — Reviewable Draft" },
  xlsx: { icon: FileSpreadsheet, label_ar: "XLSX — بيانات", label_en: "XLSX — Data" },
  pptx: { icon: Monitor, label_ar: "PPTX — عرض تنفيذي", label_en: "PPTX — Executive Presentation" },
};

export default function GenerateWizard({ open, onOpenChange, onGenerate, committeeName }) {
  const { t, lang } = useLanguage();
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [scope, setScope] = useState({
    period: "last_quarter",
    language: lang === "ar" ? "ar" : "en",
    detail_level: "summary",
    classification: "internal",
  });
  const [generating, setGenerating] = useState(false);

  // Preflight Engine™ — Section 8: run real checks when on step 3
  const preflightResults = step === 3
    ? runPreflightChecks(
        { organization_id: committeeName, generated_content: "", classification: scope.classification },
        scope
      )
    : [];
  const hasFailures = preflightResults.some((r) => r.status === "fail");

  const reset = () => {
    setStep(1);
    setSelectedType(null);
    setGenerating(false);
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Preflight Engine™ — Section 8: block issuance if failures exist
      if (hasFailures) {
        setGenerating(false);
        return;
      }
      await onGenerate?.({ type: selectedType, scope, format: getFormat(selectedType) });
      handleClose();
    } catch {
      setGenerating(false);
    }
  };

  const selectedProduct = PRODUCT_TYPES.find((p) => p.key === selectedType);
  const suggestedFormat = selectedProduct ? FORMAT_SUGGESTION[selectedProduct.default_format] : null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side={lang === "ar" ? "right" : "left"} className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
            {t("إنشاء منتج", "Generate Product")}
          </SheetTitle>
          <SheetDescription>
            {committeeName || t("منتج مؤسسي رسمي", "Official institutional product")}
          </SheetDescription>
        </SheetHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors",
                  step >= s ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : s}
              </div>
              {s < 3 && (
                <div className={cn("flex-1 h-0.5 rounded", step > s ? "bg-primary" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: What do you want? */}
        {step === 1 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground mb-3">{t("ماذا تريد؟", "What do you want?")}</p>
            {PRODUCT_TYPES.map((p) => {
              const Icon = p.icon;
              const selected = selectedType === p.key;
              return (
                <button
                  key={p.key}
                  onClick={() => setSelectedType(p.key)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-start sovereign-focus",
                    selected ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                  )}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", selected ? "bg-primary/10" : "bg-secondary")}>
                    <Icon className={cn("w-4 h-4", selected ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  </div>
                  <span className={cn("text-sm font-medium flex-1", selected ? "text-foreground" : "text-foreground")}>
                    {lang === "ar" ? p.label_ar : p.label_en}
                  </span>
                  {selected && <Check className="w-4 h-4 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: What scope? */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground mb-3">{t("ما النطاق؟", "What scope?")}</p>

            {/* Period */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("الفترة", "Period")}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "last_month", ar: "آخر شهر", en: "Last Month" },
                  { key: "last_quarter", ar: "آخر ربع", en: "Last Quarter" },
                  { key: "last_year", ar: "آخر سنة", en: "Last Year" },
                  { key: "custom", ar: "مخصص", en: "Custom" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setScope({ ...scope, period: opt.key })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                      scope.period === opt.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    {lang === "ar" ? opt.ar : opt.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("اللغة", "Language")}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "ar", label: "العربية" },
                  { key: "en", label: "English" },
                  { key: "both", label: t("الاثنتان", "Both") },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setScope({ ...scope, language: opt.key })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                      scope.language === opt.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Detail level */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("مستوى التفصيل", "Detail Level")}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "summary", ar: "ملخص", en: "Summary" },
                  { key: "standard", ar: "قياسي", en: "Standard" },
                  { key: "detailed", ar: "مفصل", en: "Detailed" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setScope({ ...scope, detail_level: opt.key })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                      scope.detail_level === opt.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    {lang === "ar" ? opt.ar : opt.en}
                  </button>
                ))}
              </div>
            </div>

            {/* Classification */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("درجة السرية", "Classification")}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "public", ar: "عام", en: "Public" },
                  { key: "internal", ar: "داخلي", en: "Internal" },
                  { key: "confidential", ar: "سري", en: "Confidential" },
                  { key: "restricted", ar: "مقيد", en: "Restricted" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setScope({ ...scope, classification: opt.key })}
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium border transition-colors",
                      scope.classification === opt.key ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-secondary/50"
                    )}
                  >
                    {lang === "ar" ? opt.ar : opt.en}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Issue */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground mb-3">{t("المعاينة والإصدار", "Preview & Issue")}</p>

            {/* Summary */}
            <SovereignCard className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("المنتج", "Product")}</span>
                <span className="font-medium text-foreground">
                  {selectedProduct ? (lang === "ar" ? selectedProduct.label_ar : selectedProduct.label_en) : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("الفترة", "Period")}</span>
                <span className="font-medium text-foreground">{scope.period}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("اللغة", "Language")}</span>
                <span className="font-medium text-foreground">{scope.language}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t("التصنيف", "Classification")}</span>
                <span className="font-medium text-foreground">{scope.classification}</span>
              </div>
            </SovereignCard>

            {/* Suggested format */}
            {suggestedFormat && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-secondary/50">
                <FileCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("الصيغة المقترحة", "Suggested Format")}</p>
                  <p className="text-xs font-medium text-foreground">{lang === "ar" ? suggestedFormat.label_ar : suggestedFormat.label_en}</p>
                </div>
              </div>
            )}

            {/* Preflight Engine™ — Section 8: real pre-issuance checks */}
            <PreflightChecklist results={preflightResults} />
            {hasFailures && (
              <p className="text-[10px] text-muted-foreground">
                {t("لا يمكن إصدار الوثيقة الرسمية حتى تُعالج النواقص", "Cannot issue official document until gaps are resolved")}
              </p>
            )}
          </div>
        )}

        {/* Footer navigation */}
        <SheetFooter className="mt-6 flex-row gap-2">
          {step > 1 && (
            <Button variant="outline" size="sm" onClick={() => setStep(step - 1)} disabled={generating}>
              {t("السابق", "Back")}
            </Button>
          )}
          {step < 3 && (
            <Button size="sm" onClick={() => setStep(step + 1)} disabled={step === 1 && !selectedType} className="flex-1">
              {t("التالي", "Next")}
              <ChevronLeft className="w-3.5 h-3.5 rotate-180" aria-hidden="true" />
            </Button>
          )}
          {step === 3 && !hasFailures && (
            <Button size="sm" onClick={handleGenerate} disabled={generating} className="flex-1">
              {generating ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t("جارٍ الإنشاء...", "Generating...")}</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5" /> {t("إصدار", "Issue")}</>
              )}
            </Button>
          )}
          {step === 3 && hasFailures && (
            <Button variant="outline" size="sm" onClick={() => setStep(2)} className="flex-1">
              {t("معالجة النواقص", "Fix Gaps")}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function getFormat(productType) {
  const product = PRODUCT_TYPES.find((p) => p.key === productType);
  return product?.default_format || "pdf";
}