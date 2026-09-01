import React from "react";
import { Link } from "react-router-dom";
import { Gavel, ShieldCheck, Play, CheckCircle2, Circle, FileText } from "lucide-react";
import { DECISION_STATUS } from "@/lib/raqeemUtils";
import StatusBadge from "@/components/raqeem/StatusBadge";

export default function ChairRoom({ committee, members, meetings, decisions, governanceReady, onActivate, activating }) {
  const pendingDecisions = decisions.filter((d) => ["in_review", "proposed", "voting"].includes(d.status));
  const issuedDecisions = decisions.filter((d) => d.status === "issued" || d.status === "executing" || d.status === "completed");

  const checklist = [
    { label: "الصلاحية محددة", done: !!committee.mandate },
    { label: "الرئيس معيّن", done: !!committee.chair_name },
    { label: "أمين السر معيّن", done: !!committee.secretary_name },
    { label: "النصاب مكتمل", done: members.length >= (committee.quorum_count || 3) },
    { label: "اجتماع واحد على الأقل", done: meetings.length > 0 },
  ];
  const doneCount = checklist.filter((c) => c.done).length;

  return (
    <div className="space-y-4">
      <div className="raqeem-card p-5 border-r-4 border-r-primary">
        <div className="flex items-center gap-2 mb-1">
          <Gavel className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">غرفة الرئيس · Chair Room</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">قرارات بانتظار إشرافك وحالة حوكمة اللجنة</p>

        {/* Pending decisions */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">قرارات بانتظار الاعتماد</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{pendingDecisions.length}</span>
          </div>
          {pendingDecisions.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              لا توجد قرارات معلقة
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingDecisions.map((d) => (
                <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between py-2 hover:bg-secondary/40 -mx-2 px-2 rounded">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                    {d.decision_number && <div className="text-xs text-muted-foreground">{d.decision_number}</div>}
                  </div>
                  <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Governance checklist */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> متطلبات الحوكمة
            </span>
            <span className="text-xs font-semibold text-foreground">{doneCount}/{checklist.length}</span>
          </div>
          <div className="space-y-1.5">
            {checklist.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {c.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Circle className="w-3.5 h-3.5 text-muted-foreground/40" />}
                <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
              </div>
            ))}
          </div>
          {!committee.governance_complete && governanceReady && (
            <button
              onClick={onActivate}
              disabled={activating}
              className="w-full mt-3 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-dark"
            >
              <Play className="w-3.5 h-3.5" /> {activating ? "جارٍ التفعيل..." : "تفعيل اللجنة"}
            </button>
          )}
        </div>
      </div>

      {/* Issued decisions oversight */}
      {issuedDecisions.length > 0 && (
        <div className="raqeem-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-foreground">قرارات سارية تحت إشرافك</h3>
          </div>
          <div className="divide-y divide-border">
            {issuedDecisions.slice(0, 5).map((d) => (
              <Link key={d.id} to={`/decisions/${d.id}`} className="flex items-center justify-between py-2 hover:bg-secondary/40 -mx-2 px-2 rounded">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{d.title}</div>
                  {d.owner_name && <div className="text-xs text-muted-foreground">المسؤول: {d.owner_name}</div>}
                </div>
                <StatusBadge label={DECISION_STATUS[d.status]?.ar || d.status} colorClass={DECISION_STATUS[d.status]?.color} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}