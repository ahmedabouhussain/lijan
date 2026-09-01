import React from "react";
import { Link } from "react-router-dom";
import { MessageSquareText, Gavel, Calendar, FileText } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";

const STATUS_CONFIG = {
  open: { label: "مفتوح", colorClass: "bg-blue-50 text-blue-700" },
  concluded: { label: "مُختتم", colorClass: "bg-emerald-50 text-emerald-700" },
  deferred: { label: "مؤجل", colorClass: "bg-amber-50 text-amber-700" },
  archived: { label: "مؤرشف", colorClass: "bg-slate-100 text-slate-600" },
};

export default function DeliberationCard({ deliberation, committeeName, decisionTitle, decisionLink }) {
  const status = STATUS_CONFIG[deliberation.status] || STATUS_CONFIG.concluded;
  const date = deliberation.deliberated_at
    ? new Date(deliberation.deliberated_at).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" })
    : "—";

  return (
    <div className="raqeem-card p-5 hover:shadow-md transition-shadow flex flex-col">
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
        <StatusBadge label={status.label} colorClass={status.colorClass} />
      </div>

      <p className="text-sm text-muted-foreground line-clamp-3 mb-3 flex-1">
        {deliberation.discussion_summary}
      </p>

      {deliberation.outcome && (
        <div className="mb-3 p-2.5 rounded-md bg-secondary/50">
          <p className="text-xs font-medium text-muted-foreground mb-0.5">النتيجة</p>
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