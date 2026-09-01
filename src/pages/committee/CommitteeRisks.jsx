import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { Network, Lock } from "lucide-react";

export default function CommitteeRisks() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  if (!data) return null;
  const delegations = data.registers.delegations || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Network className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("المخاطر والتبعيات", "Risks & Dependencies")}</h1>
      </div>

      <div className="raqeem-card p-4">
        <h3 className="text-sm font-semibold mb-3">{t("التفويضات النشطة", "Active Delegations")} ({delegations.length})</h3>
        {delegations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("لا توجد تفويضات نشطة", "No active delegations")}</p>
        ) : (
          <div className="space-y-2">
            {delegations.map((d) => (
              <div key={d.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <div className="text-sm font-medium text-foreground">{d.from_member_name} → {d.to_member_name}</div>
                  <div className="text-xs text-muted-foreground">{d.scope || d.reason}</div>
                </div>
                <span className="text-xs text-muted-foreground">{d.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="raqeem-card p-6 text-center">
        <Lock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-foreground">{t("سجل المخاطر والتبعيات البينية", "Risk & Cross-Dependency Register")}</p>
        <p className="text-xs text-muted-foreground mt-1">{t("مجدول للبوابة التنفيذية القادمة", "Scheduled for the next execution gate")}</p>
      </div>
    </div>
  );
}