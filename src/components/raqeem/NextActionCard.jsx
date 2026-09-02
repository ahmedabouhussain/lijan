import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { ArrowLeft, AlertTriangle, ShieldCheck, Lock, Clock, FileText, Gavel, CheckSquare, Calendar } from "lucide-react";

export default function NextActionCard({ to, icon: Icon, title, subtitle, urgency = "normal", actionLabel }) {
  const { t } = useLanguage();

  const urgencyStyles = {
    critical: "border-red-200 bg-red-50/50",
    high: "border-amber-200 bg-amber-50/50",
    normal: "border-border bg-card",
  };

  const urgencyBars = {
    critical: "bg-red-500",
    high: "bg-amber-500",
    normal: "bg-primary",
  };

  const iconStyles = {
    critical: "text-red-600 bg-red-100",
    high: "text-amber-600 bg-amber-100",
    normal: "text-primary bg-primary/10",
  };

  return (
    <Link
      to={to}
      className={cn(
        "block raqeem-card p-4 relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5",
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