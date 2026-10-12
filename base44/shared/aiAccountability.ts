// ai-accountability-1.0.0 — تقرير المساءلة على الذكاء الاصطناعي (OECD AI Principles · NIST AI RMF).
//
// WHY THIS EXISTS. أطر الحوكمة الحكومية للذكاء (OECD AI Principles, NIST AI RMF, EU AI Act) تتطلب
// إفصاحًا قابلاً للتدقيق عن أداء أنظمة الذكاء: تغطية المراجعة البشرية، معدلات تجاوز الإنسان،
// معايرة الثقة، والالتزام بـ«الاستشاري فقط». ما كان موجودًا يحسب كل ذلك في المتصفح من الصفحة
// المحمّلة — عين عيب D-088 — فلا مراجع وطني يقبل رقمًا يختلف بحسب عدد الصفوف.
//
// WHAT THIS MODULE IS. إعلان نقي: مقاييس المساءلة على الذكاء، أنواع المخرجات الاستشارية، أرضية
// الإفصاح، ومُقيِّم محلي يحاكي assessMetric. لا يقرأ سجلات ولا يكتب.
//
// WHAT IT DOES NOT CLAIM. لا يُصدر حكمًا على «جودة» الذكاء من رقم واحد، لا يكشف أفرادًا تحت أرضية
// الإفصاح، ولا يحلّ محل تدقيق مستقل. هو إفصاح المنصة عن أداء ذكائها للمراجع الوطني.

export const AI_ACCOUNTABILITY_VERSION = 'ai-accountability-1.0.0';
export const AI_DISCLOSURE_FLOOR = 5;

/** أنواع المخرجات التي يُنتجها الذكاء المحكوم — كلها استشارية بحتة، لا تُغيّر حالة. */
export const AI_OUTPUT_TYPES = {
  record_risk_scan: { ar: 'فحص مخاطر السجل', en: 'Record risk scan', advisory: true },
  meeting_prep_insights: { ar: 'تحضير الاجتماع', en: 'Meeting prep insights', advisory: true },
  meeting_pack_summary: { ar: 'ملخص الحزمة', en: 'Pack summary', advisory: true },
  meeting_pack_draft: { ar: 'مسودة الحزمة', en: 'Pack draft', advisory: true },
  meeting_minutes: { ar: 'محضر الاجتماع', en: 'Meeting minutes', advisory: true },
  governance_doc: { ar: 'وثيقة حوكمة', en: 'Governance document', advisory: true },
  decision_draft: { ar: 'مسودة قرار', en: 'Decision draft', advisory: true },
  policy_scenario: { ar: 'سيناريو سياسة', en: 'Policy scenario', advisory: true },
  institutional_memory: { ar: 'ذاكرة مؤسسية', en: 'Institutional memory', advisory: true },
  summary: { ar: 'ملخص', en: 'Summary', advisory: true },
  other: { ar: 'أخرى', en: 'Other', advisory: true },
};

/** أحكام التغذية الراجعة البشرية (تطابق AIOutputLedger.feedback_rating). */
export const FEEDBACK_RATINGS = {
  helpful: { ar: 'مفيد', en: 'Helpful', tone: 'state-success' },
  needs_correction: { ar: 'يحتاج تصحيحًا', en: 'Needs correction', tone: 'state-warning' },
  not_helpful: { ar: 'غير مفيد', en: 'Not helpful', tone: 'state-danger' },
};

export interface AIMetricDef {
  key: string;
  title: { ar: string; en: string };
  definition: { ar: string; en: string };
  owner: { role: string; ar: string; en: string };
  numerator: { ar: string; en: string };
  denominator: { ar: string; en: string };
  polarity: 'direct' | 'inverse';
  disclosure_floor: number;
}

