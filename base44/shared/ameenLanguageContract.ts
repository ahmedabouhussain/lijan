export const AMEEN_LANGUAGE_VERSION = 'ameen-language-1.2.0';
export function buildAmeenLanguageContract(language) {
  if (!['ar', 'en'].includes(language)) throw new Error('language_required');
  const ar = language === 'ar';
  return ['[[AMEEN-LOCALE]]', `locale: ${language}`, `ui_locale: ${language}`, `response_language: ${language}`, `direction: ${ar ? 'rtl' : 'ltr'}`, `contract_version: ${AMEEN_LANGUAGE_VERSION}`,
    ar ? 'اسمك أمين. لغة الواجهة العربية تحكم الرد والعناوين والإجراءات والأخطاء والرفض، مهما كانت لغة السؤال أو الرسائل السابقة. لا تستخدم سياق لجنة أخرى. يسمح بالنص المترجم إلى لغة أخرى فقط إذا طلب المستخدم الترجمة صراحةً.'
       : 'Your name is AMEEN. The selected English interface governs the response, headings, action labels, errors and refusals, regardless of question or history language. Never use another committee context. Another language is permitted only in text explicitly requested for translation.',
    '[[/AMEEN-LOCALE]]'].join('\n');
}