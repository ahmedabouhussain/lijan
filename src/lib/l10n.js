// LIJAN™ — unified language engine.
//
// ONE rule: a page renders in exactly ONE language — the language selected in the
// language switcher. Arabic pages show Arabic only, English pages show English only.
// A record's other-language field is NEVER rendered as a fallback or as a subtitle.
//
// Every display site resolves text through these helpers with the `lang` value coming
// from `useLanguage()`. Nothing reads `document.documentElement.dir` — the DOM is an
// output of the language engine, never an input to it.

/** True when the active language is Arabic. */
export const isArabic = (lang) => lang === "ar";

/**
 * Pick the active-language value of a bilingual pair.
 * Never falls back to the other language's text while it exists: it falls back only
 * to an empty string, so an English page can never show Arabic copy.
 */
export function pick(lang, ar, en) {
  return (isArabic(lang) ? ar : en) ?? "";
}

/** Localized field of a record, e.g. nameOf(committee, lang) → name_ar | name_en. */
export function nameOf(record, lang, base = "name") {
  if (!record) return "";
  const ar = record[`${base}_ar`];
  const en = record[`${base}_en`];
  // The plain field (title / name / location) is the record's own primary text.
  const primary = record[base];
  // One language per page: the active language's own value, then the plain field.
  // The OTHER language's field is never returned, so an English page cannot show Arabic.
  if (isArabic(lang)) return ar || primary || en || "";
  return en || primary || "";
}

/** Localized human title of any governed record (title_ar/title_en, else title). */
export function titleOf(record, lang) {
  return nameOf(record, lang, "title");
}

/** Localized label from a bilingual label map (raqeemUtils dictionaries). */
export function labelOf(map, key, lang, fallback = "") {
  const entry = map?.[key];
  if (!entry) return fallback || key || "";
  return pick(lang, entry.ar, entry.en) || fallback || key;
}

/** Status colour class from a bilingual label map (language-independent). */
export function colorOf(map, key, fallback = "") {
  return map?.[key]?.color || fallback;
}

/** Localized label + colour in one call — for StatusBadge-style usage. */
export function statusOf(map, key, lang, fallback = "") {
  return { label: labelOf(map, key, lang, fallback), colorClass: colorOf(map, key) };
}

// ── Active-language accessor (single source of truth) ──
// LanguageProvider keeps this in sync; it is a fallback for the few display
// components that do not consume the context directly. Never read the DOM.
let activeLang = "ar";

export function setActiveLang(lang) {
  activeLang = lang === "en" ? "en" : "ar";
}

export function getActiveLang() {
  return activeLang;
}

/** Convenience accessors bound to the active language — one language per page. */
export const L = {
  get lang() {
    return activeLang;
  },
  name: (record, base = "name") => nameOf(record, activeLang, base),
  title: (record) => nameOf(record, activeLang, "title"),
  label: (map, key, fallback = "") => labelOf(map, key, activeLang, fallback),
  color: (map, key, fallback = "") => colorOf(map, key, fallback),
  status: (map, key, fallback = "") => statusOf(map, key, activeLang, fallback),
  pair: (ar, en) => pick(activeLang, ar, en),
  date: (value, opts) => dateOf(value, activeLang, opts),
};

/** Localized date string for one language only. */
export function dateOf(value, lang, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(isArabic(lang) ? "ar-QA" : "en-GB", { ...opts, numberingSystem: "latn" });
}