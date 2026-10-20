import React from "react";

// PageHeader — one header contract for every surface: an icon tile, the title with its
// optional badge, one supporting line, and the surface's actions on the far side.
// Hierarchy is carried by size and weight only (Arabic keeps zero tracking), and the
// section closes on one gold hairline rather than a full box edge.
export default function PageHeader({ icon: Icon, title, subtitle, actions, badge }) {
  return (
    <div className="lijan-hairline flex flex-wrap items-start justify-between gap-3 mb-section pb-4">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="shrink-0 w-10 h-10 rounded-control flex items-center justify-center bg-primary/[0.08] ring-1 ring-primary/15">
            <Icon className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="ui-title text-foreground truncate">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="ui-meta text-muted-foreground mt-1.5 line-clamp-2">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}