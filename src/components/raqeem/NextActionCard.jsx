import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { ArrowLeft, AlertTriangle, ShieldCheck, Lock, Clock, FileText, Gavel, CheckSquare, Calendar } from "lucide-react";

export default function NextActionCard({ to, icon: Icon, title, subtitle, urgency = "normal", actionLabel }) {
  const { t } = useLanguage();

  const urgencyStyles = {
    critical: "border-red-300 bg-red-50",
    high: "border-amber-300 bg-amber-50",
    normal: "border-border bg-card",
  };

  const iconStyles = {
    critical: "text-red-600",
    high: "text-amber-600",
    normal: "text-primary",
  };

  return (
    <Link
      to={to}
      className={cn(
        "block raqeem-card p-4 border-l-4 transition-colors hover:bg-secondary/30",
        urgencyStyles[urgency]
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", iconStyles[urgency])} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
            {t("الإجراء التالي المطلوب", "Next Required Action")}
          </div>
          <div className="text-sm font-bold text-foreground">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{subtitle}</div>}
          {actionLabel && (
            <div className="flex items-center gap-1 mt-2 text-xs font-medium text-primary">
              {actionLabel}
              <ArrowLeft className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}