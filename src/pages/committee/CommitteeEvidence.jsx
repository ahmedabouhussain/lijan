import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { FileCheck } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate, isOverdue } from "@/lib/raqeemUtils";

export default function CommitteeEvidence() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("evidence");
  if (!data) return null;
  const actions = (data.registers?.actions || []).filter((a) => a.status === "evidence_pending" || (a.status === "under_review" && !a.compliance_verified));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("الأدلة والتحقق", "Evidence & Verification", lang)}</h1>
      </div>
      {actions.length === 0 ? (
        <EmptyState icon={FileCheck} title={t("لا توجد أدلة بانتظار التحقق", "No Evidence Pending")} description={t("جميع الإجراءات إما مكتملة أو لا تتطلب أدلة.", "All actions are either complete or don't require evidence.")} />
      ) : (
        <div className="space-y-2">
          {actions.map((a) => (
            <div key={a.id} className="raqeem-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{a.title_ar || a.title}</span>
                <StatusBadge
                  label={a.compliance_verified ? t("تم التحقق", "Verified") : t("بانتظار التحقق", "Pending Verification")}
                  colorClass={a.compliance_verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                />
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>{t("المسؤول", "Owner")}: {a.owner_name}</div>
                {a.deadline && <div>{t("الموعد النهائي", "Deadline")}: {formatDate(a.deadline)} {isOverdue(a.deadline) && <span className="text-red-600">({t("متأخر", "overdue")})</span>}</div>}
                {a.evidence_url && <div>{t("الدليل", "Evidence")}: <a href={a.evidence_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{t("عرض", "View")}</a></div>}
                {a.compliance_notes && <div>{t("ملاحظات", "Notes")}: {a.compliance_notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}