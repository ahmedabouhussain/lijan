import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, FileSpreadsheet, FileText, Loader2, Presentation, Shield } from "lucide-react";
import { CLASSIFICATION_LABELS, FORMAT_LABELS } from "@/lib/docs/releaseLabels";
import { cn } from "@/lib/utils";

const FORMAT_ICONS = {
  docx: FileText,
  pdf: FileText,
  pptx: Presentation,
  xlsx: FileSpreadsheet,
  zip: FileText,
};

export default function DocumentCard({ item, isAr, t, onDownload, busy, categoryLabel }) {
  const title = isAr ? item.title_ar : item.title_en;
  const purpose = isAr ? item.purpose_ar : item.purpose_en;
  const classification = CLASSIFICATION_LABELS[item.classification];

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
        </div>
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[10px]">
          {categoryLabel}
        </Badge>
        {item.editable && (
          <Badge variant="secondary" className="text-[10px]">
            {isAr ? "قابل للتحرير" : "Editable"}
          </Badge>
        )}
        {item.archival && (
          <Badge variant="secondary" className="text-[10px]">
            {isAr ? "أرشيفي" : "Archival"}
          </Badge>
        )}
      </div>

      <p className="line-clamp-2 flex-1 text-xs text-muted-foreground">{purpose}</p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="font-medium">{isAr ? "الإصدار" : "Ver"}:</span>
          <span className="tabular-nums">{item.version}</span>
        </span>
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" aria-hidden="true" />
          {isAr ? classification?.ar : classification?.en}
        </span>
        <span className="col-span-2 truncate">
          <span className="font-medium">{isAr ? "المالك" : "Owner"}:</span> {item.owner}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
        {item.files.map((file) => {
          const Icon = FORMAT_ICONS[file.format] || FileText;
          const state = busy[file.asset_key];
          const label = FORMAT_LABELS[file.format] || file.format.toUpperCase();
          return (
            <button
              key={file.asset_key}
              type="button"
              onClick={() => onDownload(file)}
              disabled={state === "loading"}
              title={file.filename}
              aria-label={t(
                `تنزيل ${title} بصيغة ${label}`,
                `Download ${title} as ${label}`
              )}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                state === "success"
                  ? "bg-emerald-50 text-emerald-700"
                  : state === "error"
                  ? "bg-red-50 text-destructive"
                  : "bg-secondary/50 text-foreground hover:bg-secondary",
                state === "loading" && "opacity-70"
              )}
            >
              {state === "loading" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : state === "success" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}