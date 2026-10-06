// materialChange.ts — MEANING-LEVEL materiality of a voted text (material-change-1.0.0).
//
// D-087: the field-level diff of the frozen proposal (proposal-content-1.0.0) compared amounts, dates
// and negations INSIDE a changed field, and it compared them as multisets of the whole field. Two real
// changes were therefore invisible before a ballot:
//   • a UNIT change with the number unchanged — «٣٠ يومًا» → «٣٠ أسبوعًا»: the amount multiset is
//     identical, so nothing was reported although the obligation moved by an order of magnitude;
//   • a VALUE MOVED TO ANOTHER SUBJECT — «٥٠٪ للجهة (أ) و٣٠٪ للجهة (ب)» → the two percentages swapped:
//     identical multiset, different meaning.
// And two changes of a normative kind were reported as "wording only":
//   • modality («يجوز» → «يجب» — may → shall), scope («كل» → «بعض», «لا يقل عن» → «لا يزيد عن») and a
//     changed normative REFERENCE (نظام المناقصات → نظام المشتريات).
//
// This module states ONCE, as a pure function, what makes two texts materially different — so the
// answer is the same on the pre-vote screen, in the round's stored findings and in an export. It reads
// no records and writes none.
//
// A finding is a CODE with its own bilingual label; a verdict is `material_change` only when at least
// one finding is material. It decides no authority and proves no validity: it names what moved.

export const MATERIAL_CHANGE_VERSION = "material-change-1.0.0";

export const MATERIAL_FINDING_LABELS: Record<string, { ar: string; en: string }> = {
  amount_changed: { ar: "تغيّر مبلغ أو نسبة", en: "Amount or percentage changed" },
  unit_changed: { ar: "تغيّر الوحدة مع بقاء الرقم (يوم/أسبوع، نسبة/عملة)", en: "Unit changed while the number stayed (day/week, percent/currency)" },
  value_subject_swap: { ar: "انتقل الرقم إلى جهة أو بند آخر", en: "A number moved to another party or subject" },
  date_changed: { ar: "تغيّر تاريخ", en: "Date changed" },
  negation_added: { ar: "أُضيف نفي أو استثناء", en: "Negation or exception added" },
  negation_removed: { ar: "أُزيل نفي أو استثناء", en: "Negation or exception removed" },
  modality_strengthened: { ar: "تشددت الصيغة الإلزامية (يجوز ← يجب)", en: "Obligation strengthened (may → shall)" },
  modality_weakened: { ar: "تراخت الصيغة الإلزامية (يجب ← يجوز)", en: "Obligation weakened (shall → may)" },
  scope_changed: { ar: "تغيّر نطاق الالتزام (كل/بعض، حد أدنى/حد أعلى)", en: "Scope changed (all/some, floor/ceiling)" },
  reference_changed: { ar: "تغيّر السند المرجعي المُسمّى", en: "A named normative reference changed" },
  text_added: { ar: "أُضيف نص لم يكن مُصوَّتًا عليه", en: "Text was added that was not voted on" },
  text_removed: { ar: "أُزيل نص كان مُصوَّتًا عليه", en: "Text that was voted on was removed" },
  wording_changed: { ar: "صياغة فقط", en: "Wording only" },
};

// ── Normalisation (self-contained: this module imports nothing, so no cycle with the frozen-content contract) ──
const AR_MARKS = /[\u064B-\u0652\u0670\u0640]/g; // diacritics + tatweel

export const toAsciiDigits = (s: string) => String(s ?? "")
  .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
  .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
  .replace(/\u066B/g, ".").replace(/\u066C/g, ",").replace(/\u066A/g, "%");

