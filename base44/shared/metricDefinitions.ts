// metricDefinitions.ts — the definition of every number the institution is shown (metric-definitions-1.0.0).
//
// D-088: the report screen computed its percentages IN THE BROWSER from the page of records that happened
// to be loaded (`issuedDecisions.length / decisions.length`), so the same screen showed a different number
// depending on how many rows were read, the denominator was never stated, no one owned the number, and a
// rate over three records was displayed exactly like a rate over three hundred — a small count that
// identifies people.
//
// This module states ONCE, per metric: what it is called, what it MEANS, WHO owns it, over which PERIOD,
// what the NUMERATOR counts, what the DENOMINATOR is (or that it has none), which records are READ, how
// FRESH the number is, and the DISCLOSURE FLOOR below which no number is shown at all.
//
// Three rules are enforced in code, not in a comment:
//   1. A number is never returned without its definition, owner, period, numerator, denominator and
//      freshness — the assessment carries them, so no surface can print a bare figure.
//   2. Below the disclosure floor the VALUE is withheld and the floor is named (a small basis is not
//      shown as a rate, and a small numerator is not shown as a count that identifies individuals).
//   3. A metric whose numerator exceeds its denominator is refused loudly (`numerator_exceeds_denominator`),
//      and a count that could not be read is reported as unread — never as zero.
//
// It reads no records and writes none.

export const METRIC_DEFINITIONS_VERSION = "metric-definitions-1.0.0";
export const DISCLOSURE_FLOOR = 5;

/** Entities this registry is allowed to name as a source — the same names the platform stores. */
export const GOVERNED_SOURCES = ["Decision", "Action", "MeetingMinutes", "Meeting"];

const live = { mode: "live_read", ar: "قراءة حيّة عند الطلب — ليست صورة مخزَّنة", en: "Live read on request — not a stored snapshot" };

function metric(row: any) {
  return {
    computed_on: "server",
    disclosure_floor: row.disclosure_floor ?? DISCLOSURE_FLOOR,
    unit: row.unit || "percent",
    polarity: row.polarity || "direct",
    freshness: live,
    ...row,
  };
}

