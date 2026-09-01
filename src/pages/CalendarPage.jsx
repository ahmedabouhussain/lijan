import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Calendar as CalendarIcon } from "lucide-react";
import { MEETING_STATUS, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.Meeting.list();
        setMeetings(data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const sorted = [...meetings].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcoming = sorted.filter((m) => new Date(m.date) >= new Date(new Date().toDateString()));
  const past = sorted.filter((m) => new Date(m.date) < new Date(new Date().toDateString())).reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">التقويم · Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">التقويم الموحد للمؤسسة · Unified institution calendar</p>
      </div>

      {meetings.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="لا توجد اجتماعات" description="تظهر الاجتماعات المجدولة هنا" />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">القادمة · Upcoming</h2>
              <div className="space-y-2">
                {upcoming.map((m) => (
                  <div key={m.id} className="raqeem-card p-4 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{m.title || m.title_ar}</div>
                      <div className="text-xs text-muted-foreground mt-1">{formatDate(m.date)} · {m.mode} · {m.provider !== "none" ? m.provider : ""}</div>
                    </div>
                    <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">السابقة · Past</h2>
              <div className="space-y-2">
                {past.slice(0, 10).map((m) => (
                  <div key={m.id} className="raqeem-card p-4 flex items-center justify-between opacity-75">
                    <div>
                      <div className="text-sm font-medium text-foreground">{m.title || m.title_ar}</div>
                      <div className="text-xs text-muted-foreground mt-1">{formatDate(m.date)}</div>
                    </div>
                    <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}