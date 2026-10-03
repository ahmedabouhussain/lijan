import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { reportTranslationGap } from "@/lib/translationGaps";
import { cn } from "@/lib/utils";

/**
 * MissingValue — the active language's own notice for a value that was never authored
 * in that language.
 *
 * It never substitutes the other language: an English surface states in English that
 * the value is not provided in English, an Arabic surface states it in Arabic, and the
 * gap is recorded for administration. The raw stored value is never shown.
 */
export default function MissingValue({ entity, record, fieldKey, className }) {
  const { t, lang } = useLanguage();

  React.useEffect(() => {
    reportTranslationGap({ entity, record, fieldKey, lang });
  }, [entity, record?.id, fieldKey, lang]);

  return (
    <span
      className={cn(
        "inline-flex items-center text-xs italic text-muted-foreground",
        className
      )}
    >
      {t("القيمة غير مُدخَلة بالعربية", "Not provided in English")}
    </span>
  );
}