import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { Calendar } from "lucide-react";
import { formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

const MEETING_STATUS = {
  scheduled: { ar: "مجدول", en: "Scheduled", color: "bg-blue-100 text-blue-700" },
  in_progress: { ar: "جارية", en: "In Progress", color: "bg-emerald-100 text-emerald-700" },
  adjourned: { ar: "مرفوعة", en: "Adjourned", color: "bg-amber-100 text-amber-700" },
  completed: { ar: "مكتملة", en: "Completed", color: "bg-secondary text-muted-foreground" },
  cancelled: { ar: "ملغاة", en: "Cancelled", color: "bg-red-100 text-red-700" },
};

export default function CommitteeCalendar() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("calendar");
  if (!data) return null;
  const all = [...(data.meetings?.upcoming || []), ...(data.meetings?.previous || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("تقويم الاجتماعات", "Meeting Calendar")}</h1>
      </div>
      {all.length === 0 ? (
        <EmptyState icon={Calendar} title={t("لا توجد اجتماعات", "No Meetings")} description={t("لم يتم جدولة أي اجتماعات لهذه اللجنة.", "No meetings scheduled for this committee.")} />
      ) : (
        <div className="space-y-2">
          {all.map((m) => {
            const si = MEETING_STATUS[m.status] || MEETING_STATUS.scheduled;
            return (
              <div key={m.id} className="raqeem-card p-4 flex items-center gap-4">
                <div className="text-center shrink-0 w-14">
                  <div className="text-lg font-bold text-primary">{new Date(m.date).getDate()}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{new Date(m.date).toLocaleDateString("en", { month: "short" })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.title || m.title_ar}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)}</div>
                  {m.location && <div className="text-xs text-muted-foreground mt-0.5">{m.location}</div>}
                </div>
                <StatusBadge label={t(si.ar, si.en)} colorClass={si.color} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}