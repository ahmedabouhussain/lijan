import React from "react";
import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, to, accent }) {
  const Wrapper = to ? "a" : "div";
  const wrapperProps = to ? { href: to } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "raqeem-card p-3.5 relative overflow-hidden group transition-all",
        to && "hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
      )}
    >
      {accent && (
        <div
          className="absolute top-0 left-0 w-1 h-full"
          style={{ background: accent }}
        />
      )}
      <div className="flex items-start gap-2.5">
        {Icon && (
          <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
            <Icon className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground leading-tight mb-0.5">{label}</div>
          <div className="text-sm font-semibold text-foreground truncate">{value}</div>
        </div>
      </div>
    </Wrapper>
  );
}