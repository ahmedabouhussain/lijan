import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, sublabel, to, accent, trend }) {
  const Wrapper = to ? "a" : "div";
  const wrapperProps = to ? { href: to } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "raqeem-card p-4 relative overflow-hidden group transition-all duration-200",
        to && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      )}
    >
      {accent && (
        <div
          className="absolute top-0 left-0 w-1 h-full"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground leading-tight mb-1 uppercase tracking-wide">{label}</div>
          <div className="text-lg font-bold text-foreground truncate leading-tight">{value}</div>
          {sublabel && (
            <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sublabel}</div>
          )}
          {trend !== undefined && (
            <div className={cn(
              "text-[10px] font-medium mt-1 inline-flex items-center gap-0.5",
              trend >= 0 ? "text-green-600" : "text-destructive"
            )}>
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </Wrapper>
  );
}