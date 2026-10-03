import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { base44 } from "@/api/base44Client";
import StatusBadge from "@/components/raqeem/StatusBadge";
import AuthorityLens from "@/components/raqeem/AuthorityLens";
import PageHeader from "@/components/raqeem/PageHeader";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";
import { ACTION_STATUS, formatDate, isOverdue } from "@/lib/raqeemUtils";
import { CheckSquare, AlertTriangle, Clock, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { L } from "@/lib/l10n";

export default function CommitteeActions() {
  const { data, reload } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("actions");
  const [updating, setUpdating] = useState(null);
  const [closeModal, setCloseModal] = useState(null);
  const [evidenceUrl, setEvidenceUrl] = useState("");

  if (!data) return <TableSkeleton rows={4} />;
  const { my_role, is_oversight, is_recused, committee } = data;
  const actions = data.registers.actions || [];
  const overdue = actions.filter((a) => isOverdue(a.deadline) && a.status !== "closed");
  const open = actions.filter((a) => !["closed", "verified"].includes(a.status));
  const completed = actions.filter((a) => ["closed", "verified"].includes(a.status));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <PageHeader
          icon={CheckSquare}
          title={getTitle("إجراءات اللجنة", "Committee Actions", lang)}
          subtitle={getDescription("متابعة تنفيذ الإجراءات والتزامات اللجنة", "Track committee action items and commitments", lang)}
          badge={<span className="text-sm text-muted-foreground">({actions.length})</span>}
        />
      </div>

      {/* Authority Lens for action management */}
      <AuthorityLens
        capability="close_action"
        role={my_role}
        isOversight={is_oversight}
        isRecused={is_recused}
        committeeName={L.name(committee)}
      />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="raqeem-card p-3 text-center">
          <div className="text-lg font-bold text-foreground">{open.length}</div>
          <div className="text-[11px] text-muted-foreground">{t("مفتوحة", "Open")}</div>
        </div>
        <div className="raqeem-card p-3 text-center">
          <div className="text-lg font-bold text-amber-700">{overdue.length}</div>
          <div className="text-[11px] text-muted-foreground">{t("متأخرة", "Overdue")}</div>
        </div>
        <div className="raqeem-card p-3 text-center">
          <div className="text-lg font-bold text-emerald-700">{completed.length}</div>
          <div className="text-[11px] text-muted-foreground">{t("مكتملة", "Completed")}</div>
        </div>
      </div>

      {/* Overdue actions first */}
      {overdue.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t("إجراءات متأخرة", "Overdue Actions")}
          </h3>
          <div className="raqeem-card divide-y divide-border border-l-4 border-l-amber-400">
            {overdue.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{a.owner_name}</span>
                    <Clock className="w-3 h-3" />
                    <span className="text-amber-700">{formatDate(a.deadline)}</span>
                  </div>
                </div>
                <StatusBadge label={L.label(ACTION_STATUS, a.status, a.status)} colorClass={ACTION_STATUS[a.status]?.color} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open actions */}
      {open.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t("إجراءات مفتوحة", "Open Actions")}</h3>
          <div className="raqeem-card divide-y divide-border">
            {open.map((a) => (
              <div key={a.id} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.owner_name} · {formatDate(a.deadline)}
                    </div>
                  </div>
                  <StatusBadge label={L.label(ACTION_STATUS, a.status, a.status)} colorClass={ACTION_STATUS[a.status]?.color} />
                </div>
                {/* Progress bar */}
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${a.progress_percent || 0}%` }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground w-8 text-right">{a.progress_percent || 0}%</span>
                </div>
                {/* Update controls */}
                {!is_oversight && !is_recused && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <Button size="sm" variant="outline" disabled={updating === a.id} onClick={async () => {
                      setUpdating(a.id);
                      await base44.functions.invoke("UpdateActionProgress", { action_id: a.id, progress_percent: Math.min(100, (a.progress_percent || 0) + 25), status: "in_progress" });
                      setUpdating(null); reload();
                    }}>
                      {updating === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "+25%"}
                    </Button>
                    {(a.progress_percent || 0) >= 100 && (
                      <Button size="sm" disabled={updating === a.id} onClick={() => { setCloseModal(a.id); setEvidenceUrl(""); }}>
                        {t("إغلاق بالإثبات", "Close with Evidence")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Close action modal */}
      {closeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCloseModal(null)}>
          <div className="raqeem-card p-5 max-w-md w-full mx-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("إغلاق الإجراء", "Close Action")}</h3>
              <button onClick={() => setCloseModal(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground">{t("يجب تقديم رابط دليل الإنجاز قبل الإغلاق.", "Evidence URL is required before closure.")}</p>
            <div><Label>{t("رابط الدليل", "Evidence URL")}</Label><Input aria-label={t("رابط الدليل", "Evidence URL")} value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://..." dir="ltr" /></div>
            <Button disabled={updating === closeModal || !evidenceUrl.trim()} onClick={async () => {
              setUpdating(closeModal);
              await base44.functions.invoke("CloseAction", { action_id: closeModal, evidence_url: evidenceUrl });
              setUpdating(null); setCloseModal(null); reload();
            }} className="w-full">
              {updating === closeModal ? <Loader2 className="w-4 h-4 animate-spin" /> : t("تأكيد الإغلاق", "Confirm Close")}
            </Button>
          </div>
        </div>
      )}

      {actions.length === 0 && (
        <div className="raqeem-card p-8 text-center">
          <CheckSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("لا توجد إجراءات", "No actions recorded")}</p>
        </div>
      )}
    </div>
  );
}