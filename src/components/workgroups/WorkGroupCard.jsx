// LIJAN™ — WorkGroupCard: the four work groups of a committee, presented as one governed unit.
// Every count is passed in from records the committee already holds — the card authors nothing.

import React from "react";
import { Link } from "react-router-dom";
import { Users2, CalendarClock, Flag, CheckSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import StatusBadge from "@/components/raqeem/StatusBadge";
import OrganizationMark from "@/components/workgroups/OrganizationMark";
import InstitutionSeatLine from "@/components/workgroups/InstitutionSeatLine";
import { WORKSTREAM_STATUS, FIRST_MEETING_STATUS } from "@/lib/raqeemUtils";
import { L } from "@/lib/l10n";

const MAX_MARKS = 4;

export default function WorkGroupCard({
  workGroup,
  leadOrg,
  participants = [],
  memberCount = 0,
  meetingsCount = 0,
  initiativesCount = 0,
  openActionsCount = 0,
  nextDeadline = null,
  leadSeatName = null,
  href,
}) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const Arrow = isAr ? ChevronLeft : ChevronRight;

  const status = L.status(WORKSTREAM_STATUS, workGroup.status, workGroup.status);
  const firstMeeting = L.status(FIRST_MEETING_STATUS, workGroup.first_meeting_status || "not_yet_scheduled", workGroup.first_meeting_status);
  const shown = participants.slice(0, MAX_MARKS);
  const extra = Math.max(0, participants.length - shown.length);
  const leadName = isAr ? workGroup.lead_name_ar || workGroup.lead_name : workGroup.lead_name;

  return (
    <Link to={href} className="raqeem-card-interactive p-4 block group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {isAr ? workGroup.name_ar : workGroup.name_en}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {isAr ? workGroup.mandate_ar : workGroup.mandate_en}
          </p>
        </div>
        <StatusBadge label={status.label} colorClass={status.colorClass} />
      </div>

      {/* Lead — office holder with the mark of the institution they represent. */}
      <div className="mt-3 flex items-center gap-2.5 rounded-md border border-border bg-card/60 px-2.5 py-2">
        <OrganizationMark org={leadOrg} size="chip" />
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
            {t("رئيس المجموعة", "Work group lead")}
          </div>
          <div className="text-xs font-medium text-foreground truncate">{leadName || t("غير معيّن", "Not appointed")}</div>
          <InstitutionSeatLine seatHolderName={leadSeatName} className="mt-0.5" />
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Users2 className="w-3 h-3" aria-hidden="true" />{t("الأعضاء", "Members")}
          </dt>
          <dd className="text-xs font-medium arabic-figures">{memberCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <CalendarClock className="w-3 h-3" aria-hidden="true" />{t("الاجتماعات", "Meetings")}
          </dt>
          <dd className="text-xs font-medium arabic-figures">{meetingsCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Flag className="w-3 h-3" aria-hidden="true" />{t("المبادرات", "Initiatives")}
          </dt>
          <dd className="text-xs font-medium arabic-figures">{initiativesCount}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <CheckSquare className="w-3 h-3" aria-hidden="true" />{t("إجراءات مفتوحة", "Open actions")}
          </dt>
          <dd className="text-xs font-medium arabic-figures">{openActionsCount}</dd>
        </div>
      </dl>

      <div className="mt-3 pt-3 border-t border-border space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{t("الاجتماع الأول", "First meeting")}</span>
          <span className="text-xs font-medium">
            {workGroup.first_meeting_status === "held" && workGroup.first_meeting_date
              ? L.date(workGroup.first_meeting_date)
              : firstMeeting.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{t("الاستحقاق التالي", "Next due")}</span>
          <span className="text-xs font-medium arabic-figures">{nextDeadline ? L.date(nextDeadline) : t("لا يوجد", "None")}</span>
        </div>

        {/* Participating institutions — a quiet row, capped, never a wall of marks. */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{t("الجهات المشاركة", "Participating institutions")}</span>
          <div className="flex items-center gap-1">
            {shown.map((org, i) => (
              <OrganizationMark key={org?.id || i} org={org} size="row" />
            ))}
            {extra > 0 && (
              <span className="h-6 px-1.5 rounded border border-border bg-secondary/40 flex items-center text-[10px] font-semibold text-muted-foreground arabic-figures">
                +{extra}
              </span>
            )}
            {participants.length === 0 && <span className="text-xs text-muted-foreground">{t("لا توجد", "None")}</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs font-medium text-primary">
        <span>{t("فتح مساحة العمل", "Open workspace")}</span>
        <Arrow className="w-3.5 h-3.5" aria-hidden="true" />
      </div>
    </Link>
  );
}