/** Comparable form: digits, alef/yeh unified, diacritics removed, whitespace collapsed, lowercased. */
export function normalizeText(s: any) {
  return toAsciiDigits(s)
    .normalize("NFC")
    .replace(AR_MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/[ىئ]/g, "ي")
    .replace(/[.,;:!?()«»"'\-–—/\\[\]{}،؛؟]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function tokenize(s: any) {
  const t = normalizeText(s);
  return t.length ? t.split(" ") : [];
}

const DAY_UNITS = new Set(["يوم", "يوما", "ايام", "day", "days", "اسبوع", "اسابيع", "week", "weeks", "شهر", "اشهر", "month", "months", "سنة", "سنه", "سنوات", "year", "years", "ساعة", "ساعات", "hour", "hours"]);
const MONEY_UNITS = new Set(["ريال", "ريالا", "ريالات", "درهم", "دولار", "يورو", "usd", "eur", "sar", "qar", "bhd", "kwd", "aed"]);
const UNIT_WORDS = new Set([...DAY_UNITS, ...MONEY_UNITS, "%", "نسبة", "بالمية", "بالمئة", "بالمائة", "percent"]);
const BINDING_WORDS = new Set(["من", "في", "على", "الى", "إلى", "عن", "لـ", "لا", "يقل", "يزيد", "اقل", "اكثر", "الاقل", "الاكثر", "of", "to", "for", "per", "each", "within"]);

/** Numbers paired with the unit that follows and the subject that precedes — the pairing IS the meaning. */
export function numberPairs(text: any) {
  const toks = tokenize(text);
  const pairs: any[] = [];
  for (let i = 0; i < toks.length; i++) {
    const m = /^(\d+(?:\.\d+)?)(%?)$/.exec(toks[i]);
    if (!m) continue;
    const number = m[1];
    const next = toks[i + 1] || null;
    let unit = m[2] || null;
    if (!unit && next && UNIT_WORDS.has(next)) unit = next;
    const prev = [];
    for (let j = i - 1; j >= 0 && prev.length < 2; j--) {
      const t = toks[j];
      if (/^\d/.test(t) || UNIT_WORDS.has(t) || BINDING_WORDS.has(t)) continue;
      prev.unshift(t);
    }
    pairs.push({ number, unit, subject: prev.join(" ") });
  }
  return pairs;
}

const DATE_RE = /\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g;
export const datesIn = (text: any) => (normalizeText(text).match(DATE_RE) || []).map((d) => d.replace(/[/.]/g, "-")).sort();

const NEGATIONS_AR = new Set(["لا", "ليس", "ليست", "غير", "لم", "لن", "عدم", "دون", "بدون", "الا", "إلا", "باستثناء", "عدا", "يحظر", "يمنع", "ممنوع", "محظور"]);
const NEGATIONS_EN = new Set(["not", "no", "never", "without", "except", "unless", "none", "neither", "nor", "cannot", "prohibited", "excluding"]);
export function negationsIn(text: any) {
  const out: string[] = [];
  for (const raw of tokenize(text)) {
    if (NEGATIONS_EN.has(raw) || NEGATIONS_AR.has(raw)) { out.push(raw); continue; }
    if (/^[وفبل]/.test(raw) && raw.length > 2) {
      const rest = raw.slice(1);
      if (NEGATIONS_AR.has(rest)) out.push(rest);
      else if (/^[وفبل]/.test(rest) && NEGATIONS_AR.has(rest.slice(1))) out.push(rest.slice(1));
    }
  }
  return out.sort();
}

const STRONG = new Set(["يجب", "يتعين", "يلزم", "يتحتم", "يلتزم", "must", "shall", "required", "mandatory"]);
const PERMISSIVE = new Set(["يجوز", "يمكن", "may", "allowed", "optional", "اختياري", "مرخص"]);
/** Obligation strength = strong words minus permissive words. A move either way is material. */
export function modalityStrength(text: any) {
  let score = 0;
  for (const t of tokenize(text)) {
    if (STRONG.has(t)) score += 1;
    if (PERMISSIVE.has(t)) score -= 1;
  }
  return score;
}

const SCOPE_PHRASES: Array<{ code: string; re: RegExp }> = [
  { code: "all", re: /\b(كل|جميع|كافة|الكل|every|all)\b/ },
  { code: "some", re: /\b(بعض|عددا|عددا من|several|some|certain|a number of)\b/ },
  { code: "floor", re: /(لا يقل عن|بما لا يقل عن|على الاقل|كحد ادنى|at least|no less than|not less than)/ },
  { code: "ceiling", re: /(لا يزيد عن|بما لا يزيد عن|على الاكثر|بحد اقصى|at most|no more than|not more than|up to)/ },
];
export function scopeMarkers(text: any) {
  const t = normalizeText(text);
  return SCOPE_PHRASES.filter((p) => p.re.test(t)).map((p) => p.code).sort();
}

const REFERENCE_RE = /(نظام|قانون|لائحة|مادة|مرسوم|قرار|تعميم|دستور|اتفاقية|معيار|article|law|regulation|clause|decree|resolution|policy|standard)\s+([^ ]+(?: [^ ]+)?)/g;
export function referencesIn(text: any) {
  const t = normalizeText(text);
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = REFERENCE_RE.exec(t)) !== null) out.push(`${m[1]} ${m[2]}`.trim());
  return out.sort();
}

