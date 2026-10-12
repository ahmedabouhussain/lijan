// ai-system-registry-1.0.0 — سجل أنظمة الذكاء الاصطناعي وتقييم أثرها.
//
// WHY THIS EXISTS. ISO/IEC 42001:2023 (§6.1.2 AI risk assessment · §8.3 AI system impact assessment)
// وقانون الاتحاد الأوروبي للذكاء الاصطناعي يطلبان من أي جهة حكومية أن تحتفظ بسجل لكل نظام ذكاء
// قيد الاستخدام: ما غرضه، أي نموذج، أي فئة مخاطر ينتمي إليها، أي حالات استخدام مُصرّح بها،
// أي مصادر بيانات يقرأ، وما التقييم الذي تأثيره على الفرد والجهة. قبل هذا السجل كانت المنصة
// تُسجّل «المخرجات» (AIOutputLedger) لكنها لم تُسجّل «الأنظمة» نفسها — فلا مراجع وطني يستطيع
// أن يثبت أن كل ذكاء قيد الاستخدام مُصرّح به ومُقيَّم الأثر.
//
// WHAT THIS MODULE IS. إعلان نقي: فئات المخاطر (EU AI Act)، حقول تقييم الأثر، حالات الاستخدام
// المصرّح بها على هذه المنصة، والمرجع المعياري لكل فئة. لا يقرأ سجلات ولا يكتب.
//
// WHAT IT DOES NOT CLAIM. لا يُصدر حكمًا بأن نظامًا «آمنًا» من فئة مخاطره — التقييم بشري.
// لا يحلّ محل مراجعة خارجية. هو إطار تصنيف وإفصاح قابل للتدقيق.

export const AI_SYSTEM_REGISTRY_VERSION = 'ai-system-registry-1.0.0';

/**
 * فئات المخاطر — قانون الاتحاد الأوروبي للذكاء الاصطناعي (Art. 6 / Annex III).
 * فئة «الممنوع» لا تُستخدم على هذه المنصة أبدًا — وجودها هنا للإفصاح عن الرفض، لا للاعتماد.
 */
export const AI_RISK_TIERS = {
  prohibited: {
    ar: 'ممنوع',
    en: 'Prohibited',
    tone: 'state-danger',
    order: 4,
    admissible: false,
    standard: 'EU AI Act Art. 5 — practices never admitted on this platform',
  },
  high_risk: {
    ar: 'مخاطر عالية',
    en: 'High risk',
    tone: 'state-warning',
    order: 3,
    admissible: true,
    standard: 'EU AI Act Art. 6 / Annex III — requires impact assessment, human oversight, logging',
  },
  limited_risk: {
    ar: 'مخاطر محدودة',
    en: 'Limited risk',
    tone: 'state-progress',
    order: 2,
    admissible: true,
    standard: 'EU AI Act Art. 50 — transparency obligation (advisory labelling)',
  },
  minimal_risk: {
    ar: 'مخاطر ضئيلة',
    en: 'Minimal risk',
    tone: 'state-info',
    order: 1,
    admissible: true,
    standard: 'EU AI Act — voluntary governance, no mandatory obligation',
  },
} as const;

/** حالات الاستخدام المصرّح بها على هذه المنصة — كلها استشارية بحتة، تُقاس بـAIOutputLedger. */
export const PERMITTED_USE_CASES = {
  record_risk_scan: { ar: 'فحص مخاطر السجل المقترح', en: 'Proposed-record risk scan', advisory: true },
  meeting_prep: { ar: 'تحضير الاجتماع', en: 'Meeting preparation', advisory: true },
  pack_summary: { ar: 'تلخيص الحزمة', en: 'Pack summarization', advisory: true },
  pack_draft_assembly: { ar: 'تجميع مسودة الحزمة', en: 'Pack draft assembly', advisory: true },
  minutes_draft: { ar: 'مسودة المحاضر', en: 'Minutes draft', advisory: true },
  governance_doc_draft: { ar: 'مسودة وثيقة حوكمة', en: 'Governance document draft', advisory: true },
  decision_draft: { ar: 'مسودة قرار', en: 'Decision draft', advisory: true },
  policy_scenario: { ar: 'سيناريو سياسة', en: 'Policy scenario', advisory: true },
  institutional_memory: { ar: 'ذاكرة مؤسسية', en: 'Institutional memory', advisory: true },
  summary: { ar: 'ملخص عام', en: 'General summary', advisory: true },
} as const;