export const AI_METRICS: Record<string, AIMetricDef> = {
  ai_review_coverage: {
    key: 'ai_review_coverage',
    title: { ar: 'تغطية المراجعة البشرية', en: 'Human review coverage' },
    definition: {
      ar: 'حصة مخرجات الذكاء التي فُتحت للمراجعة البشرية من مجموع المخرجات — لا مخرج يُعتمد دون إنسان في الحلقة.',
      en: 'The share of AI outputs opened for human review out of all outputs — no output is adopted without a human in the loop.',
    },
    owner: { role: 'chair', ar: 'رئيس اللجنة', en: 'Committee chair' },
    numerator: { ar: 'مخرجات راجعها إنسان (human_reviewed = true)', en: 'Outputs a human reviewed (human_reviewed = true)' },
    denominator: { ar: 'كل مخرجات الذكاء على اللجنة', en: 'All AI outputs on the committee' },
    polarity: 'direct',
    disclosure_floor: AI_DISCLOSURE_FLOOR,
  },
  ai_human_override_rate: {
    key: 'ai_human_override_rate',
    title: { ar: 'معدل تجاوز الإنسان', en: 'Human override rate' },
    definition: {
      ar: 'حصة المخرجات المراجَعة التي حكم الإنسان بأنها تحتاج تصحيحًا أو غير مفيدة — معدل مرتفعه علامة وجوب تحسين المُوجِّهات، لا عيب المراجع.',
      en: 'The share of reviewed outputs a human judged as needing correction or not helpful — a high rate signals the prompts must improve, not that the reviewer is wrong.',
    },
    owner: { role: 'chair', ar: 'رئيس اللجنة', en: 'Committee chair' },
    numerator: { ar: 'مخرجات حُكم عليها: يحتاج تصحيحًا + غير مفيد', en: 'Outputs judged: needs correction + not helpful' },
    denominator: { ar: 'المخرجات المراجَعة بشريًا', en: 'Outputs reviewed by a human' },
    polarity: 'inverse',
    disclosure_floor: AI_DISCLOSURE_FLOOR,
  },
  ai_helpful_rate: {
    key: 'ai_helpful_rate',
    title: { ar: 'نسبة المخرجات المفيدة', en: 'Helpful output rate' },
    definition: {
      ar: 'حصة المخرجات المراجَعة التي حكم الإنسان بأنها مفيدة — تقيس فائدة الذكاء للمراجع، لا دقته المطلقة.',
      en: 'The share of reviewed outputs a human judged as helpful — a measure of the AI usefulness to the reviewer, not its absolute accuracy.',
    },
    owner: { role: 'chair', ar: 'رئيس اللجنة', en: 'Committee chair' },
    numerator: { ar: 'مخرجات حُكم عليها: مفيد', en: 'Outputs judged: helpful' },
    denominator: { ar: 'المخرجات المراجَعة بشريًا', en: 'Outputs reviewed by a human' },
    polarity: 'direct',
    disclosure_floor: AI_DISCLOSURE_FLOOR,
  },
  ai_confidence_avg: {
    key: 'ai_confidence_avg',
    title: { ar: 'متوسط ثقة النموذج', en: 'Average model confidence' },
    definition: {
      ar: 'متوسط تقدير النموذج الذاتي لثقته في مخرجاته على هذه اللجنة — تقدير لا ضمان، ويُقارن بنسبة القبول البشري لمعايرة الانحياز.',
      en: 'The average of the model self-confidence across its outputs on this committee — an estimate not a guarantee, compared to the human acceptance rate to calibrate bias.',
    },
    owner: { role: 'secretary', ar: 'أمين اللجنة', en: 'Committee secretary' },
    numerator: { ar: 'مجموع درجات الثقة', en: 'Sum of confidence scores' },
    denominator: { ar: 'عدد المخرجات ذات درجة ثقة', en: 'Count of outputs carrying a confidence score' },
    polarity: 'direct',
    disclosure_floor: AI_DISCLOSURE_FLOOR,
  },
};

