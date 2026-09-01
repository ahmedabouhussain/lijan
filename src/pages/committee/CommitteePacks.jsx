import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { Package } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate } from "@/lib/raqeemUtils";

export default function CommitteePacks() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("packs");
  if (!data) return null;
  const upcoming = data.meetings?.upcoming || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("حزم الاجتماعات", "Meeting Packs", lang)}</h1>
      </div>
      {upcoming.length === 0 ? (
        <EmptyState icon={Package} title={t("لا توجد حزم", "No Meeting Packs")} description={t("لا توجد اجتماعات قادمة.", "No upcoming meetings.")} />
      ) : (
        <div className="space-y-2">
          {upcoming.map((m) => (
            <div key={m.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{m.title || m.title_ar}</span>
                <StatusBadge
                  label={m.agenda_ready ? t("الحزمة جاهزة", "Pack Ready") : t("غير مكتملة", "Incomplete")}
                  colorClass={m.agenda_ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                />
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(m.date, "PPp")}</p>
              {m.location && <p className="text-xs text-muted-foreground mt-1">{m.location}</p>}
              <div className="mt-2 text-xs text-muted-foreground">
                {t("النصاب المطلوب", "Quorum Required")}: {m.quorum_required}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}