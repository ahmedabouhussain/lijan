import React from "react";
import { cn } from "@/lib/utils";

export function LoadingSkeleton({ className, lines = 3 }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted rounded animate-pulse"
          style={{ width: `${100 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="raqeem-card p-4 space-y-3">
      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      <div className="h-3 w-full bg-muted rounded animate-pulse" />
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="raqeem-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="raqeem-card p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
            <div className="h-2 w-1/2 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 w-16 bg-muted rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;