/** Multiset difference of two string lists (what is only in `after` / only in `before`). */
export function listDiff(before: string[], after: string[]) {
  const count = new Map<string, number>();
  for (const x of before) count.set(x, (count.get(x) || 0) + 1);
  const added: string[] = [];
  for (const x of after) {
    const c = count.get(x) || 0;
    if (c > 0) count.set(x, c - 1); else added.push(x);
  }
  const removed: string[] = [];
  for (const [x, c] of count) for (let i = 0; i < c; i++) removed.push(x);
  return { added, removed };
}

const material = (code: string, extra: any = {}) => ({ code, material: true, label: MATERIAL_FINDING_LABELS[code], ...extra });

/** Pair findings: amount, unit and value-subject movement — the three a multiset comparison misses. */
export function pairFindings(before: any, after: any) {
  const B = numberPairs(before), A = numberPairs(after);
  const findings: any[] = [];
  if (!B.length && !A.length) return findings;

  const amounts = listDiff(B.map((p) => `${p.number}${p.unit || ""}`), A.map((p) => `${p.number}${p.unit || ""}`));
  if (amounts.added.length || amounts.removed.length) {
    findings.push(material("amount_changed", { before: amounts.removed, after: amounts.added }));
  }

  // Same numbers, different unit — «٣٠ يومًا» → «٣٠ أسبوعًا».
  const unitMoved = B.some((b) => A.some((a) => a.number === b.number && (a.unit || null) !== (b.unit || null)
    && (!b.unit || !a.unit || a.subject === b.subject || UNIT_WORDS.has(a.unit) || UNIT_WORDS.has(b.unit))));
  if (unitMoved) {
    findings.push(material("unit_changed", {
      before: B.map((p) => `${p.subject ? p.subject + " " : ""}${p.number}${p.unit ? " " + p.unit : ""}`),
      after: A.map((p) => `${p.subject ? p.subject + " " : ""}${p.number}${p.unit ? " " + p.unit : ""}`),
    }));
  }

  // Same numbers and units, but attached to different subjects — a swap.
  const key = (p: any) => `${p.subject}#${p.number}${p.unit || ""}`;
  const kB = B.map(key).sort(), kA = A.map(key).sort();
  if (!findings.length && kB.join("|") !== kA.join("|") && kB.length === kA.length) {
    findings.push(material("value_subject_swap", { before: kB, after: kA }));
  }
  return findings;
}

export const TEXT_ADDED = (before: any, after: any) => !String(before ?? "").trim() && !!String(after ?? "").trim();

/**
 * scanText — the ONE materiality verdict over a pair of texts.
 * verdict: none (identical) · wording_only (nothing material moved) · material_change.
 */
