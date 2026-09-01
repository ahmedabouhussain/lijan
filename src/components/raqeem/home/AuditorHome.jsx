import React from "react";
import {
  ShieldAlert,
  FileWarning,
  Eye,
  RotateCcw,
  Unlink,
  CheckCircle2,
  Download,
} from "lucide-react";
import { SectionCard, StatCard, AttentionItem } from "./shared";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { ACTION_STATUS, DECISION_STATUS, COMMITTEE_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";

export default function AuditorHome({ data }) {
  const { committees, decisions, actions, auditLogs } = data;

  // Audit completeness: count by action type
  const auditByAction = auditLogs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {});

  // Missing evidence
  const missingEvidence = actions.filter((a) => a.status === "evidence_pending" || (a.status === "completed" && !a.evidence_url));

  // Unusual access/export events: delete, escalate, sign, issue
  const unusualEvents = auditLogs.filter((log) =>
    ["delete", "escalate", "sign", "issue", "close"].includes(log.action)
  );

  // Reopened records: superseded decisions, committees reopened from closed
  const reopenedRecords = [
    ...decisions.filter((d) => d.status === "superseded"),
    ...committees.filter((c) => c.status === "closing" || c.status === "active" && c.governance_complete === false),
  ];

  // Decision traceability gaps: decisions without meeting_id or legal_basis
  const traceabilityGaps = decisions.filter(
    (d) => !d.meeting_id || !d.legal_basis
  );

  // Closure readiness: committees in closing, actions under review
  const closingCommittees = committees.filter((c) => c.status === "closing");
  const actionsUnderReview = actions.filter((a) => a.status === "under_review");
  const closureReady = [...closingCommittees, ...actionsUnderReview];

  const downloadAuditPack = () => {
    const headers = ["Date", "Actor", "Action", "Entity Type", "Entity ID", "Entity Title", "Description"];
    const rows = auditLogs.map((a) => [
      a.created_date ? new Date(a.created_date).toLocaleString("en-GB") : "",
      a.actor_name || "",
      a.action || "",
      a.entity_type || "",
      a.entity_id || "",
      a.entity_title || "",
      (a.description || "").replace(/"/g, '""'),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `LIJAN_Audit_Pack_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShieldAlert} label="سجلات التدقيق" value={auditLogs.length} accent="text-primary" />
        <StatCard icon={FileWarning} label="أدلة مفقودة" value={missingEvidence.length} accent="text-amber-600" />
        <StatCard icon={Unlink} label="فجوات التتبع" value={traceabilityGaps.length} accent="text-destructive" />
        <StatCard icon={RotateCcw} label="سجلات معاد فتحها" value={reopenedRecords.length} accent="text-red-600" />
      </div>

      {/* Downloadable audit pack */}
      <div className="raqeem-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5 text-primary" />
          <div>
            <div className="text-sm font-semibold text-foreground">حزمة التدقيق القابلة للتنزيل · Downloadable Audit Pack</div>
            <div className="text-xs text-muted-foreground mt-0.5">{auditLogs.length} سجل · تصدير CSV كامل</div>
          </div>
        </div>
        <button
          onClick={downloadAuditPack}
          disabled={auditLogs.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary-dark disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> تنزيل CSV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={ShieldAlert} title="اكتمال التدقيق · Audit Completeness" empty={auditLogs.length === 0} emptyText="لا توجد سجلات تدقيق">
          <div className="space-y-1">
            {Object.entries(auditByAction).slice(0, 6).map(([action, count]) => (
              <div key={action} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground capitalize">{action}</span>
                <span className="text-sm font-semibold text-foreground">{count}</span>
              </div>
            ))}
            {Object.keys(auditByAction).length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">لا توجد سجلات</p>
            )}
          </div>
        </SectionCard>

        <SectionCard icon={FileWarning} title="أدلة مفقودة · Missing Evidence" to="/execution" empty={missingEvidence.length === 0} emptyText="لا توجد أدلة مفقودة">
          {missingEvidence.slice(0, 5).map((a) => (
            <AttentionItem
              key={a.id}
              title={a.title}
              subtitle={`${a.owner_name || "—"} · ${formatDate(a.deadline)}`}
              badge={<StatusBadge label={ACTION_STATUS.evidence_pending.ar} colorClass={ACTION_STATUS.evidence_pending.color} />}
              to="/execution"
            />
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={Eye} title="أحداث وصول/تصدير غير معتادة · Unusual Events" empty={unusualEvents.length === 0} emptyText="لا توجد أحداث غير معتادة">
          {unusualEvents.slice(0, 5).map((log) => (
            <AttentionItem
              key={log.id}
              title={`${log.action} · ${log.entity_type || ""}`}
              subtitle={`${log.actor_name || "—"} · ${log.entity_title || ""}`}
              badge={<StatusBadge label="مراجعة" colorClass="text-amber-700 bg-amber-50" />}
              to="/memory"
            />
          ))}
        </SectionCard>

        <SectionCard icon={RotateCcw} title="سجلات معاد فتحها · Reopened Records" empty={reopenedRecords.length === 0} emptyText="لا توجد سجلات معاد فتحها">
          {reopenedRecords.slice(0, 5).map((r, i) => (
            <AttentionItem
              key={r.id || i}
              title={r.title || r.name_ar || r.name_en}
              subtitle={r.decision_number || r.status}
              badge={<StatusBadge label={r.status === "superseded" ? DECISION_STATUS.superseded.ar : COMMITTEE_STATUS[r.status]?.ar || r.status} colorClass="text-amber-700 bg-amber-50" />}
              to={r.decision_number ? "/decisions" : "/committees"}
            />
          ))}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard icon={Unlink} title="فجوات تتبع القرارات · Traceability Gaps" to="/decisions" empty={traceabilityGaps.length === 0} emptyText="لا توجد فجوات تتبع">
          {traceabilityGaps.slice(0, 5).map((d) => (
            <AttentionItem
              key={d.id}
              title={d.title}
              subtitle={!d.meeting_id ? "بدون اجتماع مرتبط" : "بدون أساس قانوني"}
              badge={<StatusBadge label="فجوة" colorClass="text-destructive bg-red-50" />}
              to="/decisions"
            />
          ))}
        </SectionCard>

        <SectionCard icon={CheckCircle2} title="جاهزية الإغلاق · Closure Readiness" empty={closureReady.length === 0} emptyText="لا توجد عناصر بانتظار الإغلاق">
          {closureReady.slice(0, 5).map((item) => (
            <AttentionItem
              key={item.id}
              title={item.title || item.name_ar || item.name_en}
              subtitle={item.status === "closing" ? "لجنة قيد الإغلاق" : "إجراء قيد المراجعة"}
              badge={<StatusBadge label="بانتظار الإغلاق" colorClass="text-amber-700 bg-amber-50" />}
              to={item.status === "closing" ? "/committees" : "/execution"}
            />
          ))}
        </SectionCard>
      </div>
    </div>
  );
}