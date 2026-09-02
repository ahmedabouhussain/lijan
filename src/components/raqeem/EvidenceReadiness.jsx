import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

/**
 * EvidenceReadiness™ — calm operational indicator for meetings/decisions/reports.
 * 4 states: جاهز، يحتاج استكمالًا، معرض للخطر، غير قابل للإصدار.
 * No fake scores — only real checklist items.
 */
export default function EvidenceReadiness({ items = [], size = "sm" }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  // items: [{ label_ar, label_en, ready: boolean }]
  const total = items.length;
  const readyCount = items.filter((i) => i.ready).length;
  const missing = items.filter((i) => !i.ready);

  let status = "ready";
  let statusLabel = { ar: "جاهز", en: "Ready" };
  let Icon = CheckCircle2;
  let colorClass = "text-emerald-600 bg-emerald-50 border-emerald-200";

  if (total === 0) {
    status = "unknown";
    statusLabel = { ar: "غير محدد", en: "Unknown" };
    Icon = AlertCircle;
    colorClass = "text-muted-foreground bg-secondary border-border";
  } else if (readyCount === total) {
    status = "ready";
  } else if (missing.length >= total * 0.5) {
    status = "not_issuable";
    statusLabel = { ar: "غير قابل للإصدار", en: "Not Issuable" };
    Icon = XCircle;
    colorClass = "text-destructive bg-red-50 border-red-200";
  } else if (missing.length >= total * 0.3) {
    status = "at_risk";
    statusLabel = { ar: "معرض للخطر", en: "At Risk" };
    Icon = AlertTriangle;
    colorClass = "text-primary bg-primary/5 border-primary/20";
  } else {
    status = "needs_completion";
    statusLabel = { ar: "يحتاج استكمالًا", en: "Needs Completion" };
    Icon = AlertCircle;
    colorClass = "text-amber-600 bg-amber-50 border-amber-200";
  }

  const StatusIcon = Icon;

  if (size === "sm" && total > 0) {
    return (
      <div className="relative">
        <button
          onClick={() => missing.length > 0 && setExpanded((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-colors sovereign-focus",
            colorClass,
            missing.length > 0 && "cursor-pointer hover:opacity-80"
          )}
          aria-expanded={expanded}
          aria-label={t("جاهزية الأدلة", "Evidence Readiness")}
        >
          <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{t(statusLabel.ar, statusLabel.en)}</span>
          {missing.length > 0 && (
            <span className="text-[10px] opacity-70">({readyCount}/{total})</span>
          )}
          {missing.length > 0 && (
            expanded ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />
          )}
        </button>

        {expanded && missing.length > 0 && (
          <div className="absolute top-full mt-1 z-10 min-w-[200px] max-w-[280px] bg-card border border-border rounded-lg shadow-lg p-2 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground px-1 pb-1">
              {t("النواقص", "Missing")}
            </p>
            {missing.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 px-1.5 py-1 text-xs text-foreground">
                <XCircle className="w-3 h-3 text-destructive shrink-0" aria-hidden="true" />
                <span>{t(item.label_ar, item.label_en)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full size — for detail pages
  return (
    <div className={cn("rounded-lg border p-3", colorClass)}>
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon className="w-4 h-4" aria-hidden="true" />
        <span className="text-sm font-semibold">{t("جاهزية الأدلة", "Evidence Readiness")}</span>
        <span className="text-xs font-medium ml-auto">{t(statusLabel.ar, statusLabel.en)}</span>
      </div>
      {total > 0 && (
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {item.ready ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" aria-hidden="true" />
              )}
              <span className={item.ready ? "text-muted-foreground line-through" : "text-foreground"}>
                {t(item.label_ar, item.label_en)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}