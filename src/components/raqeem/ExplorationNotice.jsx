import React from "react";
import { Eye } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

/**
 * ExplorationNotice — shown wherever a surface is being viewed through the governed
 * exploration session rather than as a seated actor.
 *
 * In that session no action can be executed and attributed: the demonstration persona has no
 * server-side identity to authorize a write against. So the surface states that plainly instead
 * of offering controls that cannot act, and every control it would otherwise show is withheld.
 */
export default function ExplorationNotice({ className = "" }) {
  const { t } = useLanguage();
  return (
    <div className={`raqeem-card p-4 flex items-start gap-3 ${className}`}>
      <div className="shrink-0 w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
        <Eye className="w-4 h-4 text-accent" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">
          {t("وضع الاستكشاف — عرض فقط", "Exploration mode — view only")}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t(
            "تستعرض هذه اللجنة بصفتك شخصية تجريبية. تُعرض البيانات والإجراءات المتاحة لدورها فعليًا، ولا تُنفَّذ أي كتابة أو اعتماد في هذا الوضع.",
            "You are viewing this committee as a demonstration persona. The records and actions available to its seat are shown as they are, and no write or approval is executed in this mode."
          )}
        </p>
      </div>
    </div>
  );
}