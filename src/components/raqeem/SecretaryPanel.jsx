import React from "react";
import { Link } from "react-router-dom";
import { FileText, Calendar, AlertTriangle, CheckSquare, Clock, Sparkles } from "lucide-react";
import { MEETING_STATUS, MINUTES_STATUS, ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";

export default function SecretaryPanel({ committeeId, meetings, decisions, actions, minutes }) {
  // Meetings needing agenda preparation: scheduled, agenda not ready
  const agendasToPrepare = meetings.filter((m) => m.status === "scheduled" && !m.agenda_ready);

  // Completed meetings without minutes
  const minutesMissing = meetings.filter((m) => {
    if (m.status !== "completed") return false;
    return !minutes.some((min) => min.meeting_id === m.id);
  });

  // Minutes pending review/approval
  const minutesPending = minutes.filter((m) => m.status === "draft" || m.status === "in_review");

  // Overdue actions to follow up
  const overdueActions = actions.filter((a) => isOverdue(a.deadline) && a.status !== "closed" && a.status !== "verified");

  // Pending decisions not yet issued
  const decisionsToIssue = decisions.filter((d) => d.status === "approved" && d.status !== "issued");

  const tasks = [
    { key: "agendas", icon: Calendar, label: "جداول أعمال بحاجة لإعداد", items: agendasToPrepare, color: "text-blue-700", linkBase: "/meetings/" },
    { key: "minutes_missing", icon: Sparkles, label: "محاضر بحاجة للإنشاء", items: minutesMissing, color: "text-amber-700", linkBase: "/meetings/" },
    { key: "minutes_pending", icon: FileText, label: "محاضر بانتظار المراجعة/الاعتماد", items: minutesPending, color: "text-purple-700", linkBase: "/meetings/" },
    { key: "decisions", icon: CheckSquare, label: "قرارات معتمدة بحاجة للإصدار", items: decisionsToIssue, color: "text-emerald-700", linkBase: "/decisions/" },
    { key: "overdue", icon: AlertTriangle, label: "إجراءات متأخرة للمتابعة", items: overdueActions, color: "text-destructive", linkBase: "/execution" },
  ];

  const totalTasks = tasks.reduce((sum, t) => sum + t.items.length, 0);

  return (
    <div className="raqeem-card p-5 border-r-4 border-r-primary">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> لوحة أمين السر · Secretary Board
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">المهام التشغيلية لإدارة دورة حياة اللجنة</p>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          {totalTasks} مهمة
        </span>
      </div>

      {totalTasks === 0 ? (
        <div className="text-center py-6">
          <CheckSquare className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">جميع المهام الحالية مكتملة — لا توجد بنود معلقة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.filter((t) => t.items.length > 0).map((task) => (
            <div key={task.key} className="border border-border rounded-md p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <task.icon className={`w-4 h-4 ${task.color}`} />
                  <span className="text-sm font-medium">{task.label}</span>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary ${task.color}`}>
                  {task.items.length}
                </span>
              </div>
              <div className="space-y-1">
                {task.items.slice(0, 4).map((item) => {
                  const id = task.key === "minutes_pending" ? item.meeting_id : item.id;
                  const title = item.title || item.title_ar || item.member_name || "—";
                  const sub = item.deadline ? `موعد: ${formatDate(item.deadline)}` : item.date ? formatDate(item.date) : "";
                  return (
                    <Link
                      key={item.id || item.meeting_id}
                      to={`${task.linkBase}${id}`}
                      className="flex items-center justify-between py-1 px-2 rounded hover:bg-secondary/40 -mx-2"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-medium text-foreground truncate block">{title}</span>
                        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
                      </div>
                      {task.key === "minutes_pending" && (
                        <StatusBadge label={MINUTES_STATUS[item.status]?.ar} colorClass={MINUTES_STATUS[item.status]?.color} />
                      )}
                      {task.key === "overdue" && (
                        <StatusBadge label={ACTION_STATUS[item.status]?.ar} colorClass={ACTION_STATUS[item.status]?.color} />
                      )}
                    </Link>
                  );
                })}
                {task.items.length > 4 && (
                  <span className="text-xs text-muted-foreground px-2">+{task.items.length - 4} أخرى...</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}