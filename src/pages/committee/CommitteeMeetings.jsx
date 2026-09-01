import React from "react";
import { Link } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { MEETING_STATUS, formatDate } from "@/lib/raqeemUtils";
import { Calendar } from "lucide-react";

export default function CommitteeMeetings() {
  const { data } = useCommittee();
  const { t } = useLanguage();

  if (!data) return null;
  const { meetings, committee } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("اجتماعات اللجنة", "Committee Meetings")}</h1>
      </div>

      {/* Upcoming */}
      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold mb-3">{t("القادمة", "Upcoming")} ({meetings.upcoming.length})</h3>
        {meetings.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد اجتماعات قادمة", "No upcoming meetings")}</p>
        ) : (
          <div className="space-y-2">
            {meetings.upcoming.map((m) => (
              <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div>
                  <div className="text-sm font-medium text-foreground">{m.title || m.title_ar}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)} · {m.mode}</div>
                </div>
                <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Previous */}
      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold mb-3">{t("السابقة", "Previous")} ({meetings.previous.length})</h3>
        {meetings.previous.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد اجتماعات سابقة", "No previous meetings")}</p>
        ) : (
          <div className="space-y-2">
            {meetings.previous.map((m) => (
              <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-secondary/30 -mx-2 px-2 rounded">
                <div>
                  <div className="text-sm font-medium text-foreground">{m.title || m.title_ar}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)}</div>
                </div>
                <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}