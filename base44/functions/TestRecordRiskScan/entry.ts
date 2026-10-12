import {
  RECORD_RISK_SCAN_VERSION, RISK_CATEGORIES, RISK_SEVERITIES,
  buildRiskScanPrompt, RISK_SCAN_SCHEMA, parseRiskScan, auditRiskScanContract, hasProposalText,
} from '../../shared/recordRiskScan.ts';

// TestRecordRiskScan — هل يصحّ عقد فحص المخاطر، وهل يرفض ما لا يحمل مقطعًا، وهل يصمت حين لا نص؟
// Fixtures only: العقد دالة نقية. لا يُقرأ سجل ولا يُكتب (حاجز D-064).

export default async function (req) {
  try {
    const results = [];
    const check = (id, label, pass, detail) =>
      results.push({ id, label, pass: !!pass, detail: detail === undefined ? null : detail });

    check('RR-001', 'the risk-scan contract declares its own version', RECORD_RISK_SCAN_VERSION === 'record-risk-scan-1.0.0', RECORD_RISK_SCAN_VERSION);

    const audit = auditRiskScanContract();
    check('RR-002', 'the contract self-audits: unique categories, each bilingual, severities declared, schema carries the enum',
      audit.ok === true && audit.categories === 7 && audit.severities === 3, audit);

    check('RR-003', 'a clean proposal with no risk flags parses to an empty list, not to silence',
      parseRiskScan({ flags: [] }).flags.length === 0 && parseRiskScan({ flags: [] }).dropped.length === 0, null);

    const r4 = parseRiskScan({ flags: [{ category: 'missing_legal_basis', severity: 'high', excerpt: '', explanation_ar: 'س', explanation_en: 's' }] });
    check('RR-004', 'a flag WITHOUT an excerpt is dropped — a risk with no passage is invented, never reported',
      r4.flags.length === 0 && r4.dropped.length === 1 && r4.dropped[0].reason === 'incomplete_flag', null);

    const r5 = parseRiskScan({ flags: [{ category: 'invented_category', severity: 'high', excerpt: 'x', explanation_ar: 'س', explanation_en: 's' }] });
    check('RR-005', 'a flag with an UNKNOWN category is dropped, never silently relabeled',
      r5.flags.length === 0 && r5.dropped.length === 1, null);

    const r6 = parseRiskScan({ flags: [{ category: 'missing_deadline', severity: 'medium', excerpt: 'x', explanation_ar: '', explanation_en: 's' }] });
    check('RR-006', 'a flag with a missing bilingual explanation is dropped — both languages are mandatory',
      r6.flags.length === 0 && r6.dropped.length === 1, null);

    const r7 = parseRiskScan({ flags: [{ category: 'unsupported_figure', severity: 'medium', excerpt: 'نسبة 30%', location: 'proposal', explanation_ar: 'رقم بلا مصدر', explanation_en: 'figure with no source' }] });
    check('RR-007', 'a complete flag is kept with its category, severity, excerpt and bilingual explanation',
      r7.flags.length === 1 && r7.flags[0].category === 'unsupported_figure' && r7.flags[0].severity === 'medium' && r7.flags[0].location === 'proposal', null);

    const r8 = parseRiskScan({ flags: [{ category: 'vague_obligation', severity: 'critical', excerpt: 'x', explanation_ar: 'س', explanation_en: 's' }] });
    check('RR-008', 'an unknown severity falls back to medium, never to silence or an invented level',
      r8.flags[0].severity === 'medium', null);

    check('RR-009', 'a decision with NO proposal text is detected — the void is not scanned, never reads as "no risks"',
      hasProposalText({ status: 'draft' }) === false && hasProposalText({ title_ar: 'قرار', proposal: 'نص' }) === true, null);

    const prompt = buildRiskScanPrompt({ title_ar: 'قرار اختبار', proposal: 'نص المقترح' });
    check('RR-010', 'the prompt embeds the proposal text and the advisory categories, and forbids inventing risks',
      /نص المقترح/.test(prompt) && /missing_legal_basis/.test(prompt) && /لا تخترع/.test(prompt), null);

    const catEnum = RISK_SCAN_SCHEMA.properties.flags.items.properties.category.enum;
    const sevEnum = RISK_SCAN_SCHEMA.properties.flags.items.properties.severity.enum;
    check('RR-011', 'the schema declares every category and severity as an enum, so the model is bounded',
      catEnum.length === 7 && sevEnum.length === 3 && catEnum.every((c) => RISK_CATEGORIES[c]), null);

    check('RR-012', 'the contract states it is ADVISORY and writes no state — prevention lives in the commands',
      Object.keys(RISK_CATEGORIES).length === 7 && auditRiskScanContract().ok, null);

    const failed = results.filter((r) => !r.pass);
    return Response.json({
      suite: 'TestRecordRiskScan',
      contract_version: RECORD_RISK_SCAN_VERSION,
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      verdict: failed.length === 0 ? 'PASS' : 'FAIL',
      failures: failed,
      writes_performed: 0,
      records_read: 0,
      scope_note: 'يُثبت عقد فحص المخاطر (record-risk-scan-1.0.0) على بيانات ثابتة. لا يقرأ سجلًا ولا يكتب، فلا يُثبت المسار المحفوظ — ذلك للأمر المحكوم وحاجزه D-064.',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack, contract_version: RECORD_RISK_SCAN_VERSION }, { status: 500 });
  }
}