import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import LocalizedField from "@/components/raqeem/LocalizedField";
import { L } from "@/lib/l10n";
import { MEETING_STATUS, DECISION_STATUS, formatDate } from "@/lib/raqeemUtils";
import { Calendar, FileText, Gavel, Lock } from "lucide-react";

export default function ObserverHome({ data }) {
  const { t } = useLanguage();
  const { meetings, registers } = data;

  const upcoming = meetings.upcoming || [];
  const previous = meetings.previous || [];
  const issuedDecisions = (registers.decisions || []).filter((d) => ["issued", "executing", "completed", "closed"].includes(d.status));
  const issuedMinutes = (registers.minutes || []).filter((m) => ["approved", "issued"].includes(m.status));

  return (
    <div className="space-y-4">
      {/* Read-only notice */}
      <div className="raqeem-card p-4 border-s-4 border-s-state-info-ink">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-state-info-ink shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-foreground">{t("وضع المراقب", "Observer Mode")}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {t(
                "يمكنك عرض الاجتماعات والوثائق المنشورة فقط. لا توجد ضوابط تشغيلية متاحة.",
                "You can view authorized meetings and published documents only. No operational controls are available."
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Authorized meetings */}
      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          {t("الاجتماعات المعتمدة", "Authorized Meetings")}
        </h3>
        {upcoming.length === 0 && previous.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد اجتماعات", "No meetings")}</p>
        ) : (
          <div className="space-y-2">
            {upcoming.slice(0, 3).map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{L.title(m)}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)}</div>
                </div>
                <StatusBadge label={t(MEETING_STATUS[m.status]?.ar || m.status, MEETING_STATUS[m.status]?.en || m.status)} colorClass={MEETING_STATUS[m.status]?.color} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Published records */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {t("المحاضر المنشورة", "Published Minutes")}
          </h3>
          {issuedMinutes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد محاضر منشورة", "No published minutes")}</p>
          ) : (
            <div className="space-y-2">
              {issuedMinutes.slice(0, 5).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="text-sm text-foreground">{t("محضر", "Minutes")} {m.minutes_number || "—"}</div>
                  <span className="text-[11px] text-emerald-700 font-medium">{t("منشور", "Published")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="raqeem-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Gavel className="w-4 h-4 text-primary" />
            {t("القرارات الصادرة", "Issued Decisions")}
          </h3>
          {issuedDecisions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد قرارات صادرة", "No issued decisions")}</p>
          ) : (
            <div className="space-y-2">
              {issuedDecisions.slice(0, 5).map((d) => (
                <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="text-sm text-foreground truncate"><LocalizedField entity="Decision" record={d} base="title" /></div>
                  <StatusBadge label={t(DECISION_STATUS[d.status]?.ar || d.status, DECISION_STATUS[d.status]?.en || d.status)} colorClass={DECISION_STATUS[d.status]?.color} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}