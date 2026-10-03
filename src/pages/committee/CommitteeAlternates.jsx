import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import PageHeader from "@/components/raqeem/PageHeader";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { Users2, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

export default function CommitteeAlternates() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("alternates");
  const { canManageMembership } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [activatingId, setActivatingId] = useState(null);

  if (!data) return <TableSkeleton rows={4} />;
  const alternates = (data.members || []).filter((m) => m.role === "alternate");
  const activated = alternates.filter((a) => a.activated);
  const committeeId = data.committee.id;

  const handleToggle = async (alt) => {
    const fn = alt.activated ? "ActivateAlternate" : "ActivateAlternate";
    await execute(fn, {
      committee_id: committeeId,
      membership_id: alt.id,
      activate: !alt.activated,
    }, () => {
      setActivatingId(null);
      reload();
    });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Users2}
        title={getTitle("الأعضاء البدلاء", "Alternate Members", lang)}
        badge={<span className="text-sm text-muted-foreground">({alternates.length})</span>}
      />

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
                    colorClass={a.activated ? "bg-emerald-100 text-emerald-700" : "bg-amber-50 text-amber-700"}
                  />
                </div>
                {a.institution_name && <p className="text-xs text-muted-foreground">{a.institution_name}</p>}
                {a.term_end && <p className="text-xs text-muted-foreground mt-1">{t("نهاية المدة", "Term End")}: {a.term_end}</p>}
                {canManageMembership && (
                  <Button
                    size="sm"
                    variant={a.activated ? "outline" : "default"}
                    className="mt-2 min-h-[36px]"
                    disabled={submitting && activatingId === a.id}
                    onClick={() => { setActivatingId(a.id); handleToggle(a); }}
                  >
                    {submitting && activatingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    {a.activated ? t("إلغاء التفعيل", "Deactivate") : t("تفعيل", "Activate")}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}