export const METRICS: Record<string, any> = {
  decision_issuance_rate: metric({
    key: "decision_issuance_rate",
    title: { ar: "نسبة القرارات الصادرة", en: "Decision issuance rate" },
    definition: {
      ar: "حصة القرارات التي بلغت الإصدار من مجموع القرارات المسجَّلة على اللجنة.",
      en: "The share of decisions that reached issuance out of all decisions recorded on the committee.",
    },
    owner: { role: "chair", ar: "رئيس اللجنة", en: "Committee chair" },
    period: { mode: "register_lifetime", ar: "كل ما هو مسجَّل على اللجنة (تاريخ السجل)", en: "Everything recorded on the committee (register lifetime)" },
    numerator: { ar: "القرارات في حالة: صادر · قيد التنفيذ · مُكتمل · مُغلق", en: "Decisions in state: issued · executing · completed · closed", source: "Decision", rule: "status in issued states" },
    denominator: { ar: "كل قرارات اللجنة", en: "All decisions on the committee", source: "Decision", rule: "all rows" },
    source_entities: ["Decision"],
    route: "decisions",
  }),
  decision_package_completeness: metric({
    key: "decision_package_completeness",
    title: { ar: "اكتمال حزمة الإصدار", en: "Issuance package completeness" },
    definition: {
      ar: "حصة القرارات الصادرة التي تحمل حزمة إصدار مُتحقَّقة (بيان مطابق لبصمته).",
      en: "The share of issued decisions carrying a verified issuance package (manifest matching its digest).",
    },
    owner: { role: "secretary", ar: "أمين اللجنة", en: "Committee secretary" },
    period: { mode: "register_lifetime", ar: "كل ما هو مسجَّل على اللجنة", en: "Everything recorded on the committee" },
    numerator: { ar: "قرارات صادرة بحالة إصدار «مكتمل»", en: "Issued decisions whose issuance state is complete", source: "Decision", rule: "issuance_state = complete" },
    denominator: { ar: "القرارات الصادرة", en: "Issued decisions", source: "Decision", rule: "status in issued states" },
    source_entities: ["Decision"],
    route: "decisions",
  }),
  action_closure_rate: metric({
    key: "action_closure_rate",
    title: { ar: "نسبة إغلاق الإجراءات", en: "Action closure rate" },
    definition: {
      ar: "حصة الإجراءات المُغلقة من مجموع الإجراءات المسندة على اللجنة — والإغلاق يقتضي حكمًا مقبولًا من متحقّق مستقل.",
      en: "The share of closed actions out of all actions assigned on the committee — closure requires an accepted verdict from an independent verifier.",
    },
    owner: { role: "chair", ar: "رئيس اللجنة", en: "Committee chair" },
    period: { mode: "register_lifetime", ar: "كل ما هو مسجَّل على اللجنة", en: "Everything recorded on the committee" },
    numerator: { ar: "إجراءات مُغلقة", en: "Closed actions", source: "Action", rule: "status = closed" },
    denominator: { ar: "كل إجراءات اللجنة", en: "All actions on the committee", source: "Action", rule: "all rows" },
    source_entities: ["Action"],
    route: "actions",
  }),
  open_overdue_rate: metric({
    key: "open_overdue_rate",
    title: { ar: "نسبة الإجراءات المتأخرة المفتوحة", en: "Open overdue action rate" },
    definition: {
      ar: "حصة الإجراءات المفتوحة التي تجاوزت مهلة سجلها. ارتفاعها علامة خطر، ولا تُقرأ كإنجاز.",
      en: "The share of open actions whose recorded deadline has passed. A rising value is a risk signal, never an achievement.",
    },
    owner: { role: "secretary", ar: "أمين اللجنة", en: "Committee secretary" },
    period: { mode: "as_of_now", ar: "بحسب اليوم", en: "As of today" },
    numerator: { ar: "إجراءات مفتوحة تجاوزت مهلتها", en: "Open actions past their deadline", source: "Action", rule: "status not done and deadline < today" },
    denominator: { ar: "الإجراءات المفتوحة", en: "Open actions", source: "Action", rule: "status not done" },
    source_entities: ["Action"],
    polarity: "inverse",
    route: "actions",
  }),
  evidence_first_pass_rate: metric({
    key: "evidence_first_pass_rate",
    title: { ar: "نسبة قبول الدليل من أول تقديم", en: "Evidence accepted first pass" },
    definition: {
      ar: "حصة الأدلة المقبولة التي لم تُعَد للتعديل قبل قبولها — تقيس وضوح المطلوب لا سرعة المنفّذ.",
      en: "The share of accepted evidence that was not returned for correction first — a measure of how clear the requirement is, not of the performer's speed.",
    },
    owner: { role: "chair", ar: "رئيس اللجنة", en: "Committee chair" },
    period: { mode: "register_lifetime", ar: "كل ما هو مسجَّل على اللجنة", en: "Everything recorded on the committee" },
    numerator: { ar: "أدلة مقبولة بلا إعادة سابقة", en: "Accepted evidence with no prior return", source: "Action", rule: "verification_state = accepted and return_reason absent" },
    denominator: { ar: "الأدلة المقبولة", en: "Accepted evidence", source: "Action", rule: "verification_state = accepted" },
    source_entities: ["Action"],
    route: "evidence",
  }),
  minutes_approval_rate: metric({
    key: "minutes_approval_rate",
    title: { ar: "نسبة اعتماد المحاضر", en: "Minutes approval rate" },
    definition: {
      ar: "حصة المحاضر المعتمدة أو الصادرة من مجموع المحاضر — الاعتماد فعل مستقل عن تحرير المسودة.",
      en: "The share of approved or issued minutes out of all minutes — approval is an act independent of drafting.",
    },
    owner: { role: "secretary", ar: "أمين اللجنة", en: "Committee secretary" },
    period: { mode: "register_lifetime", ar: "كل ما هو مسجَّل على اللجنة", en: "Everything recorded on the committee" },
    numerator: { ar: "محاضر معتمدة أو صادرة", en: "Approved or issued minutes", source: "MeetingMinutes", rule: "status in approved, issued" },
    denominator: { ar: "كل المحاضر", en: "All minutes", source: "MeetingMinutes", rule: "all rows" },
    source_entities: ["MeetingMinutes"],
    route: "minutes",
  }),
};

