import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { Package, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/raqeemUtils";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

export default function CommitteePacks() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle } = usePageConfig("packs");
  const { canManageMinutes } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [generatingId, setGeneratingId] = useState(null);

  if (!data) return <TableSkeleton rows={4} />;
  const upcoming = data.meetings?.upcoming || [];
  const committeeId = data.committee.id;

  const handleGenerate = async (meetingId) => {
    await execute("PublishMeetingPack", {
      committee_id: committeeId,
      meeting_id: meetingId,
    }, () => {
      setGeneratingId(null);
      reload();
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader icon={Package} title={getTitle("حزم الاجتماعات", "Meeting Packs", lang)} />
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
                  colorClass={m.agenda_ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                />
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(m.date, "PPp")}</p>
              {m.location && <p className="text-xs text-muted-foreground mt-1">{m.location}</p>}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("النصاب المطلوب", "Quorum Required")}: {m.quorum_required}</span>
                {canManageMinutes && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={submitting && generatingId === m.id}
                    onClick={() => { setGeneratingId(m.id); handleGenerate(m.id); }}
                    className="min-h-[36px]"
                  >
                    {submitting && generatingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {t("إنشاء الحزمة", "Generate Pack")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}