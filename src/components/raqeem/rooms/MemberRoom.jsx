import React from "react";
import { Link } from "react-router-dom";
import { Calendar, Gavel, CheckSquare, Clock } from "lucide-react";
import { MEETING_STATUS, DECISION_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";

export default function MemberRoom({ meetings, decisions, actions, currentUser }) {
  const now = new Date();
  const upcomingMeetings = meetings
    .filter((m) => new Date(m.date) >= now && m.status === "scheduled")
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 5);

  const votingDecisions = decisions.filter((d) => d.status === "voting");
  const myActions = actions.filter((a) => {
    if (!currentUser?.full_name) return false;
    return a.owner_name === currentUser.full_name && a.status !== "closed" && a.status !== "verified";
  });
  const myOverdue = myActions.filter((a) => isOverdue(a.deadline));

  return (
    <div className="space-y-4">
      <div className="raqeem-card p-5 border-r-4 border-r-accent">
        <div className="flex items-center gap-2 mb-1">
          <CheckSquare className="w-4 h-4 text-accent" />
          <h2 className="text-sm font-semibold text-foreground">غرفة العضو · Member Room</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">اجتماعاتك القادمة، القرارات المطروحة للتصويت، وإجراءاتك المسندة</p>

        {/* Voting decisions */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Gavel className="w-3.5 h-3.5" /> قرارات مطروحة للتصويت
            </span>
            {votingDecisions.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{votingDecisions.length}</span>
            )}
          </div>
          {votingDecisions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">لا توجد قرارات للتصويت حالياً</p>
          ) : (
            <div className="divide-y divide-border">
              {votingDecisions.map((d) => (
                <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between py-2 hover:bg-secondary/40 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                    {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                  </div>
                  <StatusBadge label="للتصويت" colorClass="text-primary bg-primary/10" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming meetings */}
        <div className="mb-4 border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> اجتماعاتك القادمة
            </span>
            {upcomingMeetings.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{upcomingMeetings.length}</span>
            )}
          </div>
          {upcomingMeetings.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">لا توجد اجتماعات قادمة</p>
          ) : (
            <div className="divide-y divide-border">
              {upcomingMeetings.map((m) => {
                const days = Math.ceil((new Date(m.date) - now) / 86400000);
                return (
                  <Link key={m.id} to={`/meetings/${m.id}`} className="flex items-center justify-between py-2 hover:bg-secondary/40 -mx-2 px-2 rounded">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{m.title || m.title_ar}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(m.date)} · {days === 0 ? "اليوم" : `بعد ${days} يوم`}</div>
                    </div>
                    <StatusBadge label={MEETING_STATUS[m.status]?.ar || m.status} colorClass={MEETING_STATUS[m.status]?.color} />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* My actions */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> إجراءات مسندة إليك
            </span>
            {myOverdue.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-50 text-destructive">{myOverdue.length} متأخر</span>
            )}
          </div>
          {myActions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">لا توجد إجراءات مسندة إليك</p>
          ) : (
            <div className="divide-y divide-border">
              {myActions.slice(0, 5).map((a) => (
                <Link key={a.id} to="/execution" className="flex items-center justify-between py-2 hover:bg-secondary/40 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(a.deadline)}</div>
                  </div>
                  <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}