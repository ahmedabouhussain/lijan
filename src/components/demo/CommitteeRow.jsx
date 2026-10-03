// One committee row inside its owning organization — compact, one signal line.
import React from "react";
import { AlertTriangle, CalendarClock, ChevronLeft, FileText } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { L } from "@/lib/l10n";
import { COMMITTEE_STATUS } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import OrganizationIdentity from "@/components/raqeem/OrganizationIdentity";
import { formatMeetingDate } from "@/components/demo/meetingDate";
import { cn } from "@/lib/utils";

// Affiliation wording — from the membership record (its type and represented entity).
function affiliationLabel(c, t) {
  const ar = `ممثل ${c.represented_org_ar}`;
  const en = `Representing ${c.represented_org_en}`;
  if (c.is_external_membership) return t(`عضوية خارجية — ${ar}`, `External Membership — ${en}`);
  if (c.membership_type === "represented") return t(ar, en);
  return t(`عضوية داخلية في ${c.represented_org_ar}`, `Internal membership at ${c.represented_org_en}`);
}

export default function CommitteeRow({ committee: c, onOpen }) {
  const { t, lang } = useLanguage();
  const isAr = lang === "ar";
  const needs = c.indicators?.items_needing_attention || 0;
  const docs = c.indicators?.unread_documents || 0;
  const meeting = formatMeetingDate(c.indicators?.next_meeting?.date, lang);
  // A represented or external membership shows the entity the member represents.
  const represents = c.is_external_membership || c.membership_type === "represented";

  return (
    <button type="button" onClick={() => onOpen(c)} className="w-full text-start px-4 py-3 hover:bg-secondary/20 transition-colors">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground truncate">{isAr ? c.name_ar : c.name_en}</span>
        <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-primary/5 text-primary whitespace-nowrap">
          {isAr ? c.role_label_ar : c.role_label_en}
        </span>
        <ChevronLeft className={cn("w-4 h-4 text-muted-foreground shrink-0", !isAr && "rotate-180")} />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-muted-foreground">
        {represents && (
          <span className="inline-flex items-center gap-1.5">
            <OrganizationIdentity org={c.represented_org} size="row" showName={false} />
            {affiliationLabel(c, t)}
          </span>
        )}
        {meeting && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            {meeting}
          </span>
        )}
        {needs > 0 && (
          <span className="inline-flex items-center gap-1 text-accent">
            <AlertTriangle className="w-3 h-3" />
            {needs} {t("يحتاج انتباهك", "need attention")}
          </span>
        )}
        {docs > 0 && (
          <span className="inline-flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {docs} {t("مستندات", "documents")}
          </span>
        )}
        <StatusBadge label={L.label(COMMITTEE_STATUS, c.status, c.status)} colorClass={COMMITTEE_STATUS[c.status]?.color} />
      </div>
    </button>
  );
}