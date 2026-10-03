// LIJAN™ — CommitteeChairCard.
//
// The chair is presented as an office, not as a person with a personal logo. The ministry mark
// is shown under an explicit "Representing Institution" label so it can never read as the
// holder's own emblem. No portrait is invented: the card renders the record as stored.

import React from "react";
import { Landmark, BadgeCheck } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import OrganizationMark from "@/components/workgroups/OrganizationMark";

export default function CommitteeChairCard({ chair, org, logoUrl, className }) {
  const { t, lang } = useLanguage();
  if (!chair) return null;

  const isAr = lang === "ar";
  const name = isAr ? chair.full_name_ar || chair.full_name : chair.full_name;
  const office = isAr ? chair.office_ar || chair.office_en : chair.office_en || chair.office_ar;
  const post = isAr ? chair.post_ar || chair.post_en : chair.post_en || chair.post_ar;
  const orgName = org ? (isAr ? org.name_ar : org.name_en) : null;
  const alt = org ? t(`شعار ${org.name_ar}`, `${org.name_en} logo`) : "";

  return (
    <section className={`raqeem-card p-4 ${className || ""}`} aria-label={t("رئيس اللجنة", "Committee Chair")}>
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-10 h-10 rounded-lg bg-primary/8 ring-1 ring-primary/12 flex items-center justify-center" aria-hidden="true">
          <Landmark className="w-5 h-5 text-primary" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t("رئيس اللجنة", "Chair of the Committee")}</div>
          <h2 className="text-base font-bold text-foreground leading-snug mt-0.5">{name}</h2>
          {office && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{office}</p>}
          {post && (
            <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
              <BadgeCheck className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
              {post}
            </p>
          )}

          {/* The institution — labelled, so the mark is read as the ministry's, not the person's. */}
          <div className="mt-3 pt-3 border-t border-border flex items-center gap-2.5">
            <OrganizationMark org={org} logoUrl={logoUrl} size="card" title={alt} />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
                {t("الجهة التي يمثلها", "Representing institution")}
              </div>
              <div className="text-sm font-medium text-foreground truncate">{orgName || t("غير محددة", "Not specified")}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}