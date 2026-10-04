import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useCommittee } from "@/lib/CommitteeContext";
import useCommitteeRegister from "@/hooks/useCommitteeRegister";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { Link2, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, FileText, Gavel, Calendar, ListChecks, FileCheck } from "lucide-react";

const CHAIN_STAGES = [
  { key: "mandate", icon: FileText, label_ar: "التكليف", label_en: "Mandate" },
  { key: "meetings", icon: Calendar, label_ar: "الاجتماعات", label_en: "Meetings" },
  { key: "decisions", icon: Gavel, label_ar: "القرارات", label_en: "Decisions" },
  { key: "actions", icon: ListChecks, label_ar: "الإجراءات", label_en: "Actions" },
  { key: "reports", icon: FileCheck, label_ar: "التقارير", label_en: "Reports" },
];

export default function TraceabilityMatrix() {
  const { t, lang } = useLanguage();
  const { data } = useCommittee();
  // Reports, decisions and actions all come from the server register — the same scope as each
  // record's own page — so a stage count and the register behind it can never disagree.
  const { items: registerItems, loading } = useCommitteeRegister(["products", "decisions", "actions"]);

  if (loading) return <TableSkeleton rows={3} />;

  const products = registerItems("products");
  const decisions = registerItems("decisions");
  const actions = registerItems("actions");

  const meetings = [...(data?.meetings?.upcoming || []), ...(data?.meetings?.previous || [])];
  const reports = products.filter(p => p.product_type?.includes("report"));
  const hasMandate = !!(data?.committee?.mandate || data?.committee?.mandate_id);

  const stages = {
    mandate: { count: hasMandate ? 1 : 0, items: hasMandate ? [data?.committee?.mandate?.slice(0, 60)] : [] },
    meetings: { count: meetings.length, items: meetings.slice(0, 5).map(m => m.title) },
    decisions: { count: decisions.length, items: decisions.slice(0, 5).map(d => d.title || d.decision_reference) },
    actions: { count: actions.length, items: actions.slice(0, 5).map(a => a.title || a.description?.slice(0, 40)) },
    reports: { count: reports.length, items: reports.slice(0, 5).map(r => r.title) },
  };

  // Find gaps: a stage with 0 items where the previous stage has items
  const gaps = [];
  for (let i = 1; i < CHAIN_STAGES.length; i++) {
    const prev = CHAIN_STAGES[i - 1];
    const curr = CHAIN_STAGES[i];
    if (stages[prev.key].count > 0 && stages[curr.key].count === 0) {
      gaps.push({ from: prev, to: curr });
    }
  }

  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-4">
      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-primary" />
          {t("مصفوفة التتبع", "Traceability Matrix")}
        </h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          {t(
            "سلسلة الحوكمة من التكليف إلى الأثر — يبرز كل فجوة في السلسلة.",
            "The governance chain from mandate to impact — each gap in the chain is highlighted."
          )}
        </p>

        {/* Chain visualization */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {CHAIN_STAGES.map((stage, i) => {
            const stageData = stages[stage.key];
            const hasItems = stageData.count > 0;
            const Icon = stage.icon;
            return (
              <React.Fragment key={stage.key}>
                <div className="flex flex-col items-center gap-1 shrink-0 min-w-[80px]">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                      hasItems
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary text-muted-foreground/40"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {lang === "ar" ? stage.label_ar : stage.label_en}
                  </span>
                  <span className={`text-xs font-bold ${hasItems ? "text-primary" : "text-muted-foreground/40"}`}>
                    {stageData.count}
                  </span>
                </div>
                {i < CHAIN_STAGES.length - 1 && (
                  <Arrow className={`w-4 h-4 shrink-0 ${hasItems ? "text-primary/40" : "text-muted-foreground/20"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Gaps */}
        {gaps.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">
                {t("فجوات في السلسلة", "Gaps in Chain")} ({gaps.length})
              </span>
            </div>
            <ul className="space-y-1">
              {gaps.map((gap, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-center gap-1.5">
                  <span className="font-medium">{lang === "ar" ? gap.from.label_ar : gap.from.label_en}</span>
                  <Arrow className="w-3 h-3" />
                  <span>{lang === "ar" ? gap.to.label_ar : gap.to.label_en}</span>
                  <span className="text-amber-500">— {t("لا توجد سجلات", "no records")}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {gaps.length === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-emerald-700 font-medium">
              {t("السلسلة متصلة بالكامل", "Chain is fully connected")}
            </span>
          </div>
        )}
      </div>

      {/* Detail per stage */}
      <div className="raqeem-card divide-y divide-border">
        {CHAIN_STAGES.map((stage) => {
          const stageData = stages[stage.key];
          const Icon = stage.icon;
          return (
            <div key={stage.key} className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {lang === "ar" ? stage.label_ar : stage.label_en}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{stageData.count}</span>
              </div>
              {stageData.items.length > 0 ? (
                <ul className="space-y-1">
                  {stageData.items.map((item, i) => (
                    <li key={i} className="text-xs text-foreground/70 truncate pl-5">· {item || "—"}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic pl-5">
                  {t("لا توجد سجلات", "No records")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}