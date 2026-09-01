import React, { useState, useEffect } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { base44 } from "@/api/base44Client";
import { UserCheck, ShieldCheck, Loader2 } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import { Button } from "@/components/ui/button";

const ATT_STATUS = {
  present: { ar: "حاضر", en: "Present", color: "bg-emerald-50 text-emerald-700" },
  absent: { ar: "غائب", en: "Absent", color: "bg-red-50 text-red-700" },
  apologies: { ar: "اعتذار", en: "Apologies", color: "bg-amber-50 text-amber-700" },
  proxy: { ar: "وكالة", en: "Proxy", color: "bg-secondary text-muted-foreground" },
  late: { ar: "متأخر", en: "Late", color: "bg-amber-100 text-amber-700" },
};

export default function CommitteeAttendance() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("attendance");
  const { canManageMinutes } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [certifyingMeeting, setCertifyingMeeting] = useState(null);

  const committeeId = data?.committee?.id;

  const fetchRecords = async () => {
    if (!committeeId) return;
    const meetingIds = [...(data?.meetings?.upcoming || []), ...(data?.meetings?.previous || [])].map((m) => m.id);
    if (meetingIds.length === 0) { setRecords([]); setLoading(false); return; }
    try {
      const all = await base44.entities.Attendance.list();
      const filtered = (all || []).filter((a) => meetingIds.includes(a.meeting_id));
      setRecords(filtered);
    } catch { setRecords([]); }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [committeeId]);

  const byMeeting = {};
  records.forEach((r) => {
    if (!byMeeting[r.meeting_id]) byMeeting[r.meeting_id] = [];
    byMeeting[r.meeting_id].push(r);
  });
  const allMeetings = [...(data?.meetings?.upcoming || []), ...(data?.meetings?.previous || [])];

  const handleCertify = async (meetingId) => {
    await execute("CertifyAttendance", {
      committee_id: committeeId,
      meeting_id: meetingId,
    }, () => {
      setCertifyingMeeting(null);
      fetchRecords();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-bold">{getTitle("سجل الحضور", "Attendance", lang)}</h1>
      </div>

      {loading ? (
        <div className="raqeem-card p-8 text-center text-sm text-muted-foreground">{t("جارٍ التحميل...", "Loading...")}</div>
      ) : records.length === 0 ? (
        <EmptyState icon={UserCheck} title={t("لا يوجد سجل حضور", "No Attendance")} description={t("لم يتم تسجيل الحضور لأي اجتماع.", "No attendance recorded for any meeting.")} />
      ) : (
        <div className="space-y-3">
          {allMeetings.filter((m) => byMeeting[m.id]).map((m) => {
            const attendees = byMeeting[m.id];
            const present = attendees.filter((a) => a.attendance_status === "present" || a.attendance_status === "late").length;
            const isCertified = attendees.some((a) => a.certified);
            return (
              <div key={m.id} className="raqeem-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">{m.title || m.title_ar}</h3>
                  <div className="flex items-center gap-2">
                    {isCertified && (
                      <span className="text-xs text-emerald-700 flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {t("معتمد", "Certified")}
                      </span>
                    )}
                    {canManageMinutes && !isCertified && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={submitting && certifyingMeeting === m.id}
                        onClick={() => { setCertifyingMeeting(m.id); handleCertify(m.id); }}
                        className="min-h-[36px]"
                      >
                        {submitting && certifyingMeeting === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        {t("اعتماد الحضور", "Certify")}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mb-2">{t("الحاضرون", "Present")}: {present} / {attendees.length}</div>
                <div className="space-y-1.5">
                  {attendees.map((a) => {
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
            );
          })}
        </div>
      )}
    </div>
  );
}