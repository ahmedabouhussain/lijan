import React from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { ScrollText } from "lucide-react";
import EmptyState from "@/components/raqeem/EmptyState";
import { formatDate } from "@/lib/raqeemUtils";

export default function CommitteeMandate() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("mandate");
  if (!data) return null;
  const { committee, mandate } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ScrollText className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("الصلاحية والاختصاص", "Mandate & Charter", lang)}</h1>
      </div>
      <div className="raqeem-card p-5 space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("اسم اللجنة", "Committee Name")}</h3>
          <p className="text-sm font-medium">{committee.name_ar || committee.name_en}</p>
        </div>
        {mandate ? (
          <>
            {mandate.mandate_text && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("نص الصلاحية", "Mandate Text")}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{mandate.mandate_text_ar || mandate.mandate_text}</p>
              </div>
            )}
            {mandate.scope && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("النطاق", "Scope")}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{mandate.scope_ar || mandate.scope}</p>
              </div>
            )}
            {mandate.powers && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("الصلاحيات", "Powers")}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{mandate.powers}</p>
              </div>
            )}
            {mandate.deliverables && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("المخرجات", "Deliverables")}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{mandate.deliverables}</p>
              </div>
            )}
            {mandate.prohibited_matters && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("المسائل الممنوعة", "Prohibited Matters")}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{mandate.prohibited_matters}</p>
              </div>
            )}
            {mandate.reporting_lines && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("خطوط الإبلاغ", "Reporting Lines")}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{mandate.reporting_lines}</p>
              </div>
            )}
          </>
        ) : (
          <>
            {committee.mandate && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("الصلاحية", "Mandate")}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{committee.mandate}</p>
              </div>
            )}
            {committee.scope && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("النطاق والمسؤوليات", "Scope & Responsibilities")}</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{committee.scope}</p>
              </div>
            )}
          </>
        )}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
          {committee.establishing_authority && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("جهة الإنشاء", "Establishing Authority")}</h3>
              <p className="text-sm">{committee.establishing_authority}</p>
            </div>
          )}
          {committee.appointing_authority && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("جهة التعيين", "Appointing Authority")}</h3>
              <p className="text-sm">{committee.appointing_authority}</p>
            </div>
          )}
          {committee.term_start && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("بداية المدة", "Term Start")}</h3>
              <p className="text-sm">{formatDate(committee.term_start)}</p>
            </div>
          )}
          {committee.term_end && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t("نهاية المدة", "Term End")}</h3>
              <p className="text-sm">{formatDate(committee.term_end)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}