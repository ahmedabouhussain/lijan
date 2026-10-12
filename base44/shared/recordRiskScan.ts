// record-risk-scan-1.0.0 — فحص المخاطر قبل أن يدخل السجل الرسمي (استشاري بحت).
//
// ما يفعله هذا العقد: يصف مرة واحدة فئات المخاطر التي يُفحَص بها نص مقترح القرار (أو حزمة
// الاجتماع) قبل اعتماده أو إصداره، وكيف يُبنى الطلب الموجَّه إلى النموذج، والشكل الذي يجب أن
// يعود عليه، وكيف يُطبَّع ويُتحقَّق منه. وهو يُستهلَك من أمر محكوم واحد (ScanRecordRisks) لا
// يكتب حالة ولا يوقف فعلًا: الوقاية في الأوامر الحاكمة، وهذا الفحص يُعرض للمالك ليقرأه.
//
// خمسة شروط حاكمة (رؤية لجان للذكاء الاصطناعي):
//   1. استشاري بحت: لا انتقال حالة، لا رفض آلي، لا تصحيح.
//   2. موسوم: كل مخرج يحمل «مولَّد آليًا» + النموذج + الوقت، ويُسجَّل في AIOutputLedger.
//   3. قبل السجل: يقع قبل الاعتماد/الإصدار/النشر، لا داخله.
//   4. سيادة البيانات: لا يُدَّعى أن بيانات المؤسسة تُستخدم لتدريب نموذج مشترك.
//   5. لا يُخترع ما ليس في النص: علم بلا مقطع يُرفض، ومقطع يُقتبس كما هو.
//
// قاعدتا الصدق المفروضتان في الكود:
//   • فحص بلا نص ⇒ «غير مُقيَّم» لا «لا مخاطر» (الفراغ ليس براءة).
//   • الفحص يُفحِص لا يُصحِّح: لا يكتب ولا يحذف ولا يوقف.

export const RECORD_RISK_SCAN_VERSION = 'record-risk-scan-1.0.0';

/** الفئات السبع المعتمدة لفحص مخاطر النص قبل دخوله السجل. */
export const RISK_CATEGORIES: Record<string, { ar: string; en: string }> = {
  missing_legal_basis: {
    ar: 'غياب السند النظامي: المقترح لا يذكر سندًا نظاميًا أو يذكر سندًا غير محدَّد.',
    en: 'Missing legal basis: the proposal names no legal basis, or names an unspecified one.',
  },
  unaddressed_regulation: {
    ar: 'مرجع تنظيمي غير مُحدَّث أو تجاهل نص تنظيمي ملزم.',
    en: 'An unaddressed or outdated regulatory reference, ignoring a binding rule.',
  },
  unsupported_figure: {
    ar: 'رقم أو نسبة وردت بلا مصدر أو تبرير داخل النص.',
    en: 'A figure or percentage stated without a source or justification in the text.',
  },
  signature_required_missing: {
    ar: 'فعل يتطلب توقيعًا أو اعتمادًا صريحًا ولم يُذكر مَن يُوقِّع.',
    en: 'An act requiring an explicit signature or approval names no signatory.',
  },
  conflict_of_interest_relevant: {
    ar: 'بند قد يثير تضارب مصالح لأحد المقاعد ولم يُشر إليه.',
    en: 'An item that may raise a conflict of interest for a seat and does not flag it.',
  },
  vague_obligation: {
    ar: 'التزام تنفيذي غامض: بلا مسؤول محدَّد أو مهلة أو معيار إنجاز.',
    en: 'A vague execution obligation: no named owner, deadline or completion criterion.',
  },
  missing_deadline: {
    ar: 'التزام بلا مهلة، أو مهلة بلا تاريخ أو مرتبطة بحدث غير محدَّد.',
    en: 'An obligation with no deadline, or a deadline tied to no date or undefined event.',
  },
};

/** درجات الخطورة المعتمدة. */
export const RISK_SEVERITIES: Record<string, { ar: string; en: string }> = {
  high: { ar: 'عالية', en: 'High' },
  medium: { ar: 'متوسطة', en: 'Medium' },
  low: { ar: 'منخفضة', en: 'Low' },
};

export const RISK_SCAN_REFUSALS = {
  no_proposal_text: {
    ar: 'لا يوجد نص مقترح يُفحَص: القرار بلا محتوى مقترح بعد، فلا يُفحَص الفراغ ولا يُدَّعى أنه «بلا مخاطر».',
    en: 'No proposal text to scan: the decision has no proposal content yet, so the void is not scanned and never reads as "no risks".',
  },
  scan_unavailable: {
    ar: 'تعذّر إجراء الفحص الآن؛ لم تُكتب حالة ولا يُدَّعى أن النص سليم. أعِد المحاولة لاحقًا.',
    en: 'The scan could not be performed now; no state was written and the text is not claimed sound. Try again later.',
  },
};

