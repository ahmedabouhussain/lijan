import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/lib/LanguageContext";
import SovereignCard from "@/components/raqeem/SovereignCard";
import { Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * ChairBrief™ — calm one-glance brief for the committee chair.
 * Shows: committee health, next meeting readiness, "جهّزني للاجتماع" action.
 * Not a dashboard — a thin, focused strip that complements the WorkInbox.
 */
export default function ChairBrief({ data, base }) {
  const { t, lang } = useLanguage();
  if (!data) return null;

  const { meetings, registers, my_role } = data;
  if (!["chair", "vice_chair"].includes(my_role)) return null;

  const upcoming = meetings?.upcoming || [];
  const nextMeeting = upcoming[0];
  const now = new Date();

  // Health indicator — based on real signals, not fake scores
  const overdueActions = (registers?.actions || []).filter(
    (a) => a.deadline && a.status !== "closed" && new Date(a.deadline) < now
  );
  const pendingDecisions = (registers?.decisions || []).filter(
    (d) => d.status === "pending_approval" || d.status === "draft"
  );

  let healthStatus = "stable";
  let healthLabel = { ar: "مستقرة", en: "Stable" };
  let healthIcon = CheckCircle2;
  let healthColor = "text-emerald-600";

  if (overdueActions.length > 2 || pendingDecisions.length > 3) {
    healthStatus = "critical";
    healthLabel = { ar: "تحتاج متابعة", en: "Needs Attention" };
    healthIcon = AlertCircle;
    healthColor = "text-primary";
  }

  const HealthIcon = healthIcon;

  return (
    <SovereignCard className="p-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Health indicator */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/5">
            <HealthIcon className={`w-4 h-4 ${healthColor}`} aria-hidden="true" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {t("حالة اللجنة", "Committee Health")}
            </p>
            <p className="text-sm font-semibold text-foreground">
              {lang === "ar" ? healthLabel.ar : healthLabel.en}
            </p>
          </div>
        </div>

        {/* Quick stats — only meaningful numbers */}
        <div className="flex items-center gap-4 text-xs">
          {pendingDecisions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("قرارات معلقة", "Pending Decisions")}</span>
              <span className="font-semibold text-foreground">{pendingDecisions.length}</span>
            </div>
          )}
          {overdueActions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{t("إجراءات متأخرة", "Overdue Actions")}</span>
              <span className="font-semibold text-primary">{overdueActions.length}</span>
            </div>
          )}
        </div>

        {/* Prepare me for meeting — only if meeting exists */}
        {nextMeeting && (
          <Link
            to={`${base}/meetings/${nextMeeting.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors touch-target sovereign-focus"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {t("جهّزني للاجتماع", "Prepare Me for Meeting")}
          </Link>
        )}
      </div>
    </SovereignCard>
  );
}