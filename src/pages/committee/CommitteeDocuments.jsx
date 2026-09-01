import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { FileText, Download } from "lucide-react";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate } from "@/lib/raqeemUtils";

export default function CommitteeDocuments() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("documents");
  if (!data) return null;

  // Documents are represented by issued minutes, decisions with proposals, and actions with evidence
  const minutes = (data.registers?.minutes || []).filter((m) => ["approved", "issued"].includes(m.status));
  const decisions = (data.registers?.decisions || []).filter((d) => ["issued", "executing", "completed"].includes(d.status));
  const actions = (data.registers?.actions || []).filter((a) => a.evidence_url);

  const docs = [
    ...minutes.map((m) => ({ id: m.id, type: t("محضر", "Minutes"), title: `${t("محضر", "Minutes")} ${m.minutes_number || ""}`, date: m.issued_date || m.approved_date, url: null })),
    ...decisions.map((d) => ({ id: d.id, type: t("قرار", "Decision"), title: d.title_ar || d.title, date: d.deadline, url: null })),
    ...actions.map((a) => ({ id: a.id, type: t("دليل", "Evidence"), title: a.title_ar || a.title, date: a.deadline, url: a.evidence_url })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("وثائق اللجنة", "Committee Documents")}</h1>
      </div>
      {docs.length === 0 ? (
        <EmptyState icon={FileText} title={t("لا توجد وثائق", "No Documents")} description={t("لم يتم إصدار وثائق رسمية لهذه اللجنة.", "No official documents issued for this committee.")} />
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="raqeem-card p-4 flex items-center gap-3">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{d.title}</div>
                <div className="text-xs text-muted-foreground">{d.type}{d.date ? ` · ${formatDate(d.date)}` : ""}</div>
              </div>
              {d.url && <a href={d.url} target="_blank" rel="noreferrer"><Download className="w-4 h-4 text-primary" /></a>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}