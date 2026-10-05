// Text hygiene for official records.
//
// Model output and imported content are UNTRUSTED TEXT that may contain markup. React strips
// nothing on its own: it renders markup-looking text literally, which is how raw <br> and <div>
// appeared inside a stored draft. These helpers reduce rich text to safe, displayable text and
// format a record's own date in the institutional timezone (Asia/Qatar).

/** Reduce arbitrary rich text to plain text: no tags, no scripts, no entity escapes. */
export function sanitizeRichText(value) {
  return String(value || "")
    .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .trim();
}

/**
 * A record's own date, rendered in the institution's timezone rather than the viewer's.
 * Returns "—" for a missing or unparseable date instead of inventing one.
 */
export function formatRecordDate(iso, lang = "ar") {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(lang === "ar" ? "ar" : "en-GB", {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "Asia/Qatar",
    });
  } catch {
    return iso;
  }
}

/** True when a stored draft no longer agrees with the authoritative record it was drafted from. */
export function hasSourceDrift(storedValue, sourceValue) {
  if (!storedValue || !sourceValue) return false;
  return storedValue !== sourceValue;
}