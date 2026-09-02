import React, { useMemo } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Bot, CheckCircle2, XCircle, Clock, BarChart3,
  TrendingUp, FileCheck, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * AIAccuracyDashboard — Section 15: AI Accuracy Dashboard
 * Displays accuracy & quality metrics for AI-generated outputs:
 *   - Total outputs, approval rate, rejection rate, pending review
 *   - Human review coverage
 *   - Output type breakdown
 *   - Model usage breakdown
 *   - 30-day trend (generated vs approved)
 * Calm Sovereign design — minimalist stat cards, no heavy charts.
 */
export default function AIAccuracyDashboard({ records = [] }) {
  const { t, lang } = useLanguage();

  const metrics = useMemo(() => {
    const total = records.length;
    const approved = records.filter((r) => r.approved || r.status === "approved").length;
    const rejected = records.filter((r) => r.status === "rejected").length;
    const pending = records.filter((r) => !r.human_reviewed).length;
    const reviewed = records.filter((r) => r.human_reviewed).length;

    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
    const reviewCoverage = total > 0 ? Math.round((reviewed / total) * 100) : 0;

    // Output type breakdown
    const typeCounts = {};
    records.forEach((r) => {
      const key = r.output_type || "other";
      typeCounts[key] = (typeCounts[key] || 0) + 1;
    });

    // Model usage breakdown
    const modelCounts = {};
    records.forEach((r) => {
      const key = r.model_used || "unknown";
      modelCounts[key] = (modelCounts[key] || 0) + 1;
    });

    // 30-day trend
    const now = new Date();
    const days = Array.from({ length: 6 }, (_, i) => {
      const start = new Date(now);
      start.setDate(start.getDate() - (5 - i) * 5);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 5);
      const gen = records.filter((r) => {
        const d = new Date(r.generated_at || r.created_date);
        return d >= start && d < end;
      }).length;
      const app = records.filter((r) => {
        const d = new Date(r.generated_at || r.created_date);
        return d >= start && d < end && (r.approved || r.status === "approved");
      }).length;
      return { label: start.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }), gen, app };
    });

    return {
      total, approved, rejected, pending, reviewed,
      approvalRate, rejectionRate, reviewCoverage,
      typeCounts, modelCounts, trend: days,
    };
  }, [records]);

  const typeLabels = {
    meeting_minutes: { ar: "محاضر", en: "Minutes" },
    governance_doc: { ar: "حوكمة", en: "Governance" },
    decision_draft: { ar: "قرارات", en: "Decisions" },
    policy_scenario: { ar: "سياسات", en: "Policy" },
    institutional_memory: { ar: "ذاكرة", en: "Memory" },
    summary: { ar: "ملخصات", en: "Summaries" },
    other: { ar: "أخرى", en: "Other" },
  };

  const maxTrend = Math.max(...metrics.trend.map((d) => d.gen), 1);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">
          {t("لوحة دقة الذكاء الاصطناعي", "AI Accuracy Dashboard")}
        </h3>
      </div>

      {/* Core metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={Bot}
          label={t("إجمالي المخرجات", "Total Outputs")}
          value={metrics.total}
          colorClass="text-foreground"
        />
        <MetricCard
          icon={CheckCircle2}
          label={t("نسبة الاعتماد", "Approval Rate")}
          value={`${metrics.approvalRate}%`}
          subValue={`${metrics.approved} ${t("معتمد", "approved")}`}
          colorClass="text-emerald-600"
        />
        <MetricCard
          icon={XCircle}
          label={t("نسبة الرفض", "Rejection Rate")}
          value={`${metrics.rejectionRate}%`}
          subValue={`${metrics.rejected} ${t("مرفوض", "rejected")}`}
          colorClass="text-destructive"
        />
        <MetricCard
          icon={Clock}
          label={t("بانتظار المراجعة", "Pending Review")}
          value={metrics.pending}
          colorClass="text-amber-600"
        />
      </div>

      {/* Human review coverage bar */}
      <div className="raqeem-card p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileCheck className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">
              {t("تغطية المراجعة البشرية", "Human Review Coverage")}
            </span>
          </div>
          <span className="text-sm font-bold text-primary">{metrics.reviewCoverage}%</span>
        </div>
        <div className="h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${metrics.reviewCoverage}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          {metrics.reviewed} {t("من", "of")} {metrics.total} {t("تمت مراجعتها بشرياً", "reviewed by humans")}
        </p>
      </div>

      {/* Output type & Model breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Type breakdown */}
        <div className="raqeem-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("حسب النوع", "By Output Type")}
          </p>
          {Object.keys(metrics.typeCounts).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t("لا توجد بيانات", "No data")}</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(metrics.typeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => {
                  const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                  const label = typeLabels[key] || typeLabels.other;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground">{lang === "ar" ? label.ar : label.en}</span>
                        <span className="text-muted-foreground">{count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Model breakdown */}
        <div className="raqeem-card p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("حسب النموذج", "By Model Used")}
          </p>
          {Object.keys(metrics.modelCounts).length === 0 ? (
            <p className="text-xs text-muted-foreground italic">{t("لا توجد بيانات", "No data")}</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(metrics.modelCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => {
                  const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-foreground font-mono" dir="ltr">{key}</span>
                        <span className="text-muted-foreground">{count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* 30-day trend mini-chart */}
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("الاتجاه (آخر 30 يوماً)", "Trend (Last 30 Days)")}
          </p>
        </div>
        <div className="flex items-end justify-between gap-2 h-20">
          {metrics.trend.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex items-end justify-center gap-0.5 h-16">
                <div
                  className="w-1/2 bg-primary/30 rounded-t-sm transition-all"
                  style={{ height: `${(d.gen / maxTrend) * 100}%`, minHeight: d.gen > 0 ? "4px" : "0" }}
                  title={`${t("مولّد", "Generated")}: ${d.gen}`}
                />
                <div
                  className="w-1/2 bg-emerald-500/60 rounded-t-sm transition-all"
                  style={{ height: `${(d.app / maxTrend) * 100}%`, minHeight: d.app > 0 ? "4px" : "0" }}
                  title={`${t("معتمد", "Approved")}: ${d.app}`}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border">
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-sm bg-primary/30" /> {t("مولّد", "Generated")}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="w-2 h-2 rounded-sm bg-emerald-500/60" /> {t("معتمد", "Approved")}
          </span>
        </div>
      </div>

      {/* Quality indicator */}
      {metrics.total > 0 && (
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-md text-xs",
          metrics.approvalRate >= 70 ? "bg-emerald-50 text-emerald-700" :
          metrics.approvalRate >= 40 ? "bg-amber-50 text-amber-700" :
          "bg-red-50 text-destructive"
        )}>
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {metrics.approvalRate >= 70
              ? t("جودة عالية — معدل اعتماد ممتاز للمخرجات", "High quality — excellent output approval rate")
              : metrics.approvalRate >= 40
              ? t("جودة متوسطة — يُنصح بمراجعة وتحسين الأوامر", "Moderate quality — consider reviewing and improving prompts")
              : t("جودة منخفضة — راجع الأوامر والمصادر", "Low quality — review prompts and source data")}
          </span>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subValue, colorClass }) {
  return (
    <div className="raqeem-card p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className={cn("w-3.5 h-3.5", colorClass)} />
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className={cn("text-xl font-bold", colorClass)}>{value}</div>
      {subValue && <div className="text-[10px] text-muted-foreground mt-0.5">{subValue}</div>}
    </div>
  );
}