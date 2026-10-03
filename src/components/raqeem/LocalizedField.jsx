import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { nameOf } from "@/lib/l10n";
import MissingValue from "@/components/raqeem/MissingValue";

/**
 * LocalizedField — a record's text in the ACTIVE language only.
 *
 * When the record has no value in the active language, the active language's own
 * "not provided" notice is shown and the gap is registered for administration. The
 * other language is never shown as a substitute.
 */
export default function LocalizedField({ entity, record, base = "name", className }) {
  const { lang } = useLanguage();
  if (!record) return null;
  const value = nameOf(record, lang, base);
  if (value) return <>{value}</>;
  return <MissingValue entity={entity} record={record} fieldKey={base} className={className} />;
}