import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import { Brain } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate } from "@/lib/raqeemUtils";

export default function CommitteeMemory() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("memory");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.committee?.id) return;
    base44.entities.AIOutputLedger.filter({ committee_id: data.committee.id, output_type: "institutional_memory" })
      .then((res) => setRecords(res || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [data?.committee?.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("ذاكرة اللجنة", "Committee Memory")}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={Brain} title={t("لا توجد سجلات مؤسسية", "No Institutional Memory")} description={t("لم يتم أرشفة ذاكرة مؤسسية لهذه اللجنة.", "No institutional memory archived for this committee.")} />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{r.source_title || t("ذاكرة مؤسسية", "Institutional Memory")}</span>
                <StatusBadge
                  label={r.human_reviewed ? t("مراجَع", "Reviewed") : t("غير مراجَع", "Unreviewed")}
                  colorClass={r.human_reviewed ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                />
              </div>
              {r.output_summary && <p className="text-xs text-muted-foreground">{r.output_summary}</p>}
              <div className="text-xs text-muted-foreground mt-1">
                {r.generated_by_name && <span>{r.generated_by_name} · </span>}
                {r.generated_at && formatDate(r.generated_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}