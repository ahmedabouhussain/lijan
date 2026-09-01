import React from "react";
import { useCommitteeScopedData } from "@/hooks/useCommitteeScoped";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { ArrowRightLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/raqeem/EmptyState";

export default function CommitteeDelegations() {
  const { records, loading } = useCommitteeScopedData("Delegation");
  const { t, lang } = useLanguage();
  const { getTitle, getDescription, getEmptyState } = usePageConfig("delegations");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("تفويضات الصلاحية", "Authority Delegations", lang)}</h1>
        </div>
      </div>
      {(() => {
        const desc = getDescription("", "", lang);
        return desc ? <p className="text-sm text-muted-foreground -mt-2">{desc}</p> : null;
      })()}
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title={getEmptyState("لا توجد تفويضات", "No Delegations", lang)} description={t("لم يتم تسجيل أي تفويض صلاحية لهذه اللجنة.", "No authority delegations recorded for this committee.")} />
      ) : (
        <div className="space-y-2">
          {records.map((d) => (
            <div key={d.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-sm">
                    <span className="font-medium">{d.from_member_name}</span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="font-medium">{d.to_member_name}</span>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                  {d.status === "active" ? t("نشط", "Active") : t("منتهي", "Expired")}
                </span>
              </div>
              {d.scope && <p className="text-xs text-muted-foreground mt-2">{t("النطاق", "Scope")}: {d.scope}</p>}
              {d.reason && <p className="text-xs text-muted-foreground mt-1">{t("السبب", "Reason")}: {d.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}