import React from "react";
import { useParams } from "react-router-dom";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import PageHeader from "@/components/raqeem/PageHeader";
import EmptyState from "@/components/raqeem/EmptyState";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import WorkGroupCard from "@/components/workgroups/WorkGroupCard";
import { Network } from "lucide-react";

// Every figure on a work-group card is derived from the committee's own records.
// Nothing is authored here: a group with no actions shows zero actions.
const OPEN_ACTION_STATUSES = new Set(["assigned", "in_progress", "blocked", "evidence_pending", "under_review", "overdue"]);

function countsFor(workGroup, memberships, actions, initiatives, lang) {
  const groupMembers = memberships.filter((m) => m.workstream_id === workGroup.id && m.status === "active");
  const groupActions = actions.filter((a) => a.workstream_id === workGroup.id);
  const open = groupActions.filter((a) => isOpen(a));
  const groupName = lang === "ar" ? workGroup.name_ar : workGroup.name_en;
  const groupInitiatives = initiatives.filter((i) =>
    (i.workstream_ar || i.workstream_en) === groupName
  );

  // Meetings are counted from the register only: a meeting the group's own actions reference.
  const meetingIds = new Set(groupActions.map((a) => a.meeting_id).filter(Boolean));
  const deadlines = open.map((a) => a.deadline).filter(Boolean).sort();

  return {
    memberCount: groupMembers.length,
    meetingsCount: meetingIds.size,
    initiativesCount: groupInitiatives.length,
    openActionsCount: open.length,
    nextDeadline: deadlines[0] || null,
  };
}

function isOpen(action) {
  if (!action.status) return true;
  return OPEN_ACTION_STATUSES.has(action.status) || action.status === "assigned";
}

export default function CommitteeWorkstreams() {
  const { orgRef, committeeRef } = useParams();
  const { data } = useCommittee();
  const { t, lang } = useLanguage();

  if (!data) return <TableSkeleton rows={4} />;

  const workGroups = data.workstreams || [];
  const memberships = data.workstream_memberships || [];
  const orgIndex = data.org_index || {};
  const actions = data.registers?.actions || [];
  const initiatives = data.registers?.initiatives || [];
  const base = `/o/${orgRef}/c/${committeeRef}`;

  // The committee seat an institution holds — DERIVED from the committee's own members, so a work
  // group's lead institution is traceable to its seat without storing a false link on the delegate.
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

  if (workGroups.length === 0) {
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
        subtitle={t(
          "المجموعات التشغيلية المنبثقة عن اللجنة، ورؤساؤها والجهات المشاركة فيها.",
          "The committee's operational work groups, their leads and participating institutions."
        )}
        badge={<span className="text-sm text-muted-foreground arabic-figures">({workGroups.length})</span>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {workGroups.map((wg) => {
          const counts = countsFor(wg, memberships, actions, initiatives, lang);
          const leadOrg = wg.lead_organization_id ? orgIndex[wg.lead_organization_id] : null;
          const participants = (wg.participating_organization_ids || []).map((id) => orgIndex[id]).filter(Boolean);
          return (
            <WorkGroupCard
              key={wg.id}
              workGroup={wg}
              leadOrg={leadOrg}
              participants={participants}
              memberCount={counts.memberCount}
              meetingsCount={counts.meetingsCount}
              initiativesCount={counts.initiativesCount}
              openActionsCount={counts.openActionsCount}
              nextDeadline={counts.nextDeadline}
              leadSeatName={seatName(wg.lead_organization_id)}
              href={`${base}/workstreams/${wg.id}`}
            />
          );
        })}
      </div>
    </div>
  );
}