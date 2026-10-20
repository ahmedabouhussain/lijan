import React from "react";
import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-16 px-6", className)}>
      {Icon && (
        <div className="relative mb-5">
          <div className="w-16 h-16 rounded-card bg-accent/8 flex items-center justify-center ring-1 ring-accent/15">
            <Icon className="w-7 h-7 text-accent" aria-hidden="true" />
          </div>
        </div>
      )}
      <h3 className="ui-section text-foreground mb-1.5">{title}</h3>
      {description && <p className="ui-meta text-muted-foreground max-w-sm mb-5">{description}</p>}
      {action}
    </div>
  );
}