import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckSquare, AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { ACTION_STATUS, PRIORITY, formatDate, isOverdue, daysUntil } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";
import EmptyState from "@/components/raqeem/EmptyState";
import ActionTrackerChat from "@/components/raqeem/ActionTrackerChat";
import ActionManager from "@/components/raqeem/ActionManager";
import { ESCALATION_LEVEL } from "@/lib/raqeemUtils";

export default function Execution() {
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [view, setView] = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await base44.entities.Action.list();
        setActions(data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const refresh = (updated) => {
    setActions((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    setSelected((s) => (s && s.id === updated.id ? { ...s, ...updated } : s));
  };

  const overdue = actions.filter((a) => isOverdue(a.deadline) && a.status !== "closed" && a.status !== "verified");
  const active = actions.filter((a) => ["assigned", "in_progress", "blocked", "evidence_pending"].includes(a.status));
  const completed = actions.filter((a) => ["verified", "closed"].includes(a.status));

  const list = view === "overdue" ? overdue : view === "active" ? active : view === "completed" ? completed : actions;

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
          <h1 className="text-2xl font-bold text-foreground">التنفيذ · Execution</h1>
          <p className="text-sm text-muted-foreground mt-1">تتبع الإجراءات عبر اللجان · Cross-committee execution</p>
        </div>
        <ActionTrackerChat />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <button onClick={() => setView("overdue")} className={`raqeem-card p-4 text-right transition-colors ${view === "overdue" ? "ring-2 ring-destructive" : "hover:bg-secondary/30"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase">متأخر</span>
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold text-destructive">{overdue.length}</div>
        </button>
        <button onClick={() => setView("active")} className={`raqeem-card p-4 text-right transition-colors ${view === "active" ? "ring-2 ring-primary" : "hover:bg-secondary/30"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase">جارٍ</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-foreground">{active.length}</div>
        </button>
        <button onClick={() => setView("completed")} className={`raqeem-card p-4 text-right transition-colors ${view === "completed" ? "ring-2 ring-emerald-500" : "hover:bg-secondary/30"}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground uppercase">مكتمل</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{completed.length}</div>
        </button>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={CheckSquare} title="لا توجد إجراءات" description="تظهر الإجراءات هنا عند إنشائها من القرارات المعتمدة" />
      ) : (
        <div className="raqeem-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground uppercase tracking-wider border-b border-border bg-secondary/30">
                <th className="text-right py-3 px-4 font-medium">الإجراء</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">المسؤول</th>
                <th className="text-right py-3 px-4 font-medium hidden lg:table-cell">الأولوية</th>
                <th className="text-right py-3 px-4 font-medium hidden md:table-cell">الموعد</th>
                <th className="text-right py-3 px-4 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => {
                const days = daysUntil(a.deadline);
                return (
                  <tr key={a.id} onClick={() => setSelected(a)} className="border-b border-border last:border-0 hover:bg-secondary/40 cursor-pointer transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        {a.title}
                        {a.extension_status === "requested" && <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                        {a.compliance_verified && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">{a.owner_name || "—"}</td>
                    <td className={`py-3 px-4 hidden lg:table-cell font-medium ${PRIORITY[a.priority]?.color || ""}`}>
                      {PRIORITY[a.priority]?.ar || a.priority}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <div className="text-muted-foreground">{formatDate(a.deadline)}</div>
                      {days !== null && days < 0 && a.status !== "closed" && a.status !== "verified" && (
                        <div className="text-xs text-destructive">متأخر {Math.abs(days)} يوم</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge label={ACTION_STATUS[a.status]?.ar || a.status} colorClass={ACTION_STATUS[a.status]?.color} />
                        {a.escalation_level && a.escalation_level !== "none" && (
                          <StatusBadge label={ESCALATION_LEVEL[a.escalation_level]?.ar} colorClass="text-destructive bg-red-50" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ActionManager action={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} onUpdate={refresh} />
    </div>
  );
}