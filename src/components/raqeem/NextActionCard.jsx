import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

export default function NextActionCard({ to, icon: Icon, title, subtitle, urgency = "normal", actionLabel }) {
  const { t } = useLanguage();

  const urgencyStyles = {
    critical: "border-state-danger-ink/25 bg-state-danger-surface",
    high: "border-state-warning-ink/25 bg-state-warning-surface",
    normal: "border-border bg-card",
  };

  const urgencyBars = {
    critical: "bg-state-danger-ink",
    high: "bg-state-warning-ink",
    normal: "bg-primary",
  };

  const iconStyles = {
    critical: "text-state-danger-ink bg-state-danger-surface",
    high: "text-state-warning-ink bg-state-warning-surface",
    normal: "text-primary bg-primary/10",
  };

  return (
    <Link
      to={to}
      className={cn(
        "block raqeem-card p-4 relative overflow-hidden transition-all hover:shadow-elevation-3 hover:-translate-y-0.5",
        urgencyStyles[urgency]
      )}
    >
      <div className={cn("absolute top-0 left-0 w-1 h-full", urgencyBars[urgency])} />
      <div className="flex items-start gap-3 pl-1.5">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", iconStyles[urgency])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            {t("الإجراء التالي المطلوب", "Next Required Action")}
          </div>
          <div className="text-base font-bold text-foreground">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtitle}</div>}
          {actionLabel && (
            <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-primary">
              {actionLabel}
              <ArrowLeft className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}