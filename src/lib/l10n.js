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

/** Script detection — used to guarantee ONE language per page, never to translate. */
export const hasArabicScript = (value) => /[\u0600-\u06FF]/.test(String(value ?? ""));
export const hasLatinScript = (value) => /[A-Za-z]/.test(String(value ?? ""));

/**
 * The active language's own notice for a value that was never authored in it.
 * Never a silent substitute for the other language, and never a raw stored value.
 */
export const missingValueLabel = (lang) =>
  isArabic(lang) ? "القيمة غير مُدخَلة بالعربية" : "Not provided in English";

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
  // The plain field (title / name / location) is the record's own primary text —
  // on this platform it holds the record's natural reading (Meeting.title, Document.title …).
  const primary = record[base];

  // STRICT single-language resolution: the ACTIVE language's field only. The other
  // language is never returned — not as a fallback, not as a subtitle. A value that was
  // never authored in the active language resolves to "" so the surface can state that
  // in the active language instead of leaking the other one.
  const active = isArabic(lang) ? ar : en;
  if (active) return active;
  if (!primary) return "";
  // The plain field is accepted only when its script can belong to the active language:
  // Arabic text can never stand in on an English page, and Latin text is never presented
  // as the Arabic reading.
  return hasArabicScript(primary) === isArabic(lang) ? primary : "";
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

/**
 * Resolve a record field that has explicit `_ar` / `_en` variants while a legacy
 * single-language field may still hold an Arabic-only value.
 *
 * The legacy field is treated strictly as the ARABIC reading. It is never returned
 * for English, so an Arabic value can never leak into the English interface — an
 * English page shows an empty state instead.
 */
export function bilingualOrLegacy(record, lang, { arKey, enKey, legacyKey }) {
  if (!record) return "";
  const ar = record[arKey] || (legacyKey ? record[legacyKey] : "") || "";
  const en = record[enKey] || "";
  return isArabic(lang) ? ar : en;
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
  /** Bilingual field with an Arabic-only legacy fallback — never leaks into English. */
  value: (record, keys) => bilingualOrLegacy(record, activeLang, keys),
  date: (value, opts) => dateOf(value, activeLang, opts),
};

/** Localized date string for one language only. */
export function dateOf(value, lang, opts = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(isArabic(lang) ? "ar-QA" : "en-GB", { ...opts, numberingSystem: "latn" });
}