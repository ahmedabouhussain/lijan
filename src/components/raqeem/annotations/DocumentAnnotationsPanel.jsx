import React from "react";
import { StickyNote, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import useDocumentAnnotations from "@/hooks/useDocumentAnnotations";
import AnnotationComposer from "./AnnotationComposer";
import AnnotationRow from "./AnnotationRow";
import VersionChangeStrip from "./VersionChangeStrip";

// Notes on ONE committee document: my private and shared notes, colleagues' shared notes, each bound
// to the version it was written on. Private notes never reach minutes, packages, exports or handover.
export default function DocumentAnnotationsPanel({ documentId, isExploration }) {
  const { t } = useLanguage();
  const { data, loading, error, busy, load, act } = useDocumentAnnotations(documentId, !isExploration);
  const unavailable = isExploration || data?.status === "unavailable_in_exploration";
  const notes = data?.notes || [];

  return (
    <div className="raqeem-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-primary" /> {t("الملاحظات على المستند", "Notes on this document")}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-1">
            {t("الملاحظة الخاصة لا يراها غيرك، ولا تدخل المحضر ولا حزمة القرار ولا حزمة التسليم.", "A private note is seen by no one else and never enters the minutes, the decision package or a handover pack.")}
          </p>
        </div>
        {!unavailable && (
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} aria-label={t("تحديث", "Refresh")}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>

      {unavailable && <p className="text-xs text-muted-foreground">{t("الملاحظات شخصية لحساب موثّق، ولا تتوفر في جلسة الاستكشاف.", "Notes belong to an authenticated account and are not available in an exploration session.")}</p>}
      {error && <div className="p-3 rounded-md bg-state-danger-surface text-xs text-state-danger-ink">{error}</div>}
      {loading && !data && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}

      {data?.status === "ok" && (
        <>
          {data.unread_sources?.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-state-warning-surface text-xs text-state-warning-ink">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {t("تعذّرت قراءة جزء من المصادر — القائمة غير مكتملة.", "Some sources could not be read — this list is incomplete.")}
            </div>
          )}
          <VersionChangeStrip changes={data.version_changes} />
          {data.current_version
            ? <AnnotationComposer versionNumber={data.current_version.version_number} busy={busy}
                onSubmit={(v) => act({ action: "create", document_version_id: data.current_version.id, ...v }, "create")} />
            : <p className="text-xs text-muted-foreground">{t("لا يوجد إصدار نافذ تُضاف إليه ملاحظة.", "There is no version in force to annotate.")}</p>}
          {notes.length === 0
            ? <p className="text-xs text-muted-foreground text-center py-2">{t("لا توجد ملاحظات تراها على هذا المستند.", "There are no notes you can see on this document.")}</p>
            : notes.map((n) => (
              <AnnotationRow key={n.id} note={n} busy={busy}
                onCarry={(note) => act({ action: "carry_forward", annotation_id: note.id }, `carry:${note.id}`)}
                onResolve={(note) => act({ action: "resolve", annotation_id: note.id }, `resolve:${note.id}`)} />
            ))}
        </>
      )}
    </div>
  );
}