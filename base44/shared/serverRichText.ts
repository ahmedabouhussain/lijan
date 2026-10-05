// serverRichText.ts — the SERVER side of the record-text hygiene policy.
//
// The same policy already runs in the browser (src/lib/richText.js · sanitizeRichText) and it is
// reproduced here because a backend function cannot import from `src/`. It is deliberately NOT a
// second policy: the four rules below are the four rules there —
//   1. script/style elements and their content are removed entirely,
//   2. every remaining tag is removed,
//   3. the entity escapes the platform itself emits (&nbsp; &amp;) are decoded,
//   4. surrounding whitespace is trimmed.
// The reason the server must do it too: stored minutes are written by a COMMAND now, so the authority
// on what gets stored is the server, not the browser that submitted the text. A surface that skips
// its own cleaning (or is replaced by another client) cannot put markup into a governance record.

/** Reduce arbitrary rich text to plain, displayable text: no tags, no scripts, no entity escapes. */
export function sanitizeServerRichText(value: any) {
  return String(value ?? '')
    .replace(/<\s*(script|style)[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();
}

/** True when the value carries no displayable text once the policy is applied. */
export function isEmptyRichText(value: any) {
  return sanitizeServerRichText(value).length === 0;
}