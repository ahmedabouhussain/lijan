import React from "react";
import { Link } from "react-router-dom";
import { MessageSquareText, Gavel, Calendar, FileText } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { useLanguage } from "@/lib/LanguageContext";
import { dateOf } from "@/lib/l10n";

const STATUS_CONFIG = {
  open: { ar: "مفتوح", en: "Open", colorClass: "bg-state-info-surface text-state-info-ink" },
  concluded: { ar: "مُختتم", en: "Concluded", colorClass: "bg-state-success-surface text-state-success-ink" },
  deferred: { ar: "مؤجل", en: "Deferred", colorClass: "bg-state-warning-surface text-state-warning-ink" },
  archived: { ar: "مؤرشف", en: "Archived", colorClass: "bg-state-neutral-surface text-state-neutral-ink" },
};

export default function DeliberationCard({ deliberation, committeeName, decisionTitle, decisionLink }) {
  const { t, lang } = useLanguage();
  const status = STATUS_CONFIG[deliberation.status] || STATUS_CONFIG.concluded;
  const date = deliberation.deliberated_at ? dateOf(deliberation.deliberated_at, lang) : "—";

  return (
    <div className="raqeem-card p-5 hover:shadow-elevation-3 transition-shadow flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <MessageSquareText className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground text-sm truncate">{deliberation.topic || deliberation.topic_ar}</h3>
            <p className="text-xs text-muted-foreground truncate">{committeeName || "—"}</p>
          </div>
        </div>
        <StatusBadge label={t(status.ar, status.en)} colorClass={status.colorClass} />
      </div>

      <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
        {deliberation.discussion_summary}
      </p>

      {deliberation.outcome && (
        <div className="mb-3 p-2.5 rounded-md bg-secondary/50">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">{t("النتيجة", "Outcome")}</p>
          <p className="text-sm text-foreground line-clamp-2">{deliberation.outcome}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {date}
          </span>
          {deliberation.deliberated_by && (
            <span className="flex items-center gap-1 truncate max-w-32">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              {deliberation.deliberated_by}
            </span>
          )}
        </div>
        {decisionLink && decisionTitle && (
          <Link
            to={decisionLink}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-dark shrink-0"
          >
            <Gavel className="w-3.5 h-3.5" />
            القرار المرتبط
          </Link>
        )}
      </div>
    </div>
  );
}