import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  FileText, Search, ChevronLeft, Calendar, Users, CheckCircle2,
  PenLine, Sparkles, Clock,
} from "lucide-react";
import { MINUTES_STATUS, formatDate } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";

const STAGE_GROUPS = {
  all: { label: "الكل", statuses: null },
  draft: { label: "مسودة", statuses: ["draft"] },
  review: { label: "قيد المراجعة", statuses: ["in_review"] },
  approved: { label: "معتمدة", statuses: ["approved"] },
  issued: { label: "صادرة", statuses: ["issued"] },
  amended: { label: "معدلة", statuses: ["amended"] },
};

function MinutesCard({ m, commName, meetingTitle, sigCount }) {
  const status = MINUTES_STATUS[m.status] || { ar: m.status };
  return (
    <Link
      to={`/meetings/${m.meeting_id}`}
      className="raqeem-card p-5 flex flex-col gap-3 hover:border-primary/40 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
              {m.minutes_number || "—"}
            </span>
            {m.generated_by_ai && (
              <span className="inline-flex items-center gap-1 text-[11px] text-purple-600">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            )}
          </div>
          <div className="font-semibold text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-2">
            {meetingTitle || "محضر اجتماع"}
          </div>
        </div>
        <StatusBadge label={status.ar} colorClass={status.color} />
      </div>

      {m.summary_ar && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{m.summary_ar}</p>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="inline-flex items-center gap-1 truncate">
          <Users className="w-3 h-3" /> {commName(m.committee_id)}
        </span>
        {m.issued_date && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(m.issued_date)}
          </span>
        )}
        {sigCount > 0 && (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <PenLine className="w-3 h-3" /> {sigCount} توقيع
          </span>
        )}
        {m.quorum_met && (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="w-3 h-3" /> تحقق النصاب
          </span>
        )}
      </div>

      <div className="flex items-center justify-end pt-1 border-t border-border">
        <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

export default function Minutes() {
  const [loading, setLoading] = useState(true);
  const [minutes, setMinutes] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [committees, setCommittees] = useState([]);
  const [signatures, setSignatures] = useState([]);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("all");

  useEffect(() => {
    async function load() {
      try {
        const [mins, mtgs, coms, sigs] = await Promise.all([
          base44.entities.MeetingMinutes.list().catch(() => []),
          base44.entities.Meeting.list().catch(() => []),
          base44.entities.Committee.list().catch(() => []),
          base44.entities.Signature.filter({ document_type: "MeetingMinutes" }).catch(() => []),
        ]);
        setMinutes(mins || []);
        setMeetings(mtgs || []);
        setCommittees(coms || []);
        setSignatures(sigs || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const meetingTitle = (mid) => meetings.find((m) => m.id === mid)?.title || "—";
  const commName = (cid) => committees.find((c) => c.id === cid)?.name_ar || "—";
  const sigCountFor = (mid) => signatures.filter((s) => s.document_id === mid && s.status === "active").length;

  const counts = useMemo(() => {
    const c = { all: minutes.length };
    Object.entries(STAGE_GROUPS).forEach(([key, group]) => {
      if (key === "all") return;
      c[key] = minutes.filter((m) => group.statuses.includes(m.status)).length;
    });
    return c;
  }, [minutes]);

  const filtered = useMemo(() => {
    const group = STAGE_GROUPS[stage];
    return minutes.filter((m) => {
      const mt = meetingTitle(m.meeting_id);
      const matchSearch = !search || mt.includes(search) || m.summary_ar?.includes(search) || m.minutes_number?.includes(search);
      const matchStage = stage === "all" || group.statuses.includes(m.status);
      return matchSearch && matchStage;
    });
  }, [minutes, meetings, search, stage]);

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
        <h1 className="text-2xl font-bold text-foreground">سجل المحاضر · Minutes Register</h1>
        <p className="text-sm text-muted-foreground mt-1">الأرشيف الموحد لمحاضر الاجتماعات والاعتماد الإلكتروني</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المحاضر..."
            className="w-full pr-10 pl-4 py-2.5 text-sm border border-border rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {Object.entries(STAGE_GROUPS).map(([key, group]) => (
            <button
              key={key}
              onClick={() => setStage(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                stage === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {group.label} {counts[key] > 0 && <span className="opacity-70">· {counts[key]}</span>}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={search || stage !== "all" ? "لا توجد نتائج" : "لا توجد محاضر بعد"}
          description={search || stage !== "all" ? "جرّب تعديل البحث أو الفلترة" : "المحاضر تُولد من صفحة الاجتماع"}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((m) => (
            <MinutesCard
              key={m.id}
              m={m}
              commName={commName}
              meetingTitle={meetingTitle(m.meeting_id)}
              sigCount={sigCountFor(m.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}