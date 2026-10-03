import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2, History, GitCompare, AlertCircle } from "lucide-react";
import StatusBadge from "@/components/raqeem/StatusBadge";
import { cn } from "@/lib/utils";

/**
 * Institutional Change Tracker™ — Section 9
 * Read-only drawer: view committee state as of a specific date.
 * Uses versioned records (CommitteeFormationVersion, historical decisions, etc.)
 * Does NOT rewrite history — purely observational.
 */
export default function InstitutionalTimeMachine({ open, onClose, committeeId, committeeName }) {
  const { t, lang } = useLanguage();
  const [targetDate, setTargetDate] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSnapshot = async (date) => {
    if (!date || !committeeId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch formation versions up to the target date (most recent before or on date)
      const versions = await base44.entities.CommitteeFormationVersion.filter(
        { committee_id: committeeId },
        "-created_date",
        50
      );
      const validVersions = (versions || []).filter(
        (v) => !v.created_date || new Date(v.created_date) <= new Date(date + "T23:59:59")
      );
      const formation = validVersions[0] || null;

      // Fetch decisions up to target date
      const decisions = await base44.entities.Decision.filter(
        { committee_id: committeeId },
        "-created_date",
        100
      );
      const decisionsUpTo = (decisions || []).filter(
        (d) => !d.created_date || new Date(d.created_date) <= new Date(date + "T23:59:59")
      );

      // Fetch actions open at that time
      const actions = await base44.entities.Action.filter(
        { committee_id: committeeId },
        "-created_date",
        100
      );
      const openActions = (actions || []).filter(
        (a) => (!a.created_date || new Date(a.created_date) <= new Date(date + "T23:59:59")) &&
              a.status !== "completed" && a.status !== "cancelled"
      );

      setSnapshot({
        date,
        formation,
        decisionsCount: decisionsUpTo.length,
        openActionsCount: openActions.length,
        decisions: decisionsUpTo.slice(0, 5),
        openActions: openActions.slice(0, 5),
      });
    } catch (e) {
      setError(e?.message || t("تعذّر تحميل الحالة", "Failed to load snapshot"));
    }
    setLoading(false);
  };

  const handleSearch = () => fetchSnapshot(targetDate);

  const formatDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString(lang === "ar" ? "ar-QA" : "en-GB", {
        year: "numeric", month: "long", day: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <SheetTitle>{t("تتبع التغييرات المؤسسي", "Institutional Change Tracker")}</SheetTitle>
          </div>
          <SheetDescription>
            {t(
              `عرض حالة «${committeeName || "اللجنة"}» كما كانت في تاريخ محدد — للقراءة فقط`,
              `View "${committeeName || "Committee"}" state as of a specific date — read-only`
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Date selector */}
        <div className="px-1 py-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              {t("عرض اللجنة كما كانت في تاريخ…", "View committee as of date…")}
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input px-3 text-sm"
              />
              <Button size="sm" onClick={handleSearch} disabled={!targetDate || loading}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                {t("عرض", "View")}
              </Button>
            </div>
          </div>

          {/* Snapshot */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-red-800">{error}</p>
            </div>
          )}

          {snapshot && !loading && (
            <div className="space-y-4">
              {/* Snapshot date banner */}
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
                <Clock className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    {t("الحالة بتاريخ", "State as of")}
                  </p>
                  <p className="text-sm font-medium text-foreground">{formatDate(snapshot.date)}</p>
                </div>
              </div>

              {/* Formation */}
              <div className="raqeem-card p-4 space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("التشكيل الساري", "Active Formation")}
                </h4>
                {snapshot.formation ? (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      {snapshot.formation.chair_name || snapshot.formation.formation_data?.chair_name || "—"}
                      <span className="text-xs text-muted-foreground mr-1"> {t("(رئيس)", "(Chair)")}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {snapshot.formation.secretary_name || snapshot.formation.formation_data?.secretary_name || "—"}
                      <span className="text-xs mr-1"> {t("(أمين سر)", "(Secretary)")}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("عدد الأعضاء", "Member count")}: {snapshot.formation.member_count || snapshot.formation.formation_data?.members?.length || "—"}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("لا يوجد تشكيل مسجل قبل هذا التاريخ", "No formation recorded before this date")}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="raqeem-card p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{snapshot.decisionsCount}</p>
                  <p className="text-xs text-muted-foreground">{t("قرار صادر", "Decisions issued")}</p>
                </div>
                <div className="raqeem-card p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{snapshot.openActionsCount}</p>
                  <p className="text-xs text-muted-foreground">{t("إجراء مفتوح", "Open actions")}</p>
                </div>
              </div>

              {/* Recent decisions */}
              {snapshot.decisions.length > 0 && (
                <div className="raqeem-card p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("أحدث القرارات", "Recent Decisions")}
                  </h4>
                  {snapshot.decisions.map((d) => (
                    <div key={d.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-foreground truncate">{(d[`title_${lang}`] || d.title) || "—"}</span>
                      <span className="text-muted-foreground shrink-0 mr-2">{formatDate(d.created_date)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Open actions */}
              {snapshot.openActions.length > 0 && (
                <div className="raqeem-card p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t("إجراءات مفتوحة", "Open Actions")}
                  </h4>
                  {snapshot.openActions.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-foreground truncate">{(a[`title_${lang}`] || a.title) || "—"}</span>
                      <StatusBadge
                        label={a.priority || "—"}
                        colorClass={a.priority === "urgent" ? "bg-red-100 text-red-700" : "bg-secondary text-muted-foreground"}
                      />
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-muted-foreground text-center pt-2">
                {t(
                  "هذه النظرة للقراءة فقط ولا تعيد كتابة التاريخ",
                  "This view is read-only and does not rewrite history"
                )}
              </p>
            </div>
          )}

          {!snapshot && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitCompare className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {t("اختر تاريخًا لعرض حالة اللجنة", "Select a date to view committee state")}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}