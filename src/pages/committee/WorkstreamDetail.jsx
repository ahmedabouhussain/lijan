import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { useAmeenSafe } from "@/lib/AmeenContext";
import PageHeader from "@/components/raqeem/PageHeader";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import OrganizationIdentity from "@/components/raqeem/OrganizationIdentity";
import OrganizationMark from "@/components/workgroups/OrganizationMark";
import InstitutionSeatLine from "@/components/workgroups/InstitutionSeatLine";
import WorkGroupMetrics from "@/components/workgroups/WorkGroupMetrics";
import MemberInstitutionCard from "@/components/workgroups/MemberInstitutionCard";
import WorkGroupTimeline from "@/components/workgroups/WorkGroupTimeline";
import WorkGroupDocumentCenter from "@/components/workgroups/WorkGroupDocumentCenter";
import DecisionActionBoard from "@/components/workgroups/DecisionActionBoard";
import AmeenWorkGroupPanel from "@/components/workgroups/AmeenWorkGroupPanel";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { getWorkGroupCapabilities } from "@/lib/workGroupPermissions";
import { WORKSTREAM_STATUS, WORKSTREAM_ROLE, FIRST_MEETING_STATUS } from "@/lib/raqeemUtils";
import { L } from "@/lib/l10n";
import {
  Network, ChevronLeft, ChevronRight, Target, Building2, Users2, CalendarDays,
  CalendarPlus, Upload, CheckSquare, Gavel, UserPlus, Sparkles, CalendarClock,
} from "lucide-react";

const OPEN_ACTION_STATUSES = new Set(["assigned", "in_progress", "blocked", "evidence_pending", "under_review", "overdue"]);
const isOpen = (a) => !a.status || OPEN_ACTION_STATUSES.has(a.status);
const isOverdue = (a) => isOpen(a) && a.deadline && new Date(a.deadline) < new Date();

const DOC_STATUSES_ACTIVE = (d) => d.status !== "archived";

