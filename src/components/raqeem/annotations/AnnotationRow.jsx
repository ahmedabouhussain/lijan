import React from "react";
import { Lock, Users, ArrowUpRight, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/LanguageContext";
import { continuityLabel, REANCHOR_LABEL } from "./annotationLabels";

// One note. It never moves on its own: a superseded note offers its AUTHOR an explicit carry-forward,
// and a carried note says whether its passage could be verified on the new version.
export default function AnnotationRow({ note, busy, onCarry, onResolve }) {
  const { t } = useLanguage();
  const c = note.continuity || {};
  const reanchor = REANCHOR_LABEL[note.reanchor_state];
  const warn = c.state !== "current" || note.reanchor_state === "unverified";
  const active = note.status === "active";

  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
        {note.is_private
          ? <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" />{t("خاصة", "Private")}</span>
          : <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{t("مشتركة", "Shared")}</span>}
        <span>· {note.mine ? t("ملاحظتي", "My note") : note.author_name || "—"}</span>
        {note.page_number && <span>· {t("صفحة", "page")} {note.page_number}</span>}
        {!active && <span>· {t("مُغلقة", "Resolved")}</span>}
      </div>
      {note.anchor_text && (
        <blockquote className="text-xs text-muted-foreground border-s-2 border-accent ps-2">{note.anchor_text}</blockquote>
      )}
      <p className="text-sm text-foreground whitespace-pre-wrap break-words">{note.body}</p>
      <div className={`flex items-start gap-1.5 text-[11px] ${warn ? "text-state-warning-ink" : "text-muted-foreground"}`}>
        {warn && <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />}
        <span>{continuityLabel(t, c)}{reanchor ? ` · ${t(reanchor[0], reanchor[1])}` : ""}</span>
      </div>
      {note.mine && active && (
        <div className="flex items-center gap-2 flex-wrap">
          {c.state === "superseded" && (
            <Button size="sm" variant="outline" onClick={() => onCarry(note)} disabled={busy === `carry:${note.id}`}>
              {busy === `carry:${note.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
              {t("نقل نسخة إلى الإصدار النافذ", "Carry a copy to the version in force")}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onResolve(note)} disabled={busy === `resolve:${note.id}`}>
            {busy === `resolve:${note.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {t("إغلاق الملاحظة", "Resolve note")}
          </Button>
        </div>
      )}
    </div>
  );
}