import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import useCommitteeRegister from "@/hooks/useCommitteeRegister";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { CheckCircle2, Clock, FileText } from "lucide-react";

const PRODUCT_TYPE_LABELS = {
  meeting_minutes: { ar: "محاضر اجتماع", en: "Meeting Minutes" },
  decision_document: { ar: "وثيقة قرار", en: "Decision Document" },
  committee_charter: { ar: "ميثاق اللجنة", en: "Committee Charter" },
  formation_decision: { ar: "قرار التشكيل", en: "Formation Decision" },
  amendment_decision: { ar: "قرار تعديل", en: "Amendment Decision" },
  action_report: { ar: "تقرير إجراءات", en: "Action Report" },
  annual_report: { ar: "تقرير سنوي", en: "Annual Report" },
  quarterly_report: { ar: "تقرير ربع سنوي", en: "Quarterly Report" },
  committee_report: { ar: "تقرير اللجنة", en: "Committee Report" },
  voting_record: { ar: "سجل تصويت", en: "Voting Record" },
  executive_summary: { ar: "ملخص تنفيذي", en: "Executive Summary" },
  resolution: { ar: "قرار", en: "Resolution" },
  custom: { ar: "مخصص", en: "Custom" },
};

const STATUS_META = {
  draft: { ar: "مسودة", en: "Draft", icon: Clock, color: "text-muted-foreground", bg: "bg-secondary" },
  generated: { ar: "مُولّد", en: "Generated", icon: FileText, color: "text-state-info-ink", bg: "bg-state-info-surface" },
  in_review: { ar: "قيد المراجعة", en: "In Review", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  approved: { ar: "معتمد", en: "Approved", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  published: { ar: "منشور", en: "Published", icon: CheckCircle2, color: "text-green-700", bg: "bg-green-100" },
  archived: { ar: "مؤرشف", en: "Archived", icon: Clock, color: "text-muted-foreground", bg: "bg-secondary" },
};

function isComplete(product) {
  return product.status === "approved" || product.status === "published";
}

function hasEvidence(product) {
  let sections = [];
  try { sections = product.generated_content ? JSON.parse(product.generated_content) : []; } catch { sections = []; }
  return sections.some(s => s.source_references && s.source_references.length > 0);
}

export default function CompletionLedger() {
  const { t, lang } = useLanguage();
  // Governance products come from the server register, in the same scope as each product's page.
  const { items, loading } = useCommitteeRegister("products");
  const products = items("products");

  if (loading) return <TableSkeleton rows={4} />;
  if (products.length === 0) {
    return (
      <div className="raqeem-card p-6 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          {t("لا توجد منتجات حوكمة بعد", "No governance products yet")}
        </p>
      </div>
    );
  }

  // Group by product_type
  const grouped = {};
  for (const p of products) {
    const key = p.product_type || "custom";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }

  const total = products.length;
  const complete = products.filter(isComplete).length;
  const withEvidence = products.filter(hasEvidence).length;
  const completionRate = total > 0 ? Math.round((complete / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="raqeem-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            {t("سجل الاكتمال", "Completion Ledger")}
          </h3>
          <span className="text-2xl font-bold text-primary">{completionRate}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionRate}%` }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-center">
          <div>
            <div className="text-lg font-bold text-foreground">{total}</div>
            <div className="text-[11px] text-muted-foreground">{t("إجمالي", "Total")}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-emerald-600">{complete}</div>
            <div className="text-[11px] text-muted-foreground">{t("مكتمل", "Complete")}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-amber-600">{withEvidence}</div>
            <div className="text-[11px] text-muted-foreground">{t("بأدلة", "With Evidence")}</div>
          </div>
        </div>
      </div>

      {/* By type */}
      <div className="raqeem-card divide-y divide-border">
        {Object.entries(grouped).map(([type, items]) => {
          const label = PRODUCT_TYPE_LABELS[type] || PRODUCT_TYPE_LABELS.custom;
          const typeComplete = items.filter(isComplete).length;
          const typeRate = items.length > 0 ? Math.round((typeComplete / items.length) * 100) : 0;
          return (
            <div key={type} className="p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{lang === "ar" ? label.ar : label.en}</span>
                <span className="text-xs text-muted-foreground">{typeComplete}/{items.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${typeRate === 100 ? "bg-emerald-500" : typeRate > 0 ? "bg-amber-500" : "bg-muted-foreground/30"}`}
                  style={{ width: `${typeRate}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {items.slice(0, 8).map((p) => {
                  const meta = STATUS_META[p.status] || STATUS_META.draft;
                  const Icon = meta.icon;
                  const evidence = hasEvidence(p);
                  return (
                    <span
                      key={p.id}
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${meta.bg} ${meta.color}`}
                      title={`${p.title} — ${lang === "ar" ? meta.ar : meta.en}${evidence ? " · " + t("بأدلة", "with evidence") : ""}`}
                    >
                      <Icon className="w-3 h-3" />
                      {evidence ? "✓" : "○"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}