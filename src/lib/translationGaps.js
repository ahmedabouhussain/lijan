import { base44 } from "@/api/base44Client";
import { getActiveLang } from "@/lib/l10n";

// LIJAN™ — translation-gap register.
// When a value does not exist in the ACTIVE language, the surface shows a localized
// notice (never the other language) and records the gap here for administration.
// One write per (record, field, language) per session — never a write per render — and
// keyed upsert, so the register holds ONE row per gap across all sessions and users.

const seenInSession = new Set();

export function reportTranslationGap({ entity, record, fieldKey, lang = getActiveLang(), surface }) {
  if (!entity || !record?.id || !fieldKey) return;
  const key = `${entity}:${record.id}:${fieldKey}:${lang}`;
  if (seenInSession.has(key)) return;
  seenInSession.add(key);

  const counterpart = lang === "ar" ? record[`${fieldKey}_en`] || record[fieldKey] : record[`${fieldKey}_ar`];

  base44.entities.TranslationGap.upsert(
    [
      {
        organization_id: record.organization_id || null,
        entity_type: entity,
        record_id: record.id,
        field_key: `${fieldKey}_${lang}`,
        missing_language: lang,
        record_label: record.name_en || record.name_ar || record.title_ar || record.title || "",
        surface: surface || (typeof window !== "undefined" ? window.location.pathname : ""),
        // The other language may exist — it is deliberately never displayed as a substitute.
        counterpart_available: Boolean(counterpart),
      },
    ],
    { key: ["entity_type", "record_id", "field_key"] }
  ).catch(() => {});
}