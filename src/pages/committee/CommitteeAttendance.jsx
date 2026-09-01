import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { UserCheck } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

const ATT_STATUS = {
  present: { ar: "حاضر", en: "Present", color: "bg-emerald-100 text-emerald-700" },
  absent: { ar: "غائب", en: "Absent", color: "bg-red-100 text-red-700" },
  apologies: { ar: "اعتذار", en: "Apologies", color: "bg-amber-100 text-amber-700" },
  proxy: { ar: "وكالة", en: "Proxy", color: "bg-blue-100 text-blue-700" },
  late: { ar: "متأخر", en: "Late", color: "bg-purple-100 text-purple-700" },
};

export default function CommitteeAttendance() {
  const { data } = useCommittee();
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data?.committee?.id) return;
    const meetingIds = [...(data.meetings?.upcoming || []), ...(data.meetings?.previous || [])].map((m) => m.id);
    if (meetingIds.length === 0) { setRecords([]); setLoading(false); return; }
    base44.entities.Attendance.list()
      .then((all) => {
        const filtered = (all || []).filter((a) => meetingIds.includes(a.meeting_id));
        setRecords(filtered);
      })
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [data?.committee?.id]);

  // Group by meeting
  const byMeeting = {};
  records.forEach((r) => {
    if (!byMeeting[r.meeting_id]) byMeeting[r.meeting_id] = [];
    byMeeting[r.meeting_id].push(r);
  });
  const allMeetings = [...(data?.meetings?.upcoming || []), ...(data?.meetings?.previous || [])];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{t("سجل الحضور", "Attendance")}</h1>
      </div>
      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={UserCheck} title={t("لا يوجد سجل حضور", "No Attendance")} description={t("لم يتم تسجيل الحضور لأي اجتماع.", "No attendance recorded for any meeting.")} />
      ) : (
        <div className="space-y-3">
          {allMeetings.filter((m) => byMeeting[m.id]).map((m) => (
            <div key={m.id} className="raqeem-card p-4">
              <h3 className="text-sm font-semibold mb-3">{m.title || m.title_ar}</h3>
              <div className="space-y-1.5">
                {byMeeting[m.id].map((a) => {
                  const si = ATT_STATUS[a.attendance_status] || ATT_STATUS.absent;
                  return (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium">{a.member_name}</span>
                        {a.proxy_for && <span className="text-xs text-muted-foreground ml-2">({t("نيابة عن", "Proxy for")} {a.proxy_for})</span>}
                      </div>
                      <StatusBadge label={t(si.ar, si.en)} colorClass={si.color} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}