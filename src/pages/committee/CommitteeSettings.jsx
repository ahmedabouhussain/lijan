import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import { Settings } from "lucide-react";

export default function CommitteeSettings() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("settings");
  if (!data) return null;
  const { committee, mandate, my_role, is_oversight } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("إعدادات اللجنة", "Committee Settings", lang)}</h1>
      </div>

      {is_oversight && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
          {t("وضع الإشراف: لا يمكنك تعديل إعدادات اللجنة", "Oversight mode: you cannot modify committee settings")}
        </div>
      )}

      <div className="raqeem-card p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("الحالة", "Status")}</span>
          <StatusBadge label={COMMITTEE_STATUS[committee.status]?.ar || committee.status} colorClass={COMMITTEE_STATUS[committee.status]?.color} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("النوع", "Type")}</span>
          <span className="font-medium">{committee.type}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("قاعدة التصويت", "Voting Rule")}</span>
          <span className="font-medium">{committee.voting_rule}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("النصاب", "Quorum")}</span>
          <span className="font-medium">{committee.quorum_count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("دورة الاجتماعات", "Meeting Cadence")}</span>
          <span className="font-medium">{committee.meeting_cadence}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t("التصنيف", "Classification")}</span>
          <span className="font-medium">{committee.classification}</span>
        </div>
      </div>

      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold mb-2">{t("الصلاحية", "Mandate")}</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">{mandate?.text || committee.mandate || t("غير محدد", "Not defined")}</p>
      </div>
    </div>
  );
}