import React from "react";
import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className, lines = 3 }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted/70 rounded-md sovereign-shimmer"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="h-4 w-24 bg-muted/70 rounded-md sovereign-shimmer" />
      <div className="h-8 w-32 bg-muted/70 rounded-md sovereign-shimmer" />
      <div className="h-3 w-full bg-muted/70 rounded-md sovereign-shimmer" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="raqeem-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted/70 sovereign-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 bg-muted/70 rounded-md sovereign-shimmer" />
        <div className="h-5 w-16 bg-muted/70 rounded-md sovereign-shimmer" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="raqeem-card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted/70 sovereign-shimmer" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/3 bg-muted/70 rounded-md sovereign-shimmer" />
            <div className="h-2 w-1/2 bg-muted/70 rounded-md sovereign-shimmer" />
          </div>
          <div className="h-6 w-16 bg-muted/70 rounded-md sovereign-shimmer" />
        </div>
      ))}
    </div>
  );
}

/** Full-page skeleton — header + content blocks for page-level loading */
export function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 pb-3 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-muted/70 sovereign-shimmer shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-48 bg-muted/70 rounded-md sovereign-shimmer" />
          <div className="h-3 w-72 bg-muted/70 rounded-md sovereign-shimmer" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="raqeem-card p-5 space-y-3">
            <div className="h-4 w-32 bg-muted/70 rounded-md sovereign-shimmer" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-muted/70 rounded-md sovereign-shimmer" />
              <div className="h-3 w-3/4 bg-muted/70 rounded-md sovereign-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Workspace skeleton — org cards with committee rows */
export function WorkspaceSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-6 w-64 bg-muted/70 rounded-md sovereign-shimmer" />
        <div className="h-4 w-80 bg-muted/70 rounded-md sovereign-shimmer" />
      </div>
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="raqeem-card overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <div className="w-10 h-10 rounded-md bg-muted/70 sovereign-shimmer shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 bg-muted/70 rounded-md sovereign-shimmer" />
              <div className="h-3 w-56 bg-muted/70 rounded-md sovereign-shimmer" />
            </div>
          </div>
          <div className="border-t border-border divide-y divide-border">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded bg-muted/70 sovereign-shimmer shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-48 bg-muted/70 rounded-md sovereign-shimmer" />
                  <div className="h-2 w-32 bg-muted/70 rounded-md sovereign-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;