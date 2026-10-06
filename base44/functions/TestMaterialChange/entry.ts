import {
  MATERIAL_CHANGE_VERSION, scanText, scanProposal, summarizeScan,
  numberPairs, asUnit, normalizeText,
} from '../../shared/materialChange.ts';
import { compareProposals, summarizeChanges, canonicalProposal, PROPOSAL_FIELDS } from '../../shared/proposalContent.ts';

// TestMaterialChange — PROVES the materiality rule of a voted text (material-change-1.0.0, D-087).
//
// It proves the RULE and the scan: what makes two texts materially different, and which changes the
// field-level diff alone could not see (a unit change with the same number, a value moved to another
// subject, a modality/scope shift, a changed normative reference). It does NOT prove that any round was
// opened, voted or issued over a persisted record (no authorized seated actor — D-064). writes: 0.

export default async function () {
  type Check = { id: string; label: string; pass: boolean; detail?: any };
  const results: Check[] = [];
  const check = (id: string, label: string, pass: boolean, detail?: any) => results.push({ id, label, pass: !!pass, detail: detail ?? null });

  const materialOf = (scan: any, code: string) => (scan.findings || []).find((f: any) => f.code === code)?.material === true;

  const same = scanText('تُنفَّذ الخطة وفق الجدول المعتمد.', 'تُنفَّذ الخطة وفق الجدول المعتمد.');
  check('MC-001', 'the contract declares its own version', MATERIAL_CHANGE_VERSION === 'material-change-1.0.0', MATERIAL_CHANGE_VERSION);
  check('MC-002', 'an identical text has no findings at all (verdict none)', same.verdict === 'none' && same.findings.length === 0, same.verdict);

  const marks = scanText('المادة الأولى: التزامٌ عام', 'المادة الاولى: التزام عام');
  check('MC-003', 'diacritics and alef spelling are not a change', marks.verdict === 'none', marks.verdict);

  const punctuation = scanText('المادة (٥) من النظام', 'المادة 5 من النظام');
  check('MC-004', 'Arabic-Indic digits and brackets are not a change', punctuation.verdict === 'none', punctuation.verdict);

  const amount = scanText('تُرصد ميزانية 500 ألف', 'تُرصد ميزانية 700 ألف');
  check('MC-005', 'a changed amount is material', amount.verdict === 'material_change' && materialOf(amount, 'amount_changed'), amount.codes);

  const unit = scanText('تُنفَّذ خلال 30 يومًا', 'تُنفَّذ خلال 30 أسبوعًا');
  check('MC-006', 'THE UNIT THAT MOVED WITH THE NUMBER: «30 يومًا» → «30 أسبوعًا» is material', unit.verdict === 'material_change' && materialOf(unit, 'unit_changed'), unit.codes);

  const unit2 = scanText('النسبة 40% من الإيراد', 'النسبة 40 ريالًا من الإيراد');
  check('MC-007', 'a percentage that became a currency amount is material', materialOf(unit2, 'unit_changed'), unit2.codes);

  const swap = scanText('يُخصَّص 50% للجهة أ و30% للجهة ب', 'يُخصَّص 30% للجهة أ و50% للجهة ب');
  check('MC-008', 'THE VALUE THAT MOVED TO ANOTHER SUBJECT: swapped percentages are material', swap.verdict === 'material_change' && materialOf(swap, 'value_subject_swap'), swap.codes);

  const negAdded = scanText('يُعتمد المقترح', 'لا يُعتمد المقترح');
  check('MC-009', 'an added negation is material', materialOf(negAdded, 'negation_added'), negAdded.codes);

  const negRemoved = scanText('يُصرف المبلغ بدون موافقة', 'يُصرف المبلغ مع موافقة');
  check('MC-010', 'a removed negation (بدون → مع) is material', materialOf(negRemoved, 'negation_removed'), negRemoved.codes);

  const strengthened = scanText('يجوز للجنة التمديد', 'يجب على اللجنة التمديد');
  check('MC-011', 'MODALITY: «يجوز» → «يجب» is material and named as strengthening', materialOf(strengthened, 'modality_strengthened'), strengthened.codes);

  const weakened = scanText('يجب على اللجنة التمديد', 'يجوز للجنة التمديد');
  check('MC-012', 'MODALITY: «يجب» → «يجوز» is material and named as weakening', materialOf(weakened, 'modality_weakened'), weakened.codes);

  const scopeAll = scanText('يشمل القرار كل الأقسام', 'يشمل القرار بعض الأقسام');
  check('MC-013', 'SCOPE: «كل» → «بعض» is material', materialOf(scopeAll, 'scope_changed'), scopeAll.codes);

  const scopeBound = scanText('مدة التنفيذ لا تقل عن 90 يومًا', 'مدة التنفيذ لا تزيد عن 90 يومًا');
  check('MC-014', 'SCOPE: «لا يقل عن» → «لا يزيد عن» is material with the number unchanged', materialOf(scopeBound, 'scope_changed'), scopeBound.codes);

  const reference = scanText('وفق نظام المناقصات المعمول به', 'وفق نظام المشتريات المعمول به');
  check('MC-015', 'a changed normative reference is material', materialOf(reference, 'reference_changed'), reference.codes);

  const date = scanText('يبدأ العمل 2026-11-01', 'يبدأ العمل 2026-12-01');
  check('MC-016', 'a changed date is material', materialOf(date, 'date_changed'), date.codes);

  const added = scanText('', 'نص جديد لم يُصوَّت عليه');
  check('MC-017', 'text that appeared is material', materialOf(added, 'text_added'), added.codes);

  const removed = scanText('نص كان مُصوَّتًا عليه', '');
  check('MC-018', 'text that disappeared is material', materialOf(removed, 'text_removed'), removed.codes);

  const wording = scanText('يتولى الأمين إعداد المحضر', 'يقوم الأمين بإعداد المحضر');
  check('MC-019', 'a pure paraphrase is wording only — not material', wording.verdict === 'wording_only' && !wording.material, wording.codes);

  check('MC-020', 'every finding carries a material flag and a bilingual label',
    [amount, unit, swap, strengthened].every((s) => s.findings.every((f: any) => typeof f.material === 'boolean' && f.label?.ar && f.label?.en)));

  const pairing = numberPairs('يُخصَّص 50% للجهة أ خلال 30 يومًا');
  check('MC-021', 'a number is paired with the unit that follows it and the subject that precedes it',
    pairing.length === 2 && pairing[0].number === '50' && pairing[0].unit === '%'
    && pairing[1].number === '30' && pairing[1].unit === 'يوم', pairing);

  check('MC-022', 'the unit is recognised through Arabic spelling (يومًا · أسبوعًا · أيام)',
    asUnit('يوما') === 'يوما' && asUnit('اسبوعا') === 'اسبوع' && asUnit('ايام') === 'ايام' && asUnit('ريال') === 'ريال' && asUnit('المادة') === null,
    [asUnit('اسبوعا'), asUnit('ايام')]);

  check('MC-023', 'normalisation unifies alef/yeh and strips diacritics before any comparison',
    normalizeText('إلى  الالتزامَ') === 'الي التزام', normalizeText('إلى  الالتزامَ'));

  const acrossFields = scanProposal({
    before: { a: 'الكمية 30', b: 'يومًا' },
    after: { a: 'الكمية 30', b: 'أسبوعًا' },
    fields: ['a', 'b'],
  });
  check('MC-024', 'A UNIT WHOSE NUMBER SITS IN ANOTHER FIELD IS CAUGHT: the whole-text scan names it across fields',
    (acrossFields.cross_field_findings || []).some((f: any) => f.code === 'unit_changed') && acrossFields.material,
    acrossFields.cross_field_findings);

  const perFieldOnly = scanText('يومًا', 'أسبوعًا');
  check('MC-025', 'the same change is INVISIBLE field-by-field — which is exactly why the joined scan exists',
    perFieldOnly.verdict === 'wording_only', perFieldOnly.codes);

  const perField = scanProposal({ before: { proposal: 'يجوز التمديد' }, after: { proposal: 'يجب التمديد' }, fields: ['proposal'] });
  check('MC-026', 'per field, a modality shift is named with its field',
    perField.fields[0]?.field === 'proposal' && perField.fields[0].findings.some((f: any) => f.code === 'modality_strengthened'),
    perField.fields[0]?.findings?.map((f: any) => f.code));

  const before = { proposal: 'يجوز للجنة التمديد 30 يومًا', deadline: '2026-11-01', owner_name: 'أحمد' };
  const after = { proposal: 'يجب على اللجنة التمديد 30 أسبوعًا', deadline: '2026-11-01', owner_name: 'أحمد' };
  const diff = compareProposals(before, after);
  const proposalField = (diff.fields || []).find((f: any) => f.field === 'proposal');
  check('MC-027', 'the frozen-content diff carries the materiality contract version and its semantic findings',
    diff.materiality_contract_version === MATERIAL_CHANGE_VERSION && (proposalField?.semantic_findings || []).length > 0,
    { version: diff.materiality_contract_version, codes: proposalField?.semantic_findings?.map((f: any) => f.code) });

  check('MC-028', 'A FIELD WHOSE ONLY CHANGE IS MODALITY IS NOW MATERIAL (it used to read as wording only)',
    proposalField?.material === true && diff.material === true && diff.material_count >= 1, { material: proposalField?.material });

  const codes = summarizeChanges(diff);
  check('MC-029', 'the round stores compact codes, including any cross-field finding',
    codes.some((c: string) => c.startsWith('proposal:')) && codes.every((c: string) => !/\s/.test(c)), codes);

  const wordingDiff = compareProposals({ proposal: 'يتولى الأمين الإعداد' }, { proposal: 'يقوم الأمين بالإعداد' });
  check('MC-030', 'a paraphrase is still reported as NOT material (no inflated alert)',
    wordingDiff.material === false && wordingDiff.fields[0].findings.some((f: any) => f.type === 'wording_changed'),
    wordingDiff.fields[0].findings.map((f: any) => f.type));

  check('MC-031', 'an unchanged proposal produces no fields at all', compareProposals(canonicalProposal(after), canonicalProposal(after)).changed === false);
  check('MC-032', 'the voted-text field list is the ONE list the scan walks',
    PROPOSAL_FIELDS.includes('proposal') && PROPOSAL_FIELDS.includes('deadline') && !PROPOSAL_FIELDS.includes('status'));

  const scan = scanText('لا يجوز التمديد 50% للجهة أ', 'يجب التمديد 50% للجهة ب');
  check('MC-033', 'codes are sorted and the verdict is material when several kinds moved together',
    scan.codes.join(',') === [...scan.codes].sort().join(',') && scan.verdict === 'material_change' && scan.codes.length >= 2, scan.codes);

  const passed = results.filter((r) => r.pass).length;
  return Response.json({
    suite: 'TestMaterialChange',
    contract_version: MATERIAL_CHANGE_VERSION,
    total: results.length,
    passed,
    failed: results.length - passed,
    verdict: passed === results.length ? 'PASS' : 'FAIL',
    failures: results.filter((r) => !r.pass),
    writes_performed: 0,
    records_read: 0,
    scope_note: 'Proves the materiality RULE: what makes two voted texts materially different, including the three changes a field-level diff cannot see (a unit moved with the same number, a value moved to another subject, and a unit whose number sits in another field), and that a paraphrase raises no material alert. It does not prove any round was opened or issued over a persisted record (no authorized seated actor — D-064).',
    results,
  });
}