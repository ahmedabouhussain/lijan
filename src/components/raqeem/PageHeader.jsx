import React from "react";
import { cn } from "@/lib/utils";

export default function PageHeader({ icon: Icon, title, subtitle, actions, badge }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-border">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 ring-1 ring-primary/12">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground truncate">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}