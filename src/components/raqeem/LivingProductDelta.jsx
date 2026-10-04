import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { base44 } from "@/api/base44Client";
import { Loader2, GitCompare, ArrowRight, FileText, CheckCircle2, Users } from "lucide-react";

/**
 * Living Institutional Product™ — Section 6
 * Shows what changed since the previous version of a product:
 * new decisions, closed actions, new risks, formation changes, new evidence, pending items.
 * Does NOT modify the old official product — creates a new linked version.
 */
export default function LivingProductDelta({ committeeId, lastGeneratedAt }) {
  const { t, lang } = useLanguage();
  const [delta, setDelta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!committeeId || !lastGeneratedAt) {
      setLoading(false);
      return;
    }
    fetchDelta();
  }, [committeeId, lastGeneratedAt]);

  const fetchDelta = async () => {
    setLoading(true);
    try {
      const since = new Date(lastGeneratedAt);

      // Fetch new decisions since last generation
      const decisions = await base44.entities.Decision.filter(
        { committee_id: committeeId },
        "-created_date",
        50
      );
      const newDecisions = (decisions || []).filter(
        (d) => d.created_date && new Date(d.created_date) > since
      );

      // Fetch actions closed since
      const actions = await base44.entities.Action.filter(
        { committee_id: committeeId },
        "-updated_date",
        50
      );
      const closedActions = (actions || []).filter(
        (a) => a.updated_date && new Date(a.updated_date) > since &&
              (a.status === "completed" || a.status === "cancelled")
      );
      const newActions = (actions || []).filter(
        (a) => a.created_date && new Date(a.created_date) > since
      );

      // Fetch formation changes
      const formations = await base44.entities.CommitteeFormationVersion.filter(
        { committee_id: committeeId },
        "-created_date",
        10
      );
      const newFormations = (formations || []).filter(
        (f) => f.created_date && new Date(f.created_date) > since
      );

      // Fetch new documents
      const documents = await base44.entities.Document.filter(
        { committee_id: committeeId },
        "-created_date",
        20
      );
      const newDocuments = (documents || []).filter(
        (d) => d.created_date && new Date(d.created_date) > since
      );

      setDelta({
        newDecisions: newDecisions.slice(0, 5),
        newDecisionsCount: newDecisions.length,
        closedActions: closedActions.slice(0, 5),
        closedActionsCount: closedActions.length,
        newActionsCount: newActions.length,
        formationChanges: newFormations.length,
        newDocuments: newDocuments.slice(0, 3),
        newDocumentsCount: newDocuments.length,
      });
    } catch {
      setDelta(null);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
      </div>
    );
  }

  if (!delta) return null;

  const hasChanges =
    delta.newDecisionsCount > 0 ||
    delta.closedActionsCount > 0 ||
    delta.formationChanges > 0 ||
    delta.newDocumentsCount > 0;

  if (!hasChanges) {
    return (
      <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-secondary/50">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-muted-foreground">
          {t("لا تغييرات منذ آخر إصدار", "No changes since last version")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Delta header */}
      <div className="flex items-center gap-2 text-xs font-semibold text-primary">
        <GitCompare className="w-4 h-4" />
        {t("ما الجديد منذ آخر نسخة", "What's new since last version")}
      </div>

      {/* Delta stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {delta.newDecisionsCount > 0 && (
          <div className="raqeem-card p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{delta.newDecisionsCount}</p>
              <p className="text-[10px] text-muted-foreground">{t("قرار جديد", "New decisions")}</p>
            </div>
          </div>
        )}
        {delta.closedActionsCount > 0 && (
          <div className="raqeem-card p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{delta.closedActionsCount}</p>
              <p className="text-[10px] text-muted-foreground">{t("إجراء أُغلق", "Actions closed")}</p>
            </div>
          </div>
        )}
        {delta.formationChanges > 0 && (
          <div className="raqeem-card p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{delta.formationChanges}</p>
              <p className="text-[10px] text-muted-foreground">{t("تغيير تشكيل", "Formation changes")}</p>
            </div>
          </div>
        )}
        {delta.newDocumentsCount > 0 && (
          <div className="raqeem-card p-3 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{delta.newDocumentsCount}</p>
              <p className="text-[10px] text-muted-foreground">{t("وثيقة جديدة", "New documents")}</p>
            </div>
          </div>
        )}
      </div>

      {/* New decisions list (progressive disclosure) */}
      {delta.newDecisions.length > 0 && (
        <details className="raqeem-card p-3">
          <summary className="cursor-pointer text-xs font-medium text-foreground hover:text-primary transition-colors">
            {t("القرارات الجديدة", "New decisions")} ({delta.newDecisionsCount})
          </summary>
          <div className="mt-2 space-y-1.5">
            {delta.newDecisions.map((d) => (
              <div key={d.id} className="flex items-center gap-2 text-xs py-1 border-b border-border last:border-0">
                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-foreground truncate">{(d[`title_${lang}`] || d.title)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Closed actions list */}
      {delta.closedActions.length > 0 && (
        <details className="raqeem-card p-3">
          <summary className="cursor-pointer text-xs font-medium text-foreground hover:text-primary transition-colors">
            {t("الإجراءات المغلقة", "Closed actions")} ({delta.closedActionsCount})
          </summary>
          <div className="mt-2 space-y-1.5">
            {delta.closedActions.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-xs py-1 border-b border-border last:border-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="text-foreground truncate">{(a[`title_${lang}`] || a.title)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      <p className="text-[10px] text-muted-foreground">
        {t(
          "النسخة الرسمية القديمة لا تُعدّل — يُنشأ إصدار جديد مرتبط بها",
          "The old official version is not modified — a new linked version is created"
        )}
      </p>
    </div>
  );
}