/** مُقيِّم محلي يحاكي assessMetric: لا يُعيد رقمًا مجردًا أبدًا. */
export function assessAIMetric(key: string, numerator: number | null, denominator: number | null) {
  const m = AI_METRICS[key];
  if (!m) return { ok: false, code: 'unknown_metric', key };

  const base = {
    ok: true,
    key,
    title: m.title,
    definition: m.definition,
    owner: m.owner,
    numerator_text: m.numerator,
    denominator_text: m.denominator,
    polarity: m.polarity,
    disclosure_floor: m.disclosure_floor,
    computed_on: 'server',
  };

  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined) {
    return { ...base, state: 'unread', value: null, numerator: numerator ?? null, denominator: denominator ?? null,
      note: { ar: 'تعذّرت قراءة مصدر الرقم — لا يُعرض صفر بدلًا عنه.', en: 'The source could not be read — no zero is shown in its place.' } };
  }
  const num = Number(numerator), den = Number(denominator);
  if (!Number.isInteger(num) || !Number.isInteger(den) || num < 0 || den < 0) {
    return { ...base, ok: false, code: 'invalid_counts', state: 'refused', value: null, numerator, denominator };
  }
  if (num > den) {
    return { ...base, ok: false, code: 'numerator_exceeds_denominator', state: 'refused', value: null, numerator: num, denominator: den };
  }
  if (den === 0) {
    return { ...base, state: 'no_records', value: null, numerator: num, denominator: den,
      note: { ar: 'لا سجل في هذه الفترة — لا تُقرأ كنسبة صفرية.', en: 'No records in this period — this is not read as a zero rate.' } };
  }
  if (den < m.disclosure_floor) {
    return { ...base, state: 'suppressed', suppressed: true, reason: 'small_basis', value: null, numerator: num, denominator: den,
      note: { ar: 'الأساس أصغر من حد الإفصاح — لا تُعرض نسبة قد تكشف أفرادًا.', en: 'The basis is below the disclosure floor — no rate is shown that could identify individuals.' } };
  }
  if (key !== 'ai_confidence_avg' && num > 0 && num < m.disclosure_floor) {
    return { ...base, state: 'suppressed', suppressed: true, reason: 'small_numerator', value: null, numerator: num, denominator: den,
      note: { ar: 'عدد الحالات أقل من حد الإفصاح.', en: 'The count is below the disclosure floor.' } };
  }

  // ai_confidence_avg: القيمة هي المتوسط (0..1) لا نسبة مئوية
  if (key === 'ai_confidence_avg') {
    const avg = den > 0 ? num / den : 0;
    return { ...base, state: 'computed', value: Math.round(avg * 1000) / 1000, numerator: num, denominator: den, unit: 'score' as const, fraction: `${num}/${den}` };
  }
  const value = Math.round((num / den) * 100);
  return { ...base, state: 'computed', value, numerator: num, denominator: den, unit: 'percent' as const, fraction: `${num}/${den}` };
}

/** الفحص الذاتي: كل مقياس له بسط ومقام ومالك وأرضية إفصاح. */
export function selfCheckAI() {
  const problems: string[] = [];
  for (const [key, m] of Object.entries(AI_METRICS)) {
    if (m.key !== key) problems.push(`${key}: key mismatch`);
    if (!m.title?.ar || !m.title?.en) problems.push(`${key}: title not bilingual`);
    if (!m.definition?.ar || !m.definition?.en) problems.push(`${key}: definition not bilingual`);
    if (!m.owner?.role || !m.owner?.ar || !m.owner?.en) problems.push(`${key}: owner not named`);
    if (!m.numerator?.ar || !m.denominator?.ar) problems.push(`${key}: numerator/denominator not stated`);
    if (m.disclosure_floor < 1) problems.push(`${key}: no disclosure floor`);
    if (!['direct', 'inverse'].includes(m.polarity)) problems.push(`${key}: unknown polarity`);
  }
  return { contract_version: AI_ACCOUNTABILITY_VERSION, ok: problems.length === 0, metrics: Object.keys(AI_METRICS).length, problems };
}

/** عقد «الاستشاري فقط»: لا نوع ذكاء يُغيّر حالة قرار أو اجتماع أو إجراء. */
export const ADVISORY_ONLY_CLAUSE = {
  ar: 'كل أنواع مخرجات الذكاء على هذه المنصة استشارية بحتة: لا تُغيّر حالة قرار ولا توقف إصدارًا ولا تُغلق إجراءًا. الإنسان في الحلقة، والحكم النهائي بشري.',
  en: 'Every AI output type on this platform is advisory only: it changes no decision state, stops no issuance, and closes no action. The human is in the loop, and the final verdict is human.',
};