export const METRIC_KEYS = Object.keys(METRICS);

const REQUIRED_FACTS = ["title", "definition", "owner", "period", "numerator", "denominator", "source_entities", "freshness", "disclosure_floor"];

/** The registry audits ITSELF: a metric missing a fact, or naming a source it does not read, fails here. */
export function selfCheck() {
  const problems: string[] = [];
  for (const key of METRIC_KEYS) {
    const m = METRICS[key];
    if (m.key !== key) problems.push(`${key}: key mismatch`);
    for (const f of REQUIRED_FACTS) if (m[f] === undefined || m[f] === null) problems.push(`${key}: missing ${f}`);
    if (!m.title?.ar || !m.title?.en) problems.push(`${key}: title is not bilingual`);
    if (!m.definition?.ar || !m.definition?.en) problems.push(`${key}: definition is not bilingual`);
    if (!m.owner?.role || !m.owner?.ar || !m.owner?.en) problems.push(`${key}: owner is not named`);
    if (m.disclosure_floor === undefined || m.disclosure_floor < 1) problems.push(`${key}: no disclosure floor`);
    if (!["percent", "count"].includes(m.unit)) problems.push(`${key}: unknown unit`);
    if (!["direct", "inverse"].includes(m.polarity)) problems.push(`${key}: unknown polarity`);
    if (m.unit === "percent" && /not_applicable/.test(m.denominator?.rule || "")) problems.push(`${key}: a rate without a denominator`);
    for (const s of [m.numerator?.source, m.denominator?.source].filter(Boolean)) {
      if (!m.source_entities.includes(s)) problems.push(`${key}: source ${s} is not declared in source_entities`);
    }
    for (const s of m.source_entities) if (!GOVERNED_SOURCES.includes(s)) problems.push(`${key}: ${s} is not a governed source`);
    if (m.computed_on !== "server") problems.push(`${key}: must be computed on the server`);
  }
  if (new Set(METRIC_KEYS).size !== METRIC_KEYS.length) problems.push("duplicate metric keys");
  return { contract_version: METRIC_DEFINITIONS_VERSION, ok: problems.length === 0, metrics: METRIC_KEYS.length, problems };
}

/**
 * The metric code inventory, EXPORTED so the exception register derives from it instead of restating it —
 * a code cannot be changed here without the register noticing.
 */
export const METRIC_CODE = {
  unknown_metric: "unknown_metric",
  invalid_counts: "invalid_counts",
  numerator_exceeds_denominator: "numerator_exceeds_denominator",
  refused: "refused",
  unread: "unread",
  no_records: "no_records",
  suppressed: "suppressed",
  computed: "computed",
  small_basis: "small_basis",
  small_numerator: "small_numerator",
} as const;
/**
 * The codes that ARE exceptional — the ones a stop carries. Exported so the exception register derives
 * from this contract instead of restating it: a code cannot change here without the register noticing.
 * (`refused`, `suppressed` and `computed` are STATES a verdict takes, not stop codes.)
 */
export const METRIC_EXCEPTION_CODES: string[] = [
  METRIC_CODE.unknown_metric,
  METRIC_CODE.invalid_counts,
  METRIC_CODE.numerator_exceeds_denominator,
  METRIC_CODE.unread,
  METRIC_CODE.no_records,
  METRIC_CODE.small_basis,
  METRIC_CODE.small_numerator,
];

const SUPPRESSION_TEXT: Record<string, { ar: string; en: string }> = {
  small_basis: {
    ar: "الأساس أصغر من حد الإفصاح — لا تُعرض نسبة قد تكشف أفرادًا.",
    en: "The basis is below the disclosure floor — no rate is shown that could identify individuals.",
  },
  small_numerator: {
    ar: "عدد الحالات أقل من حد الإفصاح — لا يُعرض رقم صغير يمكن نسبته إلى أشخاص.",
    en: "The count is below the disclosure floor — a small figure that could be attributed to individuals is withheld.",
  },
};

