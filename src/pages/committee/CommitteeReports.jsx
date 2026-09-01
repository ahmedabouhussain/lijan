import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { BarChart3 } from "lucide-react";

export default function CommitteeReports() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  if (!data) return null;
  const { counters, committee } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("تقارير اللجنة", "Committee Reports")}</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("الأعضاء", "Members"), value: counters?.members || 0 },
          { label: t("الاجتماعات", "Meetings"), value: counters?.meetings || 0 },
          { label: t("القرارات", "Decisions"), value: counters?.decisions || 0 },
          { label: t("الإجراءات", "Actions"), value: counters?.actions || 0 },
        ].map((s, i) => (
          <div key={i} className="raqeem-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="raqeem-card p-6 text-center">
        <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{t("تقارير تفصيلية مجدولة للبوابة التنفيذية القادمة", "Detailed reports scheduled for the next execution gate")}</p>
      </div>
    </div>
  );
}