/** يبني الطلب الموجَّه إلى النموذج من نص المقترح وسياقه. نص خالص، لا وسوم. */
export function buildRiskScanPrompt(decision: any, context: any = {}) {
  const proposalText = [
    decision?.title_ar || decision?.title || '',
    decision?.title_en || '',
    decision?.proposal || '',
    decision?.proposal_en || '',
    decision?.legal_basis || decision?.legal_basis_en || '',
    decision?.alternatives || '',
    decision?.owner_name || decision?.owner_name_en || '',
    decision?.deadline || '',
    decision?.dependencies || decision?.dependencies_en || '',
  ].filter(Boolean).join('\n\n').trim();

  const ctxBlock = [
    context.committeeName ? `اللجنة: ${context.committeeName}` : '',
    context.meetingTitle ? `الاجتماع: ${context.meetingTitle}` : '',
  ].filter(Boolean).join('\n');

  return `أنت مراجع حوكمة خبير في فحص نصوص مقترحات القرارات الحكومية باللغة العربية الفصحى قبل اعتمادها.
افحص النص التالي وحدّد المخاطر القانونية والامتثالية والتشغيلية التي قد تجعله غير صالحًا للدخول في السجل الرسمي قبل معالجتها.

الفئات المعتمدة للفحص (لا تستخدم غيرها):
- missing_legal_basis: غياب السند النظامي أو سنده غير محدَّد.
- unaddressed_regulation: مرجع تنظيمي غير مُحدَّث أو تجاهل نص ملزم.
- unsupported_figure: رقم أو نسبة بلا مصدر أو تبرير داخل النص.
- signature_required_missing: فعل يتطلب توقيعًا ولم يُسمَّ مَن يُوقِّع.
- conflict_of_interest_relevant: بند قد يثير تضارب مصالح ولم يُشر إليه.
- vague_obligation: التزام غامض بلا مسؤول أو مهلة أو معيار إنجاز.
- missing_deadline: التزام بلا مهلة، أو مهلة بلا تاريخ محدَّد.

قواعد إلزامية:
- لا تخترع مخاطر لا سند لها في النص. كل علم يجب أن يقتبس مقطعًا حرفيًا من النص في excerpt.
- إن لم تجد مخاطر، أعد flags كمصفوفة فارغة — لا تختلق.
- explanation_ar جملة عربية واحدة تفسّر الخطر. explanation_en مقابلها بالإنجليزية.
- location اسم الحقل أو المقطع الذي ظهر فيه الخطر (مثل: proposal · legal_basis · deadline).
- severity واحدة من: high · medium · low.

${ctxBlock ? `السياق:\n${ctxBlock}\n` : ''}
نص المقترح للفحص:
"""
${proposalText || '(لا يوجد نص)'}
"""

أعد النتيجة بصيغة JSON بالشكل: { "flags": [ { "category": "...", "severity": "...", "excerpt": "...", "location": "...", "explanation_ar": "...", "explanation_en": "..." } ] }`;
}

/** الشكل الذي يجب أن يعود عليه النموذج (response_json_schema). */
export const RISK_SCAN_SCHEMA = {
  type: 'object',
  properties: {
    flags: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string', enum: Object.keys(RISK_CATEGORIES) },
          severity: { type: 'string', enum: Object.keys(RISK_SEVERITIES) },
          excerpt: { type: 'string' },
          location: { type: 'string' },
          explanation_ar: { type: 'string' },
          explanation_en: { type: 'string' },
        },
        required: ['category', 'severity', 'excerpt', 'explanation_ar', 'explanation_en'],
      },
    },
    confidence_score: { type: 'number', minimum: 0, maximum: 1 },
    confidence_basis: { type: 'string' },
  },
  required: ['flags'],
};

/** يطبِّع مخرج النموذج ويرفض ما لا يحمل مقطعًا أو فئة غير معتمدة. */
export function parseRiskScan(raw: any) {
  const out: any[] = [];
  const dropped: any[] = [];
  const data = raw && typeof raw === 'object' && Array.isArray(raw.flags) ? raw.flags : [];
  for (const f of data) {
    const category = RISK_CATEGORIES[f?.category] ? f.category : null;
    const severity = RISK_SEVERITIES[f?.severity] ? f.severity : 'medium';
    const excerpt = String(f?.excerpt || '').trim();
    const explanationAr = String(f?.explanation_ar || '').trim();
    const explanationEn = String(f?.explanation_en || '').trim();
    if (!category || !excerpt || !explanationAr || !explanationEn) {
      dropped.push({ reason: 'incomplete_flag', category: f?.category || null, has_excerpt: !!excerpt });
      continue;
    }
    out.push({
      category,
      severity,
      excerpt,
      location: String(f?.location || '').trim() || null,
      explanation_ar: explanationAr,
      explanation_en: explanationEn,
    });
  }
  return { flags: out, dropped };
}

/** فحص العقد ذاته: فئات فريدة، كل فئة وجدتاها بلغتين، كل درجة بخطورة معتمدة. */
export function auditRiskScanContract() {
  const findings: any[] = [];
  const cats = Object.keys(RISK_CATEGORIES);
  const sevs = Object.keys(RISK_SEVERITIES);
  if (new Set(cats).size !== cats.length) findings.push({ code: 'duplicate_category' });
  if (new Set(sevs).size !== sevs.length) findings.push({ code: 'duplicate_severity' });
  for (const c of cats) {
    if (!RISK_CATEGORIES[c].ar || !RISK_CATEGORIES[c].en) findings.push({ code: 'sentence_missing', category: c });
  }
  for (const s of sevs) {
    if (!RISK_SEVERITIES[s].ar || !RISK_SEVERITIES[s].en) findings.push({ code: 'severity_sentence_missing', severity: s });
  }
  if (!RISK_SCAN_SCHEMA?.properties?.flags?.items?.properties?.category?.enum?.length) {
    findings.push({ code: 'schema_missing_enum' });
  }
  return { ok: findings.length === 0, findings, categories: cats.length, severities: sevs.length };
}

/** هل يوجد نص مقترح يُفحَص أصلًا؟ */
export function hasProposalText(decision: any) {
  return !![
    decision?.title_ar, decision?.title, decision?.title_en,
    decision?.proposal, decision?.proposal_en,
    decision?.legal_basis, decision?.legal_basis_en,
    decision?.alternatives, decision?.deadline,
    decision?.dependencies, decision?.dependencies_en,
  ].filter((v) => v && String(v).trim()).length;
}