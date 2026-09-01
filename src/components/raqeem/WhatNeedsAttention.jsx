import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, Users, FileText, TrendingDown, AlertCircle, Lightbulb } from "lucide-react";

export function detectSignals(data) {
  if (!data) return [];
  const { committee, members, meetings, registers } = data;
  const signals = [];
  const now = new Date();

  const upcoming = meetings?.upcoming || [];
  const actions = registers?.actions || [];
  const decisions = registers?.decisions || [];

  // Quorum risk
  if (upcoming.length > 0 && members.length < (committee.quorum_count || 3)) {
    signals.push({
      type: "quorum_risk",
      icon: Users,
      severity: "high",
      title: { ar: "خطر النصاب للاجتماع القادم", en: "Quorum Risk for Next Meeting" },
      detail: {
        ar: `الاجتماع القادم يحتاج ${committee.quorum_count || 3} أعضاء، ومتاح حالياً ${members.length}`,
        en: `Next meeting needs ${committee.quorum_count || 3} members, ${members.length} currently available`,
      },
      confidence: "medium",
      horizon: { ar: "هذا الأسبوع", en: "This week" },
    });
  }

  // Overdue actions
  const overdueActions = actions.filter((a) => {
    if (!a.deadline || a.status === "closed") return false;
    return new Date(a.deadline) < now;
  });
  if (overdueActions.length > 0) {
    signals.push({
      type: "overdue_actions",
      icon: AlertTriangle,
      severity: "high",
      title: { ar: `${overdueActions.length} إجراء متأخر`, en: `${overdueActions.length} Overdue Actions` },
      detail: {
        ar: "إجراءات تجاوزت موعدها النهائي وتحتاج متابعة",
        en: "Actions have passed their deadline and need follow-up",
      },
      confidence: "high",
      horizon: { ar: "فوري", en: "Immediate" },
    });
  }

  // Pack publication delay
  const nextMeeting = upcoming[0];
  if (nextMeeting && !nextMeeting.agenda_ready && new Date(nextMeeting.date) > now) {
    const daysUntil = Math.ceil((new Date(nextMeeting.date) - now) / (1000 * 60 * 60 * 24));
    if (daysUntil <= 3) {
      signals.push({
        type: "pack_delay",
        icon: FileText,
        severity: "medium",
        title: { ar: "تأخر في إعداد حزمة الاجتماع", en: "Meeting Pack Publication Delay" },
        detail: {
          ar: `الاجتماع خلال ${daysUntil} أيام والحزمة غير جاهزة`,
          en: `Meeting in ${daysUntil} days and pack is not ready`,
        },
        confidence: "high",
        horizon: { ar: `${daysUntil} أيام`, en: `${daysUntil} days` },
      });
    }
  }

  // Member term expiry
  const expiringMembers = members.filter((m) => {
    if (!m.term_end) return false;
    const days = Math.ceil((new Date(m.term_end) - now) / (1000 * 60 * 60 * 24));
    return days > 0 && days <= 30;
  });
  if (expiringMembers.length > 0) {
    signals.push({
      type: "term_expiry",
      icon: Clock,
      severity: "medium",
      title: { ar: `${expiringMembers.length} عضو تنتهي مدته قريباً`, en: `${expiringMembers.length} Members with Expiring Terms` },
      detail: {
        ar: "مدد أعضاء تنتهي خلال 30 يوماً",
        en: "Member terms expiring within 30 days",
      },
      confidence: "high",
      horizon: { ar: "30 يوماً", en: "30 days" },
    });
  }

  // Repeated decision deferral
  const deferredDecisions = decisions.filter((d) => d.status === "deferred");
  if (deferredDecisions.length >= 2) {
    signals.push({
      type: "repeated_deferral",
      icon: TrendingDown,
      severity: "low",
      title: { ar: "تأجيل متكرر للقرارات", en: "Repeated Decision Deferral" },
      detail: {
        ar: `${deferredDecisions.length} قرارات مؤجلة قد تشير إلى عائق`,
        en: `${deferredDecisions.length} deferred decisions may indicate a blocker`,
      },
      confidence: "low",
      horizon: { ar: "متوسط المدى", en: "Medium term" },
    });
  }

  return signals;
}

export default function WhatNeedsAttention({ data }) {
  const { t, lang } = useLanguage();
  const signals = detectSignals(data);

  if (signals.length === 0) {
    return (
      <div className="raqeem-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("ما يحتاج اهتماماً", "What Needs Attention")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("لا توجد إشارات تنبيهية حالياً", "No alert signals at this time")}
        </p>
      </div>
    );
  }

  const severityStyles = {
    high: "border-red-200 bg-red-50",
    medium: "border-amber-200 bg-amber-50",
    low: "border-blue-200 bg-blue-50",
  };
  const severityIconColors = {
    high: "text-red-600",
    medium: "text-amber-600",
    low: "text-blue-600",
  };

  return (
    <div className="raqeem-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("ما يحتاج اهتماماً", "What Needs Attention")}</h3>
        <span className="text-xs text-muted-foreground">({signals.length})</span>
      </div>

      <div className="space-y-2">
        {signals.map((signal, i) => {
          const Icon = signal.icon;
          return (
            <div key={i} className={cn("flex items-start gap-2.5 p-2.5 rounded-md border", severityStyles[signal.severity])}>
              <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", severityIconColors[signal.severity])} />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-foreground">
                  {lang === "ar" ? signal.title.ar : signal.title.en}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {lang === "ar" ? signal.detail.ar : signal.detail.en}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-2.5 h-2.5" />
                    {t("الثقة", "Confidence")}: {signal.confidence}
                  </span>
                  <span>·</span>
                  <span>{t("الأفق الزمني", "Horizon")}: {lang === "ar" ? signal.horizon.ar : signal.horizon.en}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground">
        {t("هذه تنبؤات استرشادية، وليست حقائق مؤكدة", "These are advisory predictions, not confirmed facts")}
      </div>
    </div>
  );
}