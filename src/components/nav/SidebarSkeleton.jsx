import React from "react";
import { cn } from "@/lib/utils";

// Shell loading states — a quiet, institutional skeleton. It never invents content: it
// echoes the real shell's four regions so the layout does not jump when data arrives.

export function SidebarSkeleton({ collapsed = false }) {
  return (
    <div className={cn("hidden lg:flex shrink-0 bg-sidebar flex-col", collapsed ? "w-[76px]" : "w-[296px]")}>
      <div className="px-3 py-3 border-b border-sidebar-border flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-md bg-sidebar-foreground/15 sovereign-shimmer" />
        <div className="h-4 w-24 bg-sidebar-foreground/15 rounded sovereign-shimmer" />
      </div>
      <div className="px-3 py-3 border-b border-sidebar-border space-y-2">
        <div className="h-3 w-24 bg-sidebar-foreground/10 rounded sovereign-shimmer" />
        <div className="h-9 w-16 bg-sidebar-foreground/15 rounded sovereign-shimmer" />
        <div className="h-3 w-full bg-sidebar-foreground/10 rounded sovereign-shimmer" />
        <div className="h-3 w-2/3 bg-sidebar-foreground/10 rounded sovereign-shimmer" />
      </div>
      <div className="flex-1 px-3 py-3 space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-[46px] bg-sidebar-foreground/10 rounded-md sovereign-shimmer" />
        ))}
      </div>
      <div className="px-3 py-3 border-t border-sidebar-border">
        <div className="h-[46px] bg-sidebar-foreground/10 rounded-md sovereign-shimmer" />
      </div>
    </div>
  );
}

export default function ShellLoading({ dir = "rtl" }) {
  return (
    <div className="min-h-app bg-background flex" dir={dir}>
      <SidebarSkeleton />
      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden h-14 border-b border-border bg-card" />
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-4">
          <div className="h-6 w-48 bg-muted/70 rounded-md sovereign-shimmer" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="raqeem-card p-5 space-y-3">
                <div className="h-4 w-32 bg-muted/70 rounded-md sovereign-shimmer" />
                <div className="h-3 w-full bg-muted/70 rounded-md sovereign-shimmer" />
                <div className="h-3 w-3/4 bg-muted/70 rounded-md sovereign-shimmer" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}