// LIJAN™ — ONE identity for the ONE assistant.
//
// The assistant's name is resolved HERE and nowhere else. A component must never
// hardcode «أمين» or AMEEN: it calls ameenName(lang) (or takes AMEEN_NAME.ar/.en
// through the language engine). One language per page — the assistant is «أمين»
// in Arabic and AMEEN in English, never both, never the other language.
import { getActiveLang, isArabic } from "@/lib/l10n";

/** Bilingual pair — the single stored form of the assistant's name. */
export const AMEEN_NAME = { ar: "أمين", en: "AMEEN" };

/** Display name in the active language only. */
export const ameenName = (lang = getActiveLang()) =>
  isArabic(lang) ? AMEEN_NAME.ar : AMEEN_NAME.en;

/** The assistant's governed description — one language per page. */
export const AMEEN_DESCRIPTION = {
  ar: "مساعد مؤسسي محكوم يجيب من سجلات لجان™ التي تملك صلاحية الوصول إليها فقط.",
  en: "A governed institutional assistant that answers only from LIJAN™ records you are authorized to reach.",
};

export const ameenDescription = (lang = getActiveLang()) =>
  isArabic(lang) ? AMEEN_DESCRIPTION.ar : AMEEN_DESCRIPTION.en;