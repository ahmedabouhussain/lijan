import React from "react";
import { useNavigate } from "react-router-dom";
import { Crown, Users, PenLine, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { ROLE_LABELS } from "@/lib/drHamadPersona";
import { cn } from "@/lib/utils";

const ROLE_ICONS = { chair: Crown, vice_chair: Crown, member: Users, secretary: PenLine };

export default function DrHamadCommitteeCard({ committee }) {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const RoleIcon = ROLE_ICONS[committee.role] || Users;
  const roleLabel = ROLE_LABELS[committee.role]?.[lang] || committee.role;

  return (
    <button
      onClick={() => navigate(`/dr-hamad-experience/${committee.committee_ref}`)}
      className="w-full text-right raqeem-card-interactive p-4 space-y-2"
      dir={lang === "ar" ? "rtl" : "ltr"}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{lang === "ar" ? committee.name_ar : committee.name_en}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {t("الجهة المالكة للجنة", "Owning org")}: {lang === "ar" ? committee.owning_organization?.name_ar : committee.owning_organization?.name_en}
          </div>
        </div>
        <ChevronLeft className={cn("w-4 h-4 text-muted-foreground shrink-0", lang === "ar" ? "" : "rotate-180")} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-primary/10 text-primary font-medium">
          <RoleIcon className="w-3 h-3" /> {roleLabel}
        </span>
        <span className="px-2 py-0.5 rounded-md text-[11px] bg-secondary text-secondary-foreground">
          {t("يمثل", "Represents")} {lang === "ar" ? committee.represented_organization?.name_ar : committee.represented_organization?.name_en}
        </span>
        {committee.classification === "source_based_demonstration" ? (
          <span className="px-2 py-0.5 rounded-md text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
            {t("سيناريو مستند إلى مصدر", "Source-based")}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
            {t("سيناريو تجريبي", "Synthetic")}
          </span>
        )}
      </div>

      {committee.synthetic_label && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
          {lang === "ar" ? committee.synthetic_label.ar : committee.synthetic_label.en}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
        <div className="rounded-md bg-secondary/40 py-1.5">
          <div className="text-sm font-semibold text-foreground">{committee.decisions_pending}</div>
          <div className="text-[10px] text-muted-foreground">{t("قرارات معلقة", "Pending decisions")}</div>
        </div>
        <div className="rounded-md bg-secondary/40 py-1.5">
          <div className="text-sm font-semibold text-foreground">{committee.actions_open}</div>
          <div className="text-[10px] text-muted-foreground">{t("إجراءات مفتوحة", "Open actions")}</div>
        </div>
        <div className="rounded-md bg-secondary/40 py-1.5">
          <div className="text-sm font-semibold text-foreground">{committee.documents_count}</div>
          <div className="text-[10px] text-muted-foreground">{t("مستندات", "Documents")}</div>
        </div>
      </div>

      {committee.next_meeting && (
        <div className="text-[11px] text-muted-foreground pt-1">
          {t("الاجتماع القادم", "Next meeting")}: {committee.next_meeting.title}
        </div>
      )}
    </button>
  );
}