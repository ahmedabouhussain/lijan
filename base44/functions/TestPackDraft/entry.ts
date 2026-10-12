import {
  PACK_DRAFT_VERSION, PACK_DRAFT_REFUSALS,
  buildPackDraftPrompt, PACK_DRAFT_SCHEMA, parsePackDraft, auditPackDraftContract,
} from '../../shared/packDraft.ts';

// TestPackDraft — هل يصحّ عقد تجميع المسودة، وهل يرفض القسم بلا مصدر، وهل يصمت حين لا مصدر؟
// Fixtures only: دالة نقية. لا يُقرأ سجل ولا يُكتب (حاجز D-064).

export default async function (req) {
  try {
    const results = [];
    const check = (id, label, pass, detail) =>
      results.push({ id, label, pass: !!pass, detail: detail === undefined ? null : detail });

    check('PD-001', 'the pack-draft contract declares its own version', PACK_DRAFT_VERSION === 'pack-draft-1.0.0', PACK_DRAFT_VERSION);
    check('PD-002', 'the contract self-audits its schema and refusals', auditPackDraftContract().ok === true, auditPackDraftContract());

    const ok = parsePackDraft({ sections: [{ title: 'تمهيد', body_ar: 'محتوى', source_ref: 'مستند 1' }, { title: 'القرارات', body_ar: 'محتوى 2', source_ref: 'مخطط' }] });
    check('PD-003', 'complete sections with a source_ref are kept',
      ok.sections.length === 2 && ok.sections[0].source_ref === 'مستند 1', null);

    const bad = parsePackDraft({ sections: [{ title: '', body_ar: 'x', source_ref: 'y' }, { title: 'ok', body_ar: '', source_ref: 'y' }, { title: 'ok', body_ar: 'x', source_ref: '' }] });
    check('PD-004', 'a section without a title, body or source_ref is dropped — a section with no source is invented, never reported',
      bad.sections.length === 0 && bad.dropped.length === 3, null);

    check('PD-005', 'no sources refusal is declared — the void is not drafted, never reads as ready',
      !!PACK_DRAFT_REFUSALS.no_sources && !!PACK_DRAFT_REFUSALS.no_sources.ar && !!PACK_DRAFT_REFUSALS.no_sources.en, null);

    const prompt = buildPackDraftPrompt({ title_ar: 'اجتماع' }, [{ title: 'تقرير', document_type: 'report' }], 'مخطط: تمهيد ثم قرارات', [{ title_ar: 'بند' }]);
    check('PD-006', 'the prompt embeds the sources, the outline, the agenda and forbids inventing content',
      /تقرير/.test(prompt) && /مخطط/.test(prompt) && /لا تخترع/.test(prompt), null);

    check('PD-007', 'the schema bounds the model to sections that name their source',
      !!PACK_DRAFT_SCHEMA.properties.sections.items.properties.source_ref && PACK_DRAFT_SCHEMA.required.includes('sections'), null);

    const failed = results.filter((r) => !r.pass);
    return Response.json({
      suite: 'TestPackDraft', contract_version: PACK_DRAFT_VERSION,
      total: results.length, passed: results.length - failed.length, failed: failed.length,
      verdict: failed.length === 0 ? 'PASS' : 'FAIL', failures: failed,
      writes_performed: 0, records_read: 0,
      scope_note: 'يُثبت عقد تجميع المسودة (pack-draft-1.0.0) على بيانات ثابتة. لا يقرأ سجلًا ولا يكتب، فلا يُثبت المسار المحفوظ — ذلك للأمر المحكوم وحاجزه D-064.',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack, contract_version: PACK_DRAFT_VERSION }, { status: 500 });
  }
}