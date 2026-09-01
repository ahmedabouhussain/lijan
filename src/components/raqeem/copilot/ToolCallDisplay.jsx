import React, { useState } from "react";
import { ChevronDown, ChevronRight, Check, X, Loader2, Wrench } from "lucide-react";

const STATUS_META = {
  pending: { Icon: Loader2, cls: "text-muted-foreground", spin: true, label: "بانتظار" },
  running: { Icon: Loader2, cls: "text-blue-500", spin: true, label: "جارٍ التنفيذ" },
  in_progress: { Icon: Loader2, cls: "text-blue-500", spin: true, label: "جارٍ التنفيذ" },
  completed: { Icon: Check, cls: "text-green-600", label: "اكتمل" },
  success: { Icon: Check, cls: "text-green-600", label: "تم" },
  failed: { Icon: X, cls: "text-destructive", label: "فشل" },
  error: { Icon: X, cls: "text-destructive", label: "خطأ" },
};

function safeParse(val) {
  if (typeof val === "string") { try { return JSON.parse(val); } catch { return val; } }
  return val;
}

export default function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = STATUS_META[toolCall.status] || STATUS_META.pending;
  const proj = toolCall.display_projection || {};
  const hideAll = proj.hide_details && proj.details_redacted;
  const args = safeParse(toolCall.arguments_string);
  const results = safeParse(toolCall.results);
  const failed = ["failed", "error"].includes(toolCall.status) || (results && typeof results === "object" && results.success === false);
  const stateLabel = failed ? (proj.error_label || meta.label) : ["pending", "running", "in_progress"].includes(toolCall.status) ? (proj.active_label || meta.label) : (proj.label || meta.label);
  const { Icon, cls, spin } = meta;

  return (
    <div className="mt-2 rounded-md border border-border bg-secondary/30 text-xs">
      <button onClick={() => !hideAll && setExpanded(!expanded)} className="flex w-full items-center gap-2 px-2.5 py-1.5" disabled={hideAll}>
        {!hideAll && (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3 rotate-180" />)}
        <Wrench className={`w-3 h-3 ${cls}`} />
        <span className="font-medium text-foreground">{toolCall.name}</span>
        <span className={cls}>{stateLabel}</span>
        {spin && <Icon className={`w-3 h-3 animate-spin ${cls} ms-auto`} />}
      </button>
      {!hideAll && expanded && (
        <div className="px-2.5 pb-2 space-y-1.5">
          <div><span className="text-muted-foreground">المعطيات:</span><pre className="mt-0.5 whitespace-pre-wrap break-words bg-card rounded p-1.5">{JSON.stringify(args, null, 2)}</pre></div>
          {results !== undefined && <div><span className="text-muted-foreground">النتيجة:</span><pre className="mt-0.5 whitespace-pre-wrap break-words bg-card rounded p-1.5">{JSON.stringify(results, null, 2)}</pre></div>}
        </div>
      )}
    </div>
  );
}