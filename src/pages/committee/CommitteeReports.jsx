import React, { useState } from "react";
import { useCommittee } from "@/lib/CommitteeContext";
import { useLanguage } from "@/lib/LanguageContext";
import { usePageConfig } from "@/hooks/usePageConfig";
import { useCommitteeAdmin } from "@/hooks/useCommitteeAdmin";
import { useCrudAction } from "@/hooks/useCrudAction";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, ShieldCheck, CheckCircle, AlertTriangle, Clock, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isOverdue } from "@/lib/raqeemUtils";
import { TableSkeleton } from "@/components/raqeem/LoadingSkeleton";

function MaturityBar({ label, value, color }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function CommitteeReports() {
  const { data } = useCommittee();
  const { t, lang } = useLanguage();
  const { getTitle, getDescription } = usePageConfig("reports");
  const { canManageGovernance } = useCommitteeAdmin();
  const { submitting, execute } = useCrudAction();

  if (!data) return <TableSkeleton rows={4} />;
  const { counters, committee, registers, meetings, members } = data;
  const committeeId = committee.id;

  const decisions = registers.decisions || [];
  const actions = registers.actions || [];
  const minutes = registers.minutes || [];
  const allMeetings = [...(meetings?.upcoming || []), ...(meetings?.previous || [])];

  const issuedDecisions = decisions.filter((d) => ["issued", "executing", "completed", "closed"].includes(d.status));
  const completedActions = actions.filter((a) => ["closed", "verified"].includes(a.status));
  const overdueActions = actions.filter((a) => isOverdue(a.deadline) && a.status !== "closed");
  const issuedMinutes = minutes.filter((m) => ["approved", "issued"].includes(m.status));

  const decisionMaturity = decisions.length > 0 ? Math.round((issuedDecisions.length / decisions.length) * 100) : 0;
  const executionMaturity = actions.length > 0 ? Math.round((completedActions.length / actions.length) * 100) : 0;
  const documentationMaturity = minutes.length > 0 ? Math.round((issuedMinutes.length / minutes.length) * 100) : 0;
  const meetingRegularity = allMeetings.length > 0 ? Math.min(100, Math.round((allMeetings.length / 4) * 100)) : 0;
  const overallMaturity = Math.round((decisionMaturity + executionMaturity + documentationMaturity + meetingRegularity) / 4);

  const handleGenerate = async () => {
    await execute("GenerateCommitteeGovernance", { committee_id: committeeId });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">{getTitle("تقارير اللجنة", "Committee Reports", lang)}</h1>
        </div>
        {canManageGovernance && (
          <Button size="sm" variant="outline" disabled={submitting} onClick={handleGenerate} className="min-h-[44px]">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {t("توليد تقرير", "Generate Report")}
          </Button>
        )}
      </div>

      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("نضج الحوكمة", "Governance Maturity")}</h3>
        </div>
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
          <div className="relative w-16 h-16 shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray={`${overallMaturity} 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{overallMaturity}%</span>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{t("النضج الإجمالي", "Overall Maturity")}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {overallMaturity >= 75 ? t("حوكمة ناضجة", "Mature Governance") : overallMaturity >= 50 ? t("حوكمة متطورة", "Developing Governance") : t("حوكمة ناشئة", "Emerging Governance")}
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <MaturityBar label={t("نضج القرارات", "Decision Maturity")} value={decisionMaturity} color="bg-primary" />
          <MaturityBar label={t("نضج التنفيذ", "Execution Maturity")} value={executionMaturity} color="bg-emerald-500" />
          <MaturityBar label={t("نضج التوثيق", "Documentation Maturity")} value={documentationMaturity} color="bg-accent" />
          <MaturityBar label={t("انتظام الاجتماعات", "Meeting Regularity")} value={meetingRegularity} color="bg-accent" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: t("الأعضاء", "Members"), value: counters?.members || 0, icon: ShieldCheck },
          { label: t("الاجتماعات", "Meetings"), value: counters?.meetings || 0, icon: Clock },
          { label: t("القرارات الصادرة", "Issued Decisions"), value: issuedDecisions.length, icon: CheckCircle },
          { label: t("إجراءات متأخرة", "Overdue Actions"), value: overdueActions.length, icon: AlertTriangle },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="raqeem-card p-3">
              <Icon className="w-4 h-4 text-muted-foreground mb-1.5" />
              <div className="text-lg font-bold text-foreground">{s.value}</div>
              <div className="text-[11px] text-muted-foreground leading-tight">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}