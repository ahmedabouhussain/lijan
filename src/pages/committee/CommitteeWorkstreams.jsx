import React from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import PageHeader from "@/components/raqeem/PageHeader";
import StatusBadge from "@/components/raqeem/StatusBadge";
import OrganizationIdentity from "@/components/raqeem/OrganizationIdentity";
import EmptyState from "@/components/raqeem/EmptyState";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { Progress } from "@/components/ui/progress";
import { Network, ChevronLeft, ChevronRight, Users2, CalendarClock } from "lucide-react";
import { WORKSTREAM_STATUS, FIRST_MEETING_STATUS } from "@/lib/raqeemUtils";
import { L } from "@/lib/l10n";

// Workstreams of the active committee. Served from the committee-scoped context so no page
// can combine or leak another committee's workstreams.
export default function CommitteeWorkstreams() {
  const { orgRef, committeeRef } = useParams();
  const { data } = useCommittee();
  const { t, lang } = useLanguage();

  if (!data) return <TableSkeleton rows={4} />;

  const workstreams = data.workstreams || [];
  const memberships = data.workstream_memberships || [];
  const orgIndex = data.org_index || {};
  const base = `/o/${orgRef}/c/${committeeRef}`;
  const Arrow = lang === "ar" ? ChevronLeft : ChevronRight;

  if (workstreams.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader icon={Network} title={t("مجموعات العمل", "Work Groups")} />
        <EmptyState
          icon={Network}
          title={t("لم تُشكَّل مجموعات العمل بعد", "No work groups formed yet")}
          description={t(
            "ستظهر مجموعات العمل هنا فور اعتماد اللجنة لتشكيلها وتعيين رؤساء المجموعات.",
            "Work groups appear here once the committee approves their formation and appoints their leads."
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Network}
        title={t("مجموعات العمل", "Work Groups")}
        subtitle={t("متابعة مجموعات العمل وتقدّمها", "Follow-up of work groups and their progress")}
        badge={<span className="text-sm text-muted-foreground">({workstreams.length})</span>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {workstreams.map((ws) => {
          const active = memberships.filter((m) => m.workstream_id === ws.id && m.status === "active");
          const leadOrg = ws.lead_organization_id ? orgIndex[ws.lead_organization_id] : null;
          const status = L.status(WORKSTREAM_STATUS, ws.status, ws.status);
          const firstMeeting = L.status(FIRST_MEETING_STATUS, ws.first_meeting_status || "not_yet_scheduled", ws.first_meeting_status);
          const participatingOrgs = (ws.participating_organization_ids || []).map((id) => orgIndex[id]).filter(Boolean);
          const shownOrgs = participatingOrgs.slice(0, 4);
          const extraOrgsCount = Math.max(0, participatingOrgs.length - shownOrgs.length);
          return (
            <Link
              key={ws.id}
              to={`${base}/workstreams/${ws.id}`}
              className="raqeem-card-interactive p-4 block group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {lang === "ar" ? ws.name_ar : ws.name_en}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {lang === "ar" ? ws.mandate_ar : ws.mandate_en}
                  </p>
                </div>
                <StatusBadge label={status.label} colorClass={status.colorClass} />
              </div>

              <dl className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs text-muted-foreground">{t("قائد المسار", "Lead")}</dt>
                  <dd className="min-w-0">
                    <OrganizationIdentity org={leadOrg} size="row" nameClassName="text-xs font-medium" />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Users2 className="w-3 h-3" aria-hidden="true" />{t("الأعضاء", "Members")}
                  </dt>
                  <dd className="text-xs font-medium arabic-figures">{active.length}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" aria-hidden="true" />{t("الاجتماع الأول", "First meeting")}
                  </dt>
                  <dd className="text-xs font-medium">
                    {ws.first_meeting_status === "held" && ws.first_meeting_date
                      ? L.date(ws.first_meeting_date)
                      : firstMeeting.label}
                  </dd>
                </div>
                {shownOrgs.length > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="text-xs text-muted-foreground">{t("الجهات المشاركة", "Participating institutions")}</dt>
                    <dd className="flex items-center -space-x-1.5 rtl:space-x-reverse">
                      {shownOrgs.map((org, i) => (
                        <span key={i} className="w-6 h-6 rounded-full bg-white border border-border flex items-center justify-center overflow-hidden shrink-0" title={lang === "ar" ? org.name_ar : org.name_en}>
                          {org.logo_url ? (
                            <img src={org.logo_url} alt="" className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <span className="text-[9px] font-semibold text-muted-foreground">{(lang === "ar" ? org.name_ar : org.name_en)?.[0]}</span>
                          )}
                        </span>
                      ))}
                      {extraOrgsCount > 0 && (
                        <span className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-semibold text-muted-foreground shrink-0">
                          +{extraOrgsCount}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <dt className="text-xs text-muted-foreground">{t("التقدم", "Progress")}</dt>
                    <dd className="text-xs font-medium arabic-figures">{ws.progress_percent || 0}%</dd>
                  </div>
                  <Progress value={ws.progress_percent || 0} className="h-1.5" />
                </div>
              </dl>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs font-medium text-primary">
                <span>{t("فتح مساحة العمل", "Open workspace")}</span>
                <Arrow className="w-3.5 h-3.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}