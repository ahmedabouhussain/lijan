import React from "react";
import CommitteeHubTabs from "@/components/raqeem/CommitteeHubTabs";
import CommitteeMeetings from "@/pages/committee/CommitteeMeetings";
import CommitteeCalendar from "@/pages/committee/CommitteeCalendar";
import CommitteeAgenda from "@/pages/committee/CommitteeAgenda";
import CommitteePacks from "@/pages/committee/CommitteePacks";
import CommitteeAttendance from "@/pages/committee/CommitteeAttendance";
import { Calendar, ClipboardList, Package, UserCheck } from "lucide-react";

const ADMIN_ROLES = ["chair", "vice_chair", "secretary", "committee_administrator"];

export default function MeetingsHub() {
  return (
    <CommitteeHubTabs
      hubKey="meetings"
      hubLabel="الاجتماعات"
      hubLabelEn="Meetings"
      tabs={[
        { key: "meetings", label: "الاجتماعات", labelEn: "Meetings", icon: Calendar, component: CommitteeMeetings },
        { key: "calendar", label: "التقويم", labelEn: "Calendar", icon: Calendar, component: CommitteeCalendar },
        { key: "agenda", label: "جدول الأعمال", labelEn: "Agenda", icon: ClipboardList, component: CommitteeAgenda },
        { key: "packs", label: "حزم الاجتماعات", labelEn: "Meeting Packs", icon: Package, component: CommitteePacks, roles: ADMIN_ROLES },
        { key: "attendance", label: "الحضور", labelEn: "Attendance", icon: UserCheck, component: CommitteeAttendance },
      ]}
    />
  );
}