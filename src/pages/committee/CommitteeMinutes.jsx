import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { FileText } from "lucide-react";

const STATUS_LABELS = {
  draft: { ar: "مسودة", en: "Draft", color: "bg-blue-50 text-blue-700" },
  in_review: { ar: "قيد المراجعة", en: "In Review", color: "bg-amber-50 text-amber-700" },
  approved: { ar: "معتمد", en: "Approved", color: "bg-emerald-50 text-emerald-700" },
  issued: { ar: "صادر", en: "Issued", color: "bg-primary/10 text-primary" },
  amended: { ar: "معدّل", en: "Amended", color: "bg-secondary text-muted-foreground" },
};

export default function CommitteeMinutes() {
  const { data } = useCommittee();
  const { t } = useLanguage();

  if (!data) return null;
  const minutes = data.registers.minutes || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("محاضر اللجنة", "Committee Minutes")}</h1>
        <span className="text-sm text-muted-foreground">({minutes.length})</span>
      </div>

      {minutes.length === 0 ? (
        <div className="raqeem-card p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد محاضر", "No minutes recorded")}</p>
        </div>
      ) : (
        <div className="raqeem-card divide-y divide-border">
          {minutes.map((m) => {
            const st = STATUS_LABELS[m.status] || { ar: m.status, en: m.status, color: "bg-secondary text-muted-foreground" };
            return (
              <div key={m.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{t("محضر", "Minutes")} {m.minutes_number || "—"}</div>
                  <div className="text-xs text-muted-foreground">{m.drafted_by_name || "—"}</div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${st.color}`}>
                  {t(st.ar, st.en)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}