function Section({ icon: Icon, title, count, children, action }) {
  return (
    <section className="raqeem-card p-4">
      <header className="flex items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          {title}
          {typeof count === "number" && <span className="text-xs text-muted-foreground arabic-figures">({count})</span>}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}

const NoRecords = ({ children }) => <p className="text-xs text-muted-foreground">{children}</p>;

export default function WorkstreamDetail() {
  const { orgRef, committeeRef, workstreamId } = useParams();
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const ameen = useAmeenSafe();

  const workGroup = useMemo(
    () => (data?.workstreams || []).find((w) => w.id === workstreamId),
    [data, workstreamId]
  );

  if (!data) return <TableSkeleton rows={5} />;

  const base = `/o/${orgRef}/c/${committeeRef}`;
  const Arrow = lang === "ar" ? ChevronLeft : ChevronRight;

  if (!workGroup) {
    return (
      <div className="space-y-4">
        <Link to={`${base}/workstreams`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Arrow className="w-3.5 h-3.5 rotate-180" />
          {t("مجموعات العمل", "Work Groups")}
        </Link>
        <EmptyState
          icon={Network}
          title={t("مجموعة العمل غير متاحة", "Work group unavailable")}
          description={t(
            "مجموعة العمل المطلوبة غير مرتبطة بهذه اللجنة أو لم تُمنح لك صلاحية الوصول إليها.",
            "This work group is not part of this committee, or you do not have access to it."
          )}
        />
      </div>
    );
  }

  const orgIndex = data.org_index || {};
  const members = (data.workstream_memberships || []).filter((m) => m.workstream_id === workGroup.id && m.status === "active");

  // Every record below belongs to THIS work group of THIS committee.
  const groupActions = (data.registers?.actions || []).filter((a) => a.workstream_id === workGroup.id);
  const groupName = lang === "ar" ? workGroup.name_ar : workGroup.name_en;
  const groupInitiatives = (data.registers?.initiatives || []).filter(
    (i) => (i.workstream_ar || i.workstream_en) === groupName
  );
  const groupDocuments = (data.registers?.documents || []).filter(
    (d) => d.workstream_id === workGroup.id || (workGroup.code && String(d.tags || "").includes(workGroup.code))
  );

  const linkedMeetingIds = new Set(groupActions.map((a) => a.meeting_id).filter(Boolean));
  const allMeetings = [...(data.meetings?.upcoming || []), ...(data.meetings?.previous || [])];
  const groupMeetings = allMeetings.filter((m) => linkedMeetingIds.has(m.id));
  const groupDecisions = (data.registers?.decisions || []).filter(
    (d) => d.workstream_id === workGroup.id || (d.meeting_id && linkedMeetingIds.has(d.meeting_id))
  );
  const groupMinutes = (data.registers?.minutes || []).filter((m) => m.meeting_id && linkedMeetingIds.has(m.meeting_id));

  const openActions = groupActions.filter(isOpen);
  const overdue = groupActions.filter(isOverdue);
  const now = new Date();
  const meetingsHeld = groupMeetings.filter((m) => new Date(m.date) < now).length
    + (workGroup.first_meeting_status === "held" && workGroup.first_meeting_date && !groupMeetings.some((m) => String(m.date).startsWith(workGroup.first_meeting_date)) ? 1 : 0);
  const meetingsUpcoming = groupMeetings.filter((m) => new Date(m.date) >= now).length
    + (workGroup.first_meeting_status === "scheduled" && !groupMeetings.some((m) => String(m.date).startsWith(workGroup.first_meeting_date)) ? 1 : 0);

  const metrics = {
    meetingsHeld,
    meetingsUpcoming,
    decisionsApproved: groupDecisions.filter((d) => ["approved", "issued", "completed", "closed"].includes(d.status)).length,
    actionsOpen: openActions.length,
    actionsOverdue: overdue.length,
    initiativesActive: groupInitiatives.filter((i) => i.status !== "closed").length,
    documentsCurrent: groupDocuments.filter(DOC_STATUSES_ACTIVE).length,
    progressPercent: workGroup.progress_percent || 0,
    nextDeadline: openActions.map((a) => a.deadline).filter(Boolean).sort()[0] || null,
  };

  // Authority is resolved from STORED relationships: the committee seat and the work-group seat.
  const mySeat = (data.my_workgroup_memberships || []).find((m) => m.workstream_id === workGroup.id);
  const caps = getWorkGroupCapabilities({ committeeRole: data.my_role, workGroupRole: mySeat?.role || null });

  const status = L.status(WORKSTREAM_STATUS, workGroup.status, workGroup.status);
  const firstMeeting = L.status(FIRST_MEETING_STATUS, workGroup.first_meeting_status || "not_yet_scheduled", workGroup.first_meeting_status);
  const leadOrg = workGroup.lead_organization_id ? orgIndex[workGroup.lead_organization_id] : null;
  const participants = (workGroup.participating_organization_ids || []).map((id) => orgIndex[id]).filter(Boolean);

  // The committee seat an institution holds — DERIVED from the committee's own members. It is the
  // INSTITUTION's seat, a fact separate from the delegate's own seat, so it is labelled as such and
  // never stored on the delegate's record.
  const seatByOrg = {};
  for (const m of (data.members || [])) {
    const oid = m.represented_organization_id;
    if (!oid) continue;
    const cur = seatByOrg[oid];
    if (!cur || (m.protocol_order ?? 99) < (cur.protocol_order ?? 99)) seatByOrg[oid] = m;
  }
  const seatName = (oid) => {
    const m = oid ? seatByOrg[oid] : null;
    return m ? (lang === "ar" ? m.full_name_ar || m.full_name : m.full_name) : null;
  };

  const scrollToDocs = () => document.getElementById("wg-docs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  const briefLead = () =>
    ameen?.askAmeen?.(
      lang === "ar"
        ? `أنشئ موجزًا تنفيذيًا لرئيس مجموعة «${groupName}» يوضح حالة المجموعة، القرارات المعلّقة، الإجراءات المتأخرة، والمبادرات ذات الأولوية.`
        : `Create an executive brief for the lead of the "${groupName}" work group covering its status, open decisions, overdue actions and priority initiatives.`
    );

  return (
    <div className="space-y-4">
      <Link to={`${base}/workstreams`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <Arrow className="w-3.5 h-3.5 rotate-180" />
        {t("مجموعات العمل", "Work Groups")}
      </Link>

      <PageHeader
        icon={Network}
        title={groupName}
        subtitle={lang === "ar" ? workGroup.mandate_ar : workGroup.mandate_en}
        badge={<StatusBadge label={status.label} colorClass={status.colorClass} />}
      />

      {/* Execution header — the group in its committee, its lead, and the actions authority permits. */}
      <section className="raqeem-card p-4 space-y-3">
        <Link to={base} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          {L.name(data.committee)}
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <OrganizationMark org={leadOrg} size="card" />
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground leading-tight">
                {t("رئيس المجموعة — الجهة التي يمثلها", "Work group lead — representing institution")}
              </div>
              <div className="text-sm font-medium text-foreground">
                {lang === "ar" ? workGroup.lead_name_ar || workGroup.lead_name : workGroup.lead_name}
              </div>
              <div className="text-xs text-muted-foreground">{leadOrg ? (lang === "ar" ? leadOrg.name_ar : leadOrg.name_en) : t("غير محددة", "Not specified")}</div>
              <InstitutionSeatLine seatHolderName={seatName(workGroup.lead_organization_id)} className="mt-0.5" />
            </div>
          </div>

          <dl className="flex items-center gap-4 text-xs">
            <div>
              <dt className="text-muted-foreground">{t("الاجتماع الأول", "First meeting")}</dt>
              <dd className="font-medium">
                {workGroup.first_meeting_status === "held" && workGroup.first_meeting_date
                  ? L.date(workGroup.first_meeting_date)
                  : firstMeeting.label}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("آخر تحديث", "Last update")}</dt>
              <dd className="font-medium arabic-figures">{L.date(workGroup.updated_date)}</dd>
            </div>
          </dl>
        </div>

        <div className="pt-3 border-t border-border flex flex-wrap gap-2">
          {caps.canManageMeetings && (
            <Button asChild size="sm" variant="outline">
              <Link to={`${base}/meetings`}><CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />{t("جدولة اجتماع", "Schedule meeting")}</Link>
            </Button>
          )}
          {caps.canEditDocuments && (
            <Button size="sm" variant="outline" onClick={scrollToDocs}>
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />{t("رفع مستند", "Upload document")}
            </Button>
          )}
          {caps.canManageActions && (
            <Button asChild size="sm" variant="outline">
              <Link to={`${base}/actions`}><CheckSquare className="w-3.5 h-3.5" aria-hidden="true" />{t("إنشاء إجراء", "Create action")}</Link>
            </Button>
          )}
          {caps.canRecordDecision && (
            <Button asChild size="sm" variant="outline">
              <Link to={`${base}/decisions`}><Gavel className="w-3.5 h-3.5" aria-hidden="true" />{t("تسجيل قرار", "Record decision")}</Link>
            </Button>
          )}
          {caps.canInviteMember && (
            <Button asChild size="sm" variant="outline">
              <Link to={`${base}/members`}><UserPlus className="w-3.5 h-3.5" aria-hidden="true" />{t("دعوة عضو", "Invite member")}</Link>
            </Button>
          )}
          {caps.canBriefExecutive && (
            <Button size="sm" onClick={briefLead}>
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />{t("إنشاء موجز تنفيذي", "Create executive brief")}
            </Button>
          )}
        </div>
      </section>

      <WorkGroupMetrics metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section icon={Target} title={t("الاختصاص", "Mandate")}>
          <p className="text-sm text-foreground leading-relaxed">{lang === "ar" ? workGroup.mandate_ar : workGroup.mandate_en}</p>
          {(workGroup.latest_update_ar || workGroup.latest_update_en) && (
            <div className="mt-3 pt-3 border-t border-border">
              <h3 className="text-xs font-medium text-muted-foreground mb-1">{t("آخر مستجد", "Latest update")}</h3>
              <p className="text-sm text-foreground leading-relaxed">{lang === "ar" ? workGroup.latest_update_ar : workGroup.latest_update_en}</p>
            </div>
          )}
          {(workGroup.next_steps_ar || workGroup.next_steps_en) && (
            <div className="mt-3 pt-3 border-t border-border">
              <h3 className="text-xs font-medium text-muted-foreground mb-1">{t("الخطوات التالية", "Next steps")}</h3>
              <p className="text-sm text-foreground leading-relaxed">{lang === "ar" ? workGroup.next_steps_ar : workGroup.next_steps_en}</p>
            </div>
          )}
          {workGroup.source_reference && (
            <p className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
              {t("المصدر", "Source")}: {workGroup.source_reference}
            </p>
          )}
        </Section>

        <Section icon={Building2} title={t("الجهات المشاركة", "Participating institutions")} count={participants.length}>
          {participants.length === 0 ? (
            <NoRecords>{t("لم تُعتمد جهات مشاركة بعد.", "No participating institutions recorded yet.")}</NoRecords>
          ) : (
            <ul className="space-y-2">
              {participants.map((org) => (
                <li key={org.id}>
                  <div className="flex items-center justify-between gap-2">
                    <OrganizationIdentity org={org} size="row" nameClassName="text-xs" />
                    {org.id === workGroup.lead_organization_id && (
                      <StatusBadge label={t("الرئاسة", "Lead")} colorClass="text-primary bg-primary/10" />
                    )}
                  </div>
                  <InstitutionSeatLine seatHolderName={seatName(org.id)} className="mt-0.5" />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section icon={Users2} title={t("أعضاء المجموعة", "Work group members")} count={members.length}>
        {members.length === 0 ? (
          <NoRecords>{t("لم يُعيَّن أعضاء لهذه المجموعة بعد.", "No members assigned to this work group yet.")}</NoRecords>
        ) : (
          <ul className="divide-y divide-border -mx-4">
            {members.map((m) => {
              const org = m.represented_organization_id ? orgIndex[m.represented_organization_id] : null;
              const assigned = groupActions.filter(
                (a) => isOpen(a) && (a.owner_name === m.full_name || a.owner_name === m.full_name_ar)
              ).length;
              return (
                <li key={m.id}>
                  <MemberInstitutionCard
                    membership={{ ...m, _openActions: assigned }}
                    org={org}
                    logoUrl={org?.logo_url}
                    seatHolderName={seatName(m.represented_organization_id)}
                    workGroupRoleLabel={L.label(WORKSTREAM_ROLE, m.role, m.role)}
                    roleColorClass={m.role === "lead" ? "text-primary bg-primary/10" : "bg-secondary text-muted-foreground"}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Section icon={CalendarDays} title={t("الاجتماعات", "Meetings")} count={groupMeetings.length}>
          {groupMeetings.length === 0 ? (
            <div className="space-y-2">
              {(workGroup.first_meeting_date || workGroup.first_meeting_status) && (
                <div className="flex items-center justify-between gap-2 py-1">
                  <span className="text-sm text-foreground inline-flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    {t("الاجتماع الأول", "First meeting")}
                  </span>
                  <span className="text-xs font-medium">
                    {workGroup.first_meeting_status === "held" && workGroup.first_meeting_date
                      ? L.date(workGroup.first_meeting_date)
                      : firstMeeting.label}
                  </span>
                </div>
              )}
              <NoRecords>
                {t(
                  "لا توجد اجتماعات مسجّلة في سجل اللجنة لهذه المجموعة بعد.",
                  "No meetings are recorded in the committee register for this work group yet."
                )}
              </NoRecords>
            </div>
          ) : (
            <ul className="divide-y divide-border -mx-4">
              {groupMeetings.map((m) => (
                <li key={m.id}>
                  <Link to={`${base}/meetings/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-secondary/40">
                    <span className="text-sm text-foreground truncate">{lang === "ar" ? m.title_ar || m.title : m.title}</span>
                    <span className="text-xs text-muted-foreground arabic-figures shrink-0">{L.date(m.date)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={CalendarClock} title={t("التسلسل الزمني", "Timeline")} count={undefined}>
          <WorkGroupTimeline
            workGroup={workGroup}
            meetings={groupMeetings}
            minutes={groupMinutes}
            decisions={groupDecisions}
            actions={groupActions}
          />
        </Section>
      </div>

      <DecisionActionBoard
        initiatives={groupInitiatives}
        decisions={groupDecisions}
        actions={groupActions}
        orgIndex={orgIndex}
        progressPercent={workGroup.progress_percent || 0}
      />

      <div id="wg-docs" className="scroll-mt-4">
        <WorkGroupDocumentCenter
          committeeId={data.committee?.id}
          organizationId={data.committee?.organization_id}
          workGroupCode={workGroup.code}
          documents={groupDocuments}
          canEdit={caps.canEditDocuments}
          canDownload={caps.canDownloadDocuments}
          onChanged={reload}
        />
      </div>

      <AmeenWorkGroupPanel workGroupNameAr={workGroup.name_ar} workGroupNameEn={workGroup.name_en} />
    </div>
  );
}