const STATE_TEXT: Record<string, { ar: string; en: string }> = {
  no_records: { ar: "لا سجل في هذه الفترة — لا تُقرأ كنسبة صفرية.", en: "No records in this period — this is not read as a zero rate." },
  unread_source: { ar: "تعذّرت قراءة مصدر الرقم — لا يُعرض صفر بدلًا عنه.", en: "The source could not be read — no zero is shown in its place." },
};

/**
 * assessMetric — the ONE place a metric becomes a displayed value. Never returns a bare number:
 * the value travels with its definition, owner, period, numerator, denominator and freshness.
 */
export function assessMetric({ key, numerator, denominator }: any) {
  const m = METRICS[key];
  if (!m) return { ok: false, code: METRIC_CODE.unknown_metric, key };
  const base = {
    ok: true,
    key,
    title: m.title, definition: m.definition, owner: m.owner, period: m.period,
    numerator_text: m.numerator, denominator_text: m.denominator,
    source_entities: m.source_entities, freshness: m.freshness,
    unit: m.unit, polarity: m.polarity, disclosure_floor: m.disclosure_floor,
    computed_on: "server",
  };

  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined) {
    return { ...base, state: METRIC_CODE.unread, value: null, numerator: numerator ?? null, denominator: denominator ?? null, note: STATE_TEXT.unread_source };
  }
  const num = Number(numerator), den = Number(denominator);
  if (!Number.isInteger(num) || !Number.isInteger(den) || num < 0 || den < 0) {
    return { ...base, ok: false, code: METRIC_CODE.invalid_counts, state: METRIC_CODE.refused, value: null, numerator, denominator };
  }
  // A self-check that fails LOUDLY rather than rendering an impossible figure.
  if (num > den) {
    return { ...base, ok: false, code: METRIC_CODE.numerator_exceeds_denominator, state: METRIC_CODE.refused, value: null, numerator: num, denominator: den };
  }
  if (den === 0) {
    return { ...base, state: METRIC_CODE.no_records, value: null, numerator: num, denominator: den, note: STATE_TEXT.no_records };
  }
  if (den < m.disclosure_floor) {
    return { ...base, state: METRIC_CODE.suppressed, suppressed: true, reason: METRIC_CODE.small_basis, value: null, numerator: num, denominator: den, note: SUPPRESSION_TEXT.small_basis };
  }
  if (m.unit === "count" && num > 0 && num < m.disclosure_floor) {
    return { ...base, state: METRIC_CODE.suppressed, suppressed: true, reason: METRIC_CODE.small_numerator, value: null, numerator: num, denominator: den, note: SUPPRESSION_TEXT.small_numerator };
  }
  if (m.unit === "percent" && num > 0 && num < m.disclosure_floor) {
    return { ...base, state: METRIC_CODE.suppressed, suppressed: true, reason: METRIC_CODE.small_numerator, value: null, numerator: num, denominator: den, note: SUPPRESSION_TEXT.small_numerator };
  }
  const value = m.unit === "percent" ? Math.round((num / den) * 100) : num;
  return { ...base, state: METRIC_CODE.computed, value, numerator: num, denominator: den, fraction: `${num}/${den}` };
}

/** The ONE line a surface prints for a metric — a value is never separated from its definition. */
export function metricLine(assessment: any, lang = "ar") {
  const m = METRICS[assessment?.key];
  if (!m) return "—";
  const value = assessment?.value === null || assessment?.value === undefined
    ? (assessment?.note ? (lang === "ar" ? assessment.note.ar : assessment.note.en) : "—")
    : assessment.unit === "percent" ? `${assessment.value}%` : `${assessment.value}`;
  const def = lang === "ar" ? m.definition.ar : m.definition.en;
  const basis = assessment.numerator !== null && assessment.denominator !== null
    ? `${assessment.numerator}/${assessment.denominator}`
    : "—";
  return `${value} · ${basis} · ${def}`;
}