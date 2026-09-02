import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Users, Check, X, Clock, Mail, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  present: { label: "حاضر", icon: Check, activeClass: "bg-emerald-600 text-white border-emerald-600", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  absent: { label: "غائب", icon: X, activeClass: "bg-red-600 text-white border-red-600", badgeClass: "bg-red-50 text-red-700 border-red-200" },
  apologies: { label: "اعتذار", icon: Mail, activeClass: "bg-amber-600 text-white border-amber-600", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  late: { label: "متأخر", icon: Clock, activeClass: "bg-blue-600 text-white border-blue-600", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
};

const ROLE_ORDER = { chair: 0, vice_chair: 1, secretary: 2, member: 3, observer: 4, advisor: 5 };
const ROLE_LABELS = { chair: "رئيس", vice_chair: "نائب", secretary: "أمين", member: "عضو", observer: "مراقب", advisor: "مستشار" };

export default function AttendancePanel({ meeting, members, attendance, canCertify, onChanged }) {
  const [certifying, setCertifying] = useState(false);
  const [localStatus, setLocalStatus] = useState({});

  const attendanceMap = useMemo(() => {
    const map = {};
    (attendance || []).forEach(a => { map[a.member_name] = a.attendance_status; });
    Object.assign(map, localStatus);
    return map;
  }, [attendance, localStatus]);

  const activeMembers = (members || [])
    .filter(m => m.status === "active")
    .sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99));

  const presentCount = activeMembers.filter(m => {
    const name = m.full_name || m.full_name_ar;
    const s = attendanceMap[name];
    return s === "present" || s === "late";
  }).length;

  const quorumRequired = meeting.quorum_required || 3;
  const quorumMet = presentCount >= quorumRequired;
  const isLive = ["in_progress", "adjourned", "completed"].includes(meeting.status);

  const setStatus = (member, status) => {
    const name = member.full_name || member.full_name_ar;
    setLocalStatus(prev => ({ ...prev, [name]: status }));
  };

  const certify = async () => {
    setCertifying(true);
    try {
      const records = activeMembers.map(m => {
        const name = m.full_name || m.full_name_ar;
        return {
          member_name: name,
          member_role: m.role,
          attendance_status: attendanceMap[name] || "absent",
        };
      });
      await base44.functions.invoke("CertifyAttendance", { meeting_id: meeting.id, attendance_records: records });
      setLocalStatus({});
      onChanged();
    } catch (e) {
      console.error("Certify failed:", e);
    }
    setCertifying(false);
  };

  return (
    <div className="raqeem-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" /> الحضور والنصاب · Attendance & Quorum
        </h2>
        {canCertify && isLive && (
          <Button size="sm" onClick={certify} disabled={certifying || Object.keys(localStatus).length === 0}>
            {certifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            اعتماد الحضور
          </Button>
        )}
      </div>

      {/* Quorum indicator */}
      <div className={cn("rounded-md p-3 mb-4 border", quorumMet ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200")}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            النصاب: {presentCount} / {quorumRequired} حاضر
          </span>
          <span className={cn("text-xs font-semibold px-2 py-0.5 rounded text-white", quorumMet ? "bg-emerald-600" : "bg-amber-600")}>
            {quorumMet ? "اكتمل النصاب" : "النصاب غير مكتمل"}
          </span>
        </div>
        <div className="mt-2 h-2 bg-white/50 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", quorumMet ? "bg-emerald-500" : "bg-amber-500")}
            style={{ width: `${Math.min(100, (presentCount / quorumRequired) * 100)}%` }}
          />
        </div>
      </div>

      {/* Member list */}
      <div className="space-y-1">
        {activeMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا يوجد أعضاء نشطون</p>
        ) : (
          activeMembers.map(m => {
            const name = m.full_name || m.full_name_ar;
            const currentStatus = attendanceMap[name] || "absent";
            return (
              <div key={m.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] text-muted-foreground uppercase w-12 shrink-0 font-medium">{ROLE_LABELS[m.role] || m.role}</span>
                  <span className="text-sm font-medium text-foreground truncate">{name}</span>
                  {m.institution_name && <span className="text-xs text-muted-foreground truncate hidden md:inline">· {m.institution_name}</span>}
                </div>
                {canCertify && isLive ? (
                  <div className="flex items-center gap-1 shrink-0">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                      const Icon = cfg.icon;
                      const isActive = currentStatus === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setStatus(m, key)}
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] border transition-colors",
                            isActive ? cfg.activeClass : "bg-white border-border text-muted-foreground hover:bg-secondary"
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          <span className="hidden sm:inline">{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <StatusBadge
                    label={STATUS_CONFIG[currentStatus]?.label || currentStatus}
                    colorClass={cn("border", STATUS_CONFIG[currentStatus]?.badgeClass)}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}