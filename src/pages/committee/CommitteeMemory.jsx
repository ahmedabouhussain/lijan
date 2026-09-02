import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import { Brain, Loader2, Sparkles } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import MemorySectionRenderer from "@/components/raqeem/MemorySectionRenderer";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/raqeemUtils";

export default function CommitteeMemory() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("memory");
  const { canManageGovernance } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const committeeId = data?.committee?.id;

  const fetchRecords = async () => {
    if (!committeeId) return;
    try {
      const res = await base44.entities.AIOutputLedger.filter({ committee_id: committeeId, output_type: "institutional_memory" });
      setRecords(res || []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [committeeId]);

  const handleGenerate = async () => {
    await execute("CompileCommitteeMemory", { committee_id: committeeId, mode: "incremental" }, fetchRecords);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("ذاكرة اللجنة", "Committee Memory", lang)}</h1>
          <span className="text-sm text-muted-foreground">({records.length})</span>
        </div>
        {canManageGovernance && (
          <Button size="sm" variant="outline" disabled={submitting} onClick={handleGenerate} className="min-h-[44px]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t("توليد الذاكرة", "Generate Memory")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={Brain} title={t("لا توجد سجلات مؤسسية", "No Institutional Memory")} description={t("لم يتم أرشفة ذاكرة مؤسسية لهذه اللجنة.", "No institutional memory archived for this committee.")} />
      ) : (
        <div className="space-y-3">
          {records.map((r) => {
            let sections = [];
            try {
              sections = r.structured_content ? JSON.parse(r.structured_content) : [];
            } catch {}
            return (
              <div key={r.id} className="raqeem-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.source_title || t("ذاكرة مؤسسية", "Institutional Memory")}</span>
                  <StatusBadge
                    label={r.human_reviewed ? t("مراجَع", "Reviewed") : t("غير مراجَع", "Unreviewed")}
                    colorClass={r.human_reviewed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}
                  />
                </div>
                {sections.length > 0 ? (
                  <MemorySectionRenderer sections={sections} lang={lang} />
                ) : (
                  r.output_summary && <p className="text-sm text-muted-foreground">{r.output_summary}</p>
                )}
                <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                  {r.generated_by_name && <span>{r.generated_by_name} · </span>}
                  {r.generated_at && formatDate(r.generated_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}