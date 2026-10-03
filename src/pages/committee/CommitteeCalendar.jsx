import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { Calendar, Filter } from "lucide-react";
import { formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

const MEETING_STATUS = {
  scheduled: { ar: "مجدول", en: "Scheduled", color: "bg-secondary text-muted-foreground" },
  in_progress: { ar: "جارية", en: "In Progress", color: "bg-emerald-50 text-emerald-700" },
  adjourned: { ar: "مرفوعة", en: "Adjourned", color: "bg-amber-50 text-amber-700" },
  completed: { ar: "مكتملة", en: "Completed", color: "bg-secondary text-muted-foreground" },
  cancelled: { ar: "ملغاة", en: "Cancelled", color: "bg-red-50 text-red-700" },
};

const MODE_LABELS = {
  physical: { ar: "حضوري", en: "Physical" },
  online: { ar: "افتراضي", en: "Online" },
  hybrid: { ar: "مختلط", en: "Hybrid" },
};

export default function CommitteeCalendar() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("calendar");
  const { orgRef, committeeRef } = useParams();
  const [statusFilter, setStatusFilter] = useState("all");
  const [modeFilter, setModeFilter] = useState("all");

  if (!data) return <TableSkeleton rows={4} />;
  const base = `/o/${orgRef}/c/${committeeRef}`;
  let all = [...(data.meetings?.upcoming || []), ...(data.meetings?.previous || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (statusFilter !== "all") all = all.filter((m) => m.status === statusFilter);
  if (modeFilter !== "all") all = all.filter((m) => m.mode === modeFilter);

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Calendar}
        title={getTitle("تقويم الاجتماعات", "Meeting Calendar", lang)}
        badge={<span className="text-sm text-muted-foreground">({all.length})</span>}
      />

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <select aria-label={t("تصفية الحالة", "Status filter")} className="h-8 rounded-md border border-input px-2 text-xs bg-transparent" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t("كل الحالات", "All Statuses")}</option>
          <option value="scheduled">{t("مجدول", "Scheduled")}</option>
          <option value="completed">{t("مكتملة", "Completed")}</option>
          <option value="cancelled">{t("ملغاة", "Cancelled")}</option>
        </select>
        <select aria-label={t("تصفية الوضع", "Mode filter")} className="h-8 rounded-md border border-input px-2 text-xs bg-transparent" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)}>
          <option value="all">{t("كل الأنواع", "All Modes")}</option>
          <option value="physical">{t("حضوري", "Physical")}</option>
          <option value="online">{t("افتراضي", "Online")}</option>
          <option value="hybrid">{t("مختلط", "Hybrid")}</option>
        </select>
      </div>

      {all.length === 0 ? (
        <EmptyState icon={Calendar} title={t("لا توجد اجتماعات", "No Meetings")} description={t("لم يتم جدولة أي اجتماعات لهذه اللجنة.", "No meetings scheduled for this committee.")} />
      ) : (
        <div className="space-y-2">
          {all.map((m) => {
            const si = MEETING_STATUS[m.status] || MEETING_STATUS.scheduled;
            const mi = MODE_LABELS[m.mode] || MODE_LABELS.hybrid;
            return (
              <Link key={m.id} to={`${base}/meetings/${m.id}`} className="raqeem-card p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
                <div className="text-center shrink-0 w-14">
                  <div className="text-lg font-bold text-primary">{new Date(m.date).getDate()}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">{new Date(m.date).toLocaleDateString(lang === "ar" ? "ar-QA" : "en", { month: "short" })}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.title || m.title_ar}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(m.date)} · {t(mi.ar, mi.en)}</div>
                  {m.location && <div className="text-xs text-muted-foreground mt-0.5">{m.location}</div>}
                </div>
                <StatusBadge label={t(si.ar, si.en)} colorClass={si.color} />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}