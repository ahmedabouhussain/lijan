import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { History, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/raqeemUtils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import EmptyState from "@/components/raqeem/EmptyState";

// AdminVersionHistory — lists published versions with restore capability.
export default function AdminVersionHistory({ versions, canRestore, onRestore }) {
  const { t } = useLanguage();
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [reason, setReason] = useState("");

  const handleRestore = async () => {
    if (!reason.trim()) return;
    await onRestore(restoreTarget, reason);
    setRestoreTarget(null);
    setReason("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold">{t("سجل الإصدارات", "Version History")}</h3>
      </div>
      {versions.length === 0 ? (
        <EmptyState icon={History} title={t("لا توجد إصدارات منشورة", "No Published Versions")} description={t("لم يتم نشر أي إصدار بعد.", "No versions published yet.")} />
      ) : (
        <div className="space-y-2">
          {versions.map((v) => (
            <div key={v.id} className="raqeem-card p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium flex items-center gap-2">
                  {t("الإصدار", "Version")} {v.version_number}
                  {v.is_current && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">{t("حالي", "Current")}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(v.published_at)}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{v.published_by_name}</p>
              {v.change_reason && <p className="text-xs text-foreground/70 italic">"{v.change_reason}"</p>}
              {canRestore && !v.is_current && (
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={() => setRestoreTarget(v.version_number)}>
                  <RotateCcw className="w-3 h-3 ml-1" /> {t("استعادة", "Restore")}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {restoreTarget && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setRestoreTarget(null)}>
          <div className="bg-card rounded-lg p-5 max-w-md w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold">{t("استعادة الإصدار", "Restore Version")} {restoreTarget}</h3>
            <p className="text-xs text-muted-foreground">{t("سيتم إنشاء إصدار جديد بناءً على هذا الإصدار. لن يتم حذف السجل التاريخي.", "A new version will be created from this version. History will not be deleted.")}</p>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("سبب الاستعادة...", "Reason for restore...")} rows={2} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setRestoreTarget(null)}>{t("إلغاء", "Cancel")}</Button>
              <Button size="sm" onClick={handleRestore} disabled={!reason.trim()}>{t("استعادة", "Restore")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}