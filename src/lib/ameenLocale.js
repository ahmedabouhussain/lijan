// LIJAN™ — the ONE language contract for «أمين» / AMEEN.
//
// The active platform locale governs every assistant reply. It travels with EVERY
// request — locale, ui_locale, response_language, direction — inside a marked block
// that the engine must obey, so the answer language can never be inferred from the
// question, the retrieved data, the thread history, or the model's own default.
//
// The block is stripped before display: the reader sees only their own question.
//
// NOTE: the agent instructions (base44/agents/ameen.jsonc, ameen_demo.jsonc) carry the
// other half of this contract and reference the same marker. Keep both in step.

import { hasArabicScript } from "@/lib/l10n";

export const LOCALE_BLOCK_OPEN = "[[AMEEN-LOCALE]]";
export const LOCALE_BLOCK_CLOSE = "[[/AMEEN-LOCALE]]";
const RELOAD_MARKER = "priority: REWRITE";

/** The binding reply contract, written in the language it governs. */
const CONTRACT = {
  ar: [
    "لغة المنصة النشطة هي العربية. أجب باللغة العربية فقط.",
    "ترجم ولخّص أي بيانات إنجليزية إلى العربية قبل عرضها.",
    "لا تعرض عناوين أو شروحات أو رسائل احتياطية باللغة الإنجليزية.",
  ].join(" "),
  en: [
    "The active platform locale is English. Respond only in English.",
    "Translate and synthesize any Arabic source data into English before presenting it.",
    "Do not output Arabic interface labels, headings, explanations, source labels, warnings, or fallback messages.",
  ].join(" "),
};

/** The source statement for sandbox data — one language, never both. */
const SOURCE_LABEL = {
  ar: "المصدر: مجموعة بيانات العرض التجريبي — غير حقيقية.",
  en: "Source: Synthetic showcase dataset — not operational data.",
};

/** Shown only if a reply could not be produced in the active language after a retry. */
export const AMEEN_LANGUAGE_FALLBACK = {
  ar: "تعذّر الآن توليد الرد بالعربية. أعد إرسال سؤالك وسيُعاد التوليد.",
  en: "The reply could not be produced in English. Please send your question again.",
};

export function ameenSourceLabel(lang) {
  return lang === "ar" ? SOURCE_LABEL.ar : SOURCE_LABEL.en;
}

export function ameenLocaleContract(lang) {
  const en = lang !== "ar";
  return {
    locale: en ? "en" : "ar",
    ui_locale: en ? "en" : "ar",
    response_language: en ? "en" : "ar",
    direction: en ? "ltr" : "rtl",
    contract: en ? CONTRACT.en : CONTRACT.ar,
    source_label: en ? SOURCE_LABEL.en : SOURCE_LABEL.ar,
  };
}

/**
 * The marked block that opens every message sent to «أمين».
 * It is the request-level half of the language contract; the agent instructions carry
 * the other half, and this block always wins.
 */
export function ameenDirective(lang, { reload = false } = {}) {
  const c = ameenLocaleContract(lang);
  return [
    LOCALE_BLOCK_OPEN,
    `locale: ${c.locale}`,
    `ui_locale: ${c.ui_locale}`,
    `response_language: ${c.response_language}`,
    `direction: ${c.direction}`,
    ...(reload ? [`${RELOAD_MARKER} — the previous reply used the wrong language.`] : []),
    c.contract,
    `Use this source statement verbatim when sandbox data is shown: ${c.source_label}`,
    LOCALE_BLOCK_CLOSE,
  ].join("\n");
}

/** True for the engine-only re-instruction turn — never a message the reader wrote. */
export function isAmeenReloadMessage(content) {
  const text = String(content ?? "");
  return text.startsWith(LOCALE_BLOCK_OPEN) && text.includes(RELOAD_MARKER);
}

/** Everything the reader must never see: the governing block only. */
export function stripAmeenDirective(content) {
  const text = String(content ?? "");
  const end = text.indexOf(LOCALE_BLOCK_CLOSE);
  if (!text.startsWith(LOCALE_BLOCK_OPEN) || end === -1) return text;
  return text.slice(end + LOCALE_BLOCK_CLOSE.length).replace(/^\s+/, "");
}

/**
 * Pre-display check — does this reply respect the active locale?
 *
 * English: no Arabic character is permitted at all — a leaked Arabic source label is
 * exactly the failure this catches.
 * Arabic: the reply must be in Arabic. Embedded Latin names and figures are legitimate,
 * so what this catches is a wholly English reply.
 */
export function isReplyInActiveLanguage(lang, content) {
  const text = String(content ?? "").trim();
  if (!text) return true;
  if (lang === "ar") return hasArabicScript(text);
  return !hasArabicScript(text);
}