export function scanText(before: any, after: any) {
  const b = String(before ?? ""), a = String(after ?? "");
  const findings: any[] = [];

  if (normalizeText(b) === normalizeText(a)) {
    return { contract_version: MATERIAL_CHANGE_VERSION, verdict: "none", material: false, findings: [], codes: [], before: b, after: a };
  }

  findings.push(...pairFindings(b, a));

  const dates = listDiff(datesIn(b), datesIn(a));
  if (dates.added.length || dates.removed.length) findings.push(material("date_changed", { before: dates.removed, after: dates.added }));

  const neg = listDiff(negationsIn(b), negationsIn(a));
  if (neg.added.length) findings.push(material("negation_added", { after: neg.added }));
  if (neg.removed.length) findings.push(material("negation_removed", { before: neg.removed }));

  const sb = modalityStrength(b), sa = modalityStrength(a);
  if (sa > sb) findings.push(material("modality_strengthened", { before: sb, after: sa }));
  if (sa < sb) findings.push(material("modality_weakened", { before: sb, after: sa }));

  const scope = listDiff(scopeMarkers(b), scopeMarkers(a));
  if (scope.added.length || scope.removed.length) findings.push(material("scope_changed", { before: scope.removed, after: scope.added }));

  const refs = listDiff(referencesIn(b), referencesIn(a));
  if (refs.added.length || refs.removed.length) findings.push(material("reference_changed", { before: refs.removed, after: refs.added }));

  if (TEXT_ADDED(b, a)) findings.push(material("text_added"));
  else if (TEXT_ADDED(a, b)) findings.push(material("text_removed"));

  if (!findings.length) {
    findings.push({ code: "wording_changed", material: false, label: MATERIAL_FINDING_LABELS.wording_changed });
  }

  const isMaterial = findings.some((f) => f.material);
  return {
    contract_version: MATERIAL_CHANGE_VERSION,
    verdict: isMaterial ? "material_change" : "wording_only",
    material: isMaterial,
    material_count: findings.filter((f) => f.material).length,
    findings,
    codes: findings.map((f) => f.code).sort(),
    before: b, after: a,
  };
}

/**
 * scanProposal — the same scan per changed field AND once over the whole voted text joined, because a
 * value MOVED BETWEEN fields (a deadline emptied into the proposal text) is a material change no
 * per-field comparison can see.
 */
export function scanProposal({ before, after, fields }: any) {
  const keys: string[] = Array.isArray(fields) && fields.length ? fields : Object.keys(after || before || {});
  const perField = keys
    .filter((k) => String(before?.[k] ?? "") !== String(after?.[k] ?? ""))
    .map((k) => ({ field: k, ...scanText(before?.[k], after?.[k]) }));
  const join = (o: any) => keys.map((k) => String(o?.[k] ?? "")).join("\n");
  const whole = scanText(join(before || {}), join(after || {}));
  const crossField = whole.findings.filter((f) => f.material).map((f) => ({ field: "__cross_field__", code: f.code, label: f.label }));
  const materialCount = perField.reduce((n, f) => n + f.findings.filter((x: any) => x.material).length, 0) + crossField.length;
  return {
    contract_version: MATERIAL_CHANGE_VERSION,
    fields: perField,
    cross_field_findings: crossField,
    material: materialCount > 0,
    material_count: materialCount,
    codes: [...perField.flatMap((f) => f.findings.map((x: any) => x.code)), ...crossField.map((f) => f.code)].sort(),
  };
}

/** Compact codes for storage on a round record (no prose): `field:code+code`. */
export function summarizeScan(scan: any) {
  const perField = (scan?.fields || []).map((f: any) => `${f.field}:${f.findings.map((x: any) => x.code).join("+")}`);
  const cross = (scan?.cross_field_findings || []).map((f: any) => `__cross_field__:${f.code}`);
  return [...perField, ...cross];
}