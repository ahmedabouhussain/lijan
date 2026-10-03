// LIJAN™ — MemberInstitutionCard.
//
// A work-group member is a PERSON with a SEAT. The person's own block and the institution they
// represent are two visually separate things, so an institutional mark can never read as a
// portrait: the name block comes first, and the mark sits in its own labelled container.

import React from "react";
import { UserRoundCheck, Building2, CheckSquare } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import OrganizationMark from "@/components/workgroups/OrganizationMark";
import InstitutionSeatLine from "@/components/workgroups/InstitutionSeatLine";

export default function MemberInstitutionCard({ membership, org, logoUrl, workGroupRoleLabel, roleColorClass, seatHolderName = null }) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const person = isAr ? membership.full_name_ar || membership.full_name : membership.full_name;
  const orgName = org ? (isAr ? org.name_ar : org.name_en) : null;
  const openActions = membership._openActions ?? 0;
  const pendingSeat = membership.status === "inactive" || /تحت التأكيد|under confirmation/i.test(membership.full_name || "");

  return (
    <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <UserRoundCheck className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium text-foreground truncate">{person}</span>
          <StatusBadge label={workGroupRoleLabel} colorClass={roleColorClass || "bg-secondary text-muted-foreground"} />
          {pendingSeat && <StatusBadge label={t("قيد التأكيد", "Pending confirmation")} colorClass="text-amber-700 bg-amber-50" />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CheckSquare className="w-3 h-3" aria-hidden="true" />
            {t("إجراءات مسندة", "Assigned actions")}: <span className="arabic-figures">{openActions}</span>
          </span>
          {membership.term_start && <span className="arabic-figures">{t("منذ", "Since")} {membership.term_start}</span>}
        </div>
      </div>

      {/* The institution the member represents — its own labelled container, never a portrait. */}
      <div className="shrink-0 flex items-center gap-2 rounded-md border border-border bg-card/60 px-2.5 py-1.5 max-w-full sm:max-w-[52%]">
        <OrganizationMark org={org} logoUrl={logoUrl} size="chip" />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
            {t("الجهة التي يمثلها", "Representing institution")}
          </div>
          <div className="text-xs font-medium text-foreground truncate inline-flex items-center gap-1">
            <Building2 className="w-3 h-3 text-muted-foreground shrink-0" aria-hidden="true" />
            {orgName || t("غير محددة", "Not specified")}
          </div>
          <InstitutionSeatLine seatHolderName={seatHolderName} className="mt-0.5" />
        </div>
      </div>
    </div>
  );
}