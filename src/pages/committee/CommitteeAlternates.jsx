import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { Users2 } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

export default function CommitteeAlternates() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  if (!data) return null;
  const alternates = (data.members || []).filter((m) => m.role === "alternate");
  const activated = alternates.filter((a) => a.activated);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users2 className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("الأعضاء البدلاء", "Alternate Members")}</h1>
      </div>
      {alternates.length === 0 ? (
        <EmptyState icon={Users2} title={t("لا يوجد بدلاء", "No Alternates")} description={t("لم يتم تعيين بدلاء لهذه اللجنة.", "No alternate members assigned to this committee.")} />
      ) : (
        <>
          {activated.length > 0 && (
            <div className="raqeem-card p-3 flex items-center gap-2 bg-emerald-50">
              <span className="text-xs text-emerald-700">{activated.length} {t("بديل مُفعّل", "activated alternates")}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alternates.map((a) => (
              <div key={a.id} className="raqeem-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{a.full_name || a.full_name_ar}</span>
                  <StatusBadge
                    label={a.activated ? t("مُفعّل", "Activated") : t("احتياطي", "Standby")}
                    colorClass={a.activated ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                  />
                </div>
                {a.institution_name && <p className="text-xs text-muted-foreground">{a.institution_name}</p>}
                {a.term_end && <p className="text-xs text-muted-foreground mt-1">{t("نهاية المدة", "Term End")}: {a.term_end}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}