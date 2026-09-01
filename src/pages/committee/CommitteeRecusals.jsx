import React from "react";
import { useCommitteeScopedData } from "@/hooks/useCommitteeScoped";
import { useLanguage } from "@/lib/LanguageContext";
import { ShieldOff } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

export default function CommitteeRecusals() {
  const { records, loading } = useCommitteeScopedData("Recusal");
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldOff className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("التنحي وتضارب المصالح", "Recusals & Conflicts")}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={ShieldOff} title={t("لا توجد تنحيات", "No Recusals")} description={t("لم يتم تسجيل أي تنحي أو تضارب مصالح.", "No recusals or conflicts of interest recorded.")} />
      ) : (
        <div className="space-y-2">
          {records.map((r) => (
            <div key={r.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{r.member_name}</span>
                <StatusBadge
                  label={r.status === "active" ? t("نشط", "Active") : t("مرفوع", "Lifted")}
                  colorClass={r.status === "active" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}
                />
              </div>
              {r.reason && <p className="text-xs text-muted-foreground">{t("السبب", "Reason")}: {r.reason}</p>}
              {r.start_time && <p className="text-xs text-muted-foreground mt-1">{t("من", "From")}: {r.start_time}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}