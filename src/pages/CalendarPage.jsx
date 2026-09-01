import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Calendar as CalendarIcon, MapPin, Video, Monitor, ChevronLeft,
  Clock, AlertCircle, CheckCircle2, CalendarDays,
} from "lucide-react";
import { MEETING_STATUS, formatDate, daysUntil } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

const MODE_META = {
  physical: { ar: "حضوري", icon: MapPin },
  online: { ar: "افتراضي", icon: Video },
  hybrid: { ar: "مختلط", icon: Monitor },
};

function relativeLabel(dateStr) {
  const d = daysUntil(dateStr);
  if (d === null) return "";
  if (d === 0) return "اليوم";
  if (d === 1) return "غداً";
  if (d === -1) return "أمس";
  if (d > 0) return `بعد ${d} يوم`;
  return `قبل ${Math.abs(d)} يوم`;
}

function groupByDate(meetings) {
  const groups = {};
  meetings.forEach((m) => {
    const key = new Date(m.date).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  });
  return Object.entries(groups).sort((a, b) => new Date(a[0]) - new Date(b[0]));
}

function MeetingRow({ m }) {
  const mode = MODE_META[m.mode] || MODE_META.hybrid;
  const ModeIcon = mode.icon;
  const time = m.date ? new Date(m.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
  const rel = relativeLabel(m.date);
  return (
    <Link
      to={`/meetings/${m.id}`}
      className="raqeem-card p-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="text-center shrink-0 w-14">
        <div className="text-lg font-bold text-foreground leading-none">{time}</div>
        <div className="text-[11px] text-muted-foreground mt-1">{rel}</div>
      </div>
      <div className="w-px h-10 bg-border shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
          {m.title || m.title_ar}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ModeIcon className="w-3 h-3" /> {mode.ar}
          </span>
          {m.location && (
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3" /> {m.location}
            </span>
          )}
          {m.agenda_ready && (
            <span className="inline-flex items-center gap-1 text-emerald-600">
              <CheckCircle2 className="w-3 h-3" /> جدول جاهز
            </span>
          )}
        </div>
      </div>
      <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
      <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

function DateGroup({ dateKey, meetings, isToday }) {
  const d = new Date(dateKey);
  const dayName = d.toLocaleDateString("en-GB", { weekday: "long" });
  const dateLabel = formatDate(dateKey);
  return (
    <div>
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <div className={`w-1.5 h-1.5 rounded-full ${isToday ? "bg-primary" : "bg-border"}`} />
        <span className="text-xs font-semibold text-foreground">{dayName}</span>
        <span className="text-xs text-muted-foreground">· {dateLabel}</span>
        {isToday && (
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">اليوم</span>
        )}
        <span className="text-xs text-muted-foreground">· {meetings.length} اجتماع</span>
      </div>
      <div className="space-y-2 pr-3 border-r border-border">
        {meetings.map((m) => (
          <MeetingRow key={m.id} m={m} />
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState([]);
  const [tab, setTab] = useState("upcoming");

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

  const { upcoming, past, todayCount, weekCount } = useMemo(() => {
    const sorted = [...meetings].sort((a, b) => new Date(a.date) - new Date(b.date));
    const now = new Date(new Date().toDateString());
    const up = sorted.filter((m) => new Date(m.date) >= now);
    const pa = sorted.filter((m) => new Date(m.date) < now).reverse();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      upcoming: up,
      past: pa,
      todayCount: up.filter((m) => new Date(m.date).toDateString() === now.toDateString()).length,
      weekCount: up.filter((m) => new Date(m.date) < weekEnd).length,
    };
  }, [meetings]);

  const grouped = tab === "upcoming" ? groupByDate(upcoming) : groupByDate(past.slice(0, 30));
  const todayStr = new Date().toDateString();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">التقويم · Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">التقويم الموحد للمؤسسة · Unified institution calendar</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="raqeem-card px-3 py-2 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">هذا الأسبوع</span>
            <span className="text-sm font-bold text-foreground">{weekCount}</span>
          </div>
          {todayCount > 0 && (
            <div className="raqeem-card px-3 py-2 flex items-center gap-2 bg-primary/5">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">اليوم</span>
              <span className="text-sm font-bold text-primary">{todayCount}</span>
            </div>
          )}
        </div>
      </div>

      {meetings.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="لا توجد اجتماعات" description="تظهر الاجتماعات المجدولة هنا" />
      ) : (
        <>
          {/* Tabs */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setTab("upcoming")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === "upcoming" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              القادمة · {upcoming.length}
            </button>
            <button
              onClick={() => setTab("past")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === "past" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              السابقة · {past.length}
            </button>
          </div>

          {grouped.length === 0 ? (
            <EmptyState
              icon={tab === "upcoming" ? CalendarDays : AlertCircle}
              title={tab === "upcoming" ? "لا اجتماعات قادمة" : "لا سجل سابق"}
              description={tab === "upcoming" ? "الاجتماعات المجدولة ستظهر هنا زمنياً" : "الاجتماعات المكتملة ستظهر هنا"}
            />
          ) : (
            <div className="space-y-6">
              {grouped.map(([dateKey, ms]) => (
                <DateGroup key={dateKey} dateKey={dateKey} meetings={ms} isToday={dateKey === todayStr} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}