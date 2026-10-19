import React from "react";
import { L } from "@/lib/l10n";
import { ACTION_STATUS } from "@/lib/raqeemUtils";
import { cn } from "@/lib/utils";

/**
 * SovereignCard — Apple-inspired floating card for Qatar sovereign design.
 * White bg, rounded 20px, subtle multi-layer shadow, hover lift 2-4px.
 * Transitions 160-220ms. Respects prefers-reduced-motion via CSS.
 */
export default function SovereignCard({
  children,
  className,
  interactive = false,
  as: Comp = "div",
  ...props
}) {
  return (
    <Comp
      className={cn(
        interactive ? "raqeem-card-interactive sovereign-focus" : "raqeem-card",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

/**
 * TaskCard — a single actionable item in the Work Inbox.
 * Shows: action title, committee, reason, assignee, deadline, priority, one primary button.
 */
export function TaskCard({ icon: Icon, title, reason, committee, deadline, priority, actionLabel, onAction, to, status }) {
  const priorityStyles = {
    urgent: "bg-primary text-primary-foreground",
    high: "bg-primary/10 text-primary border border-primary/20",
    normal: "bg-secondary text-secondary-foreground",
    low: "bg-muted text-muted-foreground",
  };

  // One language per page: the label follows the active language, never a fixed literal.
  const priorityLabels = {
    urgent: { ar: "عاجل", en: "Urgent" },
    high: { ar: "مرتفع", en: "High" },
    normal: { ar: "عادي", en: "Normal" },
    low: { ar: "منخفض", en: "Low" },
  };
  // A stored value is resolved to the active language's label — a raw key
  // (in_review, under_review …) is never printed to the reader.
  const statusLabel =
    status && /^[a-z][a-z_]*$/.test(status)
      ? L.label(ACTION_STATUS, status, L.pair("غير مصنّف", "Unclassified"))
      : status;

  return (
    <SovereignCard interactive={to ? false : true} className="p-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/5">
            <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-semibold text-foreground leading-snug">{title}</h4>
            {priority && (
              <span className={cn("shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full", priorityStyles[priority])}>
                {priorityLabels[priority] ? L.label(priorityLabels, priority) : priority}
              </span>
            )}
          </div>
          {reason && <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>}
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground pt-1">
            {committee && <span className="inline-flex items-center gap-1">{committee}</span>}
            {deadline && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-0.5">{deadline}</span>
              </>
            )}
            {status && (
              <>
                <span aria-hidden="true">·</span>
                <span>{statusLabel}</span>
              </>
            )}
          </div>
          {actionLabel && (
            <div className="pt-2">
              {to ? (
                <a
                  href={to}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors touch-target sovereign-focus"
                >
                  {actionLabel}
                </a>
              ) : (
                <button
                  onClick={onAction}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors touch-target sovereign-focus"
                >
                  {actionLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </SovereignCard>
  );
}