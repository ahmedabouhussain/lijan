import React from "react";
import { GitCompare } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { CHANGE_LABEL } from "./annotationLabels";

// What changed between consecutive versions — by content fingerprint. It says plainly that a text
// comparison is not available in this build instead of implying one was made.
export default function VersionChangeStrip({ changes = [] }) {
  const { t } = useLanguage();
  if (!changes.length) return null;
  return (
    <div className="rounded-lg bg-muted/40 p-3 space-y-1.5">
      <p className="text-xs font-medium flex items-center gap-1.5">
        <GitCompare className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
        {t("تغيّرات الإصدارات", "Version changes")}
      </p>
      {changes.map((c) => {
        const label = CHANGE_LABEL[c.state] || CHANGE_LABEL.unknown;
        const summary = t(c.change_summary_ar || c.change_summary, c.change_summary || c.change_summary_ar);
        return (
          <p key={`${c.from_id}-${c.to_id}`} className="text-[11px] text-muted-foreground">
            {t(`الإصدار ${c.from_version} ← ${c.to_version}`, `Version ${c.from_version} → ${c.to_version}`)}: {t(label[0], label[1])}
            {Number.isFinite(c.size_delta) && c.size_delta !== 0 ? ` · ${c.size_delta > 0 ? "+" : ""}${c.size_delta} B` : ""}
            {summary ? ` · ${summary}` : ""}
          </p>
        );
      })}
      <p className="text-[11px] text-muted-foreground">
        {t("مقارنة النص سطرًا بسطر غير متاحة في هذا البناء؛ المقارنة ببصمة المحتوى فقط.", "A line-by-line text comparison is not available in this build; the comparison is by content fingerprint only.")}
      </p>
    </div>
  );
}