/** حالات استخدام مرفوضة صراحةً — لا تُقبل على هذه المنصة (EU AI Act Art. 5). */
export const PROHIBITED_USE_CASES = [
  'social_scoring',
  'real_time_biometric_surveillance',
  'manipulation_of_decision',
  'exploitation_of_vulnerability',
  'untargeted_facial_capture',
] as const;

/** حالة النظام في السجل — دورة حياة مُسجَّلة لا حذف صامت. */
export const AI_SYSTEM_STATUS = {
  draft: { ar: 'مسودة', en: 'Draft', tone: 'state-neutral', order: 1 },
  under_review: { ar: 'قيد المراجعة', en: 'Under review', tone: 'state-progress', order: 2 },
  approved: { ar: 'مُعتمد', en: 'Approved', tone: 'state-success', order: 3 },
  retired: { ar: 'مُحال', en: 'Retired', tone: 'state-info', order: 4 },
} as const;

export interface AIImpactAssessmentFields {
  /** من يتأثر بهذا النظام — الجهات والأفراد في نطاق تأثيره. */
  affected_parties: string;
  /** المخاطر المُحدَّدة في التقييم — ما الذي قد يسوء. */
  identified_risks: string;
  /** التدابير المُتخذة — الإشراف البشري، الإفصاح، التسجيل، حدود المدخلات. */
  mitigation_measures: string;
  /** أساس الإشراف البشري — من يراجع، متى، وبأي صلاحية. */
  human_oversight_basis: string;
}

/** العقد: تقييم الأثر يجب أن يجيب على أربعة أسئلة جوهرية. */
export const IMPACT_ASSESSMENT_QUESTIONS: Record<keyof AIImpactAssessmentFields, { ar: string; en: string }> = {
  affected_parties: {
    ar: 'من يتأثر بهذا النظام؟ (الجهات والأفراد في نطاق تأثيره)',
    en: 'Who is affected by this system? (parties and individuals in its scope of impact)',
  },
  identified_risks: {
    ar: 'ما المخاطر المُحدَّدة؟ (ما الذي قد يسوء)',
    en: 'What risks are identified? (what could go wrong)',
  },
  mitigation_measures: {
    ar: 'ما التدابير المُتخذة؟ (الإشراف البشري، الإفصاح، التسجيل، حدود المدخلات)',
    en: 'What mitigation measures are in place? (human oversight, disclosure, logging, input bounds)',
  },
  human_oversight_basis: {
    ar: 'ما أساس الإشراف البشري؟ (من يراجع، متى، وبأي صلاحية)',
    en: 'What is the basis for human oversight? (who reviews, when, and with what authority)',
  },
};

/** فحص ذاتي: كل فئة مخاطر لها مرجع معياري، وكل حالة استخدام مصرّح بها استشارية. */
export function selfCheckAISystemRegistry() {
  const problems: string[] = [];
  for (const [key, t] of Object.entries(AI_RISK_TIERS)) {
    if (!t.ar || !t.en) problems.push(`${key}: not bilingual`);
    if (typeof t.admissible !== 'boolean') problems.push(`${key}: admissible not boolean`);
    if (!t.standard) problems.push(`${key}: no standard reference`);
  }
  for (const [key, u] of Object.entries(PERMitted_USE_CASES as Record<string, any>)) {
    if (!u.advisory) problems.push(`${key}: not advisory — every use case must be advisory only`);
    if (!u.ar || !u.en) problems.push(`${key}: not bilingual`);
  }
  if (PROHIBITED_USE_CASES.length === 0) problems.push('no prohibited use cases declared');
  return {
    contract_version: AI_SYSTEM_REGISTRY_VERSION,
    ok: problems.length === 0,
    risk_tiers: Object.keys(AI_RISK_TIERS).length,
    permitted_use_cases: Object.keys(PERMitted_USE_CASES).length,
    prohibited: PROHIBITED_USE_CASES.length,
    problems,
  };
}