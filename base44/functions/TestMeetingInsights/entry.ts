import {
  MEETING_INSIGHTS_VERSION,
  buildPrepPrompt, PREP_SCHEMA, parsePrepInsights, hasAgendaContent,
  buildSummaryPrompt, SUMMARY_SCHEMA, parsePackSummary,
  auditMeetingInsightsContract,
} from '../../shared/meetingInsights.ts';

// TestMeetingInsights — هل يصحّ عقد التحضير والملخص، وهل يرفض الناقص، وهل يصمت حين لا أجندة/حزمة؟
// Fixtures only: دالة نقية. لا يُقرأ سجل ولا يُكتب (حاجز D-064).

export default async function (req) {
  try {
    const results = [];
    const check = (id, label, pass, detail) =>
      results.push({ id, label, pass: !!pass, detail: detail === undefined ? null : detail });

    check('MI-001', 'the meeting-insights contract declares its own version', MEETING_INSIGHTS_VERSION === 'meeting-insights-1.0.0', MEETING_INSIGHTS_VERSION);
    check('MI-002', 'the contract self-audits its schemas and refusals', auditMeetingInsightsContract().ok === true, auditMeetingInsightsContract());

    // ── التحضير ──
    const prep = parsePrepInsights({ items: [{ agenda_item_id: 'a1', questions: ['سؤال 1', 'سؤال 2'], inconsistencies: ['تناقض'] }], cross_item_inconsistencies: ['بين 1 و2'], deltas_from_last: ['تغيّر'] });
    check('MI-003', 'a complete prep item is kept with its questions and inconsistencies',
      prep.items.length === 1 && prep.items[0].questions.length === 2 && prep.cross_item_inconsistencies.length === 1 && prep.deltas_from_last.length === 1, null);

    const prepBad = parsePrepInsights({ items: [{ agenda_item_id: '', questions: ['x'] }, { agenda_item_id: 'a2', questions: [] }] });
    check('MI-004', 'a prep item without an id or without questions is dropped — questions are the point of prep',
      prepBad.items.length === 0 && prepBad.dropped.length === 2, null);

    check('MI-005', 'prep with no items parses to empty, not to silence',
      parsePrepInsights({ items: [] }).items.length === 0, null);

    check('MI-006', 'hasAgendaContent detects an empty agenda — the void is not prepped',
      hasAgendaContent([]) === false && hasAgendaContent([{ title_ar: 'بند' }]) === true, null);

    const prepPrompt = buildPrepPrompt({ title_ar: 'اجتماع' }, [{ id: 'a1', sequence: 1, title_ar: 'بند الأول', objective_ar: 'هدف' }], null);
    check('MI-007', 'the prep prompt embeds the agenda item and forbids inventing questions',
      /بند الأول/.test(prepPrompt) && /لا تخترع/.test(prepPrompt), null);

    check('MI-008', 'the prep schema bounds the model to items with questions',
      !!PREP_SCHEMA.properties.items.items.properties.questions && PREP_SCHEMA.required.includes('items'), null);

    // ── الملخص ──
    const sum = parsePackSummary({ overview_ar: 'نظرة', overview_en: 'overview', sections: [{ title: 'البند 1', summary_ar: 'ملخص', summary_en: 'summary' }] });
    check('MI-009', 'a complete summary is kept with its bilingual overview and sections',
      sum.overview_ar === 'نظرة' && sum.overview_en === 'overview' && sum.sections.length === 1 && sum.sections[0].summary_en === 'summary', null);

    const sumBad = parsePackSummary({ overview_ar: '', overview_en: '', sections: [{ title: '', summary_ar: 'x', summary_en: 'y' }, { title: 'ok', summary_ar: '', summary_en: 'y' }] });
    check('MI-010', 'a summary section without a title or a bilingual summary is dropped',
      sumBad.sections.length === 0 && sumBad.dropped.length === 2, null);

    const sumPrompt = buildSummaryPrompt({ title_ar: 'اجتماع' }, [{ title_ar: 'بند' }], [{ title_ar: 'قرار', status: 'approved' }], 'حزمة v1');
    check('MI-011', 'the summary prompt embeds the agenda, the decisions and forbids inventing items',
      /بند/.test(sumPrompt) && /قرار/.test(sumPrompt) && /لا تخترع/.test(sumPrompt), null);

    check('MI-012', 'the summary schema bounds the model to bilingual overview and sections',
      !!SUMMARY_SCHEMA.properties.overview_ar && !!SUMMARY_SCHEMA.properties.sections.items.properties.summary_en, null);

    const failed = results.filter((r) => !r.pass);
    return Response.json({
      suite: 'TestMeetingInsights', contract_version: MEETING_INSIGHTS_VERSION,
      total: results.length, passed: results.length - failed.length, failed: failed.length,
      verdict: failed.length === 0 ? 'PASS' : 'FAIL', failures: failed,
      writes_performed: 0, records_read: 0,
      scope_note: 'يُثبت عقد التحضير والملخص (meeting-insights-1.0.0) على بيانات ثابتة. لا يقرأ سجلًا ولا يكتب، فلا يُثبت المسار المحفوظ — ذلك للأمرين وحاجزهما D-064.',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack, contract_version: MEETING_INSIGHTS_VERSION }, { status: 500 });
  }
}