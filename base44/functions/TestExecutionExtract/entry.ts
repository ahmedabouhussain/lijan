import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  EXTRACT_VERSION, EXTRACT_SCOPE, EXTRACT_SECTIONS, EXTRACT_SECTION_KEYS, ALWAYS_INCLUDED_SECTIONS,
  EXCLUDED_BY_CONTRACT, GRANT_STATES, ACKNOWLEDGEMENT_SEMANTICS, QUESTION_CATEGORIES,
  QUESTION_CATEGORY_KEYS, MAX_OPEN_QUESTIONS, MAX_QUESTION_LENGTH, MAX_ANSWER_LENGTH,
  DEFAULT_EXTRACT_DAYS, MAX_EXTRACT_DAYS, assessGrant, stateAfterOpen, buildActionExtract,
  assessAcknowledgement, assessQuestion, assessAnswer, deriveWindow, resolveSections,
} from '../../shared/executionExtract.ts';

// TestExecutionExtract — the frozen CONTRACT suite for execution-extract-1.0.0.
//
// It proves the contract consumed by ShareActionExtract, ListActionExtracts, GetActionExtractView,
// RespondToActionExtract and AnswerActionClarification: what MAY travel to a party outside the
// committee, what may NOT, how the four delivery facts stay apart, and that an acknowledgement is a
// receipt rather than an approval. It exercises no handler, reads no record and writes nothing
// (`writes_performed: 0`). A persisted link, a real acknowledgement on a live obligation and browser
// behaviour are NOT TESTED here — the blocker is unchanged: no authorized seated actor (D-064).
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases: any[] = [];
  const check = (id: string, label: string, pass: boolean, detail: any = null) => {
    cases.push({ test_id: id, label, verdict: pass ? 'PASS' : 'FAIL', detail });
  };

  const ACTION = {
    id: 'ACT-X1', committee_id: 'COM-X', organization_id: 'ORG-X',
    title: 'تركيب أنظمة المراقبة', title_en: 'Install the monitoring systems',
    title_ar: 'تركيب أنظمة المراقبة',
    required_evidence: 'محضر التسليم الموقّع', required_evidence_en: 'Signed handover report',
    deadline: '2026-11-30', priority: 'high', status: 'evidence_pending',
    progress_percent: 60, blocker: 'بانتظار موافقة الجهة',
    owner_name: 'شركة التنفيذ الوطنية', owner_name_en: 'National Execution Co.',
    responsible_department: 'إدارة المشاريع', evidence_revision: 2,
    evidence_submitted_at: '2026-10-04T09:00:00Z', evidence_url: 'https://evidence.example/revision-2',
    evidence_notes: 'النسخة الثانية بعد التعديل', verification_state: 'returned',
    return_reason: 'ينقص توقيع الجهة المستلمة', evidence_returned_at: '2026-10-05T10:00:00Z',
    verified_at: null, verified_by_name: 'أمين اللجنة', verified_by_user_id: 'USR-9',
    closed_at: null, owner_user_id: 'USR-7', escalation_level: 'owner_secretary',
    escalation_notice_state: 'delivered', reminder_count: 3,
    correlation_id: 'corr_abc', data_origin: 'operational', is_demo_data: false,
  };
  const DECISION = { id: 'DEC-1', decision_number: '2026/17', title_ar: 'قرار التنفيذ', title_en: 'Execution decision', issued_at: '2026-09-01T08:00:00Z' };
  const COMMITTEE = { id: 'COM-X', name_ar: 'لجنة التنفيذ', name_en: 'Execution Committee', organization_id: 'ORG-X' };
  const ORG = { id: 'ORG-X', name_ar: 'الجهة الحاضنة', name_en: 'Custodian Body' };
  const grantOf = (extra: any = {}) => ({
    id: 'GRT-1', access_token: 'tok_abc', access_scope: EXTRACT_SCOPE,
    status: 'sent', valid_from: '2026-10-06T00:00:00Z', expires_at: '2026-10-20T00:00:00Z',
    recipient_name: 'شركة التنفيذ الوطنية', recipient_organization: 'قطاع المقاولات',
    permitted_sections: [...EXTRACT_SECTION_KEYS], ...extra,
  });
  const shape = (grant: any = grantOf()) => buildActionExtract({ action: ACTION, decision: DECISION, committee: COMMITTEE, organization: ORG, grant });
  const text = (obj: any) => JSON.stringify(obj);

  // ── The contract itself ─────────────────────────────────────────────────────
  check('EX-001', 'the contract declares its own version', EXTRACT_VERSION === 'execution-extract-1.0.0', EXTRACT_VERSION);
  check('EX-002', 'every section carries a bilingual label',
    EXTRACT_SECTION_KEYS.every((k) => !!EXTRACT_SECTIONS[k]?.ar && !!EXTRACT_SECTIONS[k]?.en), EXTRACT_SECTION_KEYS);

  const subset = resolveSections(['progress']);
  check('EX-003', 'the obligation and the questions are always included, whatever is asked for',
    subset.ok === true && ALWAYS_INCLUDED_SECTIONS.every((s) => subset.sections.includes(s)), subset.sections);

  const bad = resolveSections(['obligation', 'internal_notes']);
  check('EX-004', 'a requested section outside the contract is REFUSED, never dropped quietly',
    bad.ok === false && bad.code === 'section_unknown', { code: bad.code, section: bad.section });

  const exact = resolveSections(['requirement', 'verdict']);
  check('EX-005', 'a permitted request is honoured exactly',
    exact.ok === true && ['requirement', 'verdict', 'obligation', 'questions'].every((s) => exact.sections.includes(s)), exact.sections);

  const full = shape();
  check('EX-006', 'the extract carries only sections the contract names',
    full.sections_withheld.length === 0 && Object.keys(full.extract).every((k) => EXTRACT_SECTION_KEYS.includes(k)),
    Object.keys(full.extract));

  const shapeText = text(full.extract);
  check('EX-007', 'the VERIFIER IDENTITY never travels to the receiving party',
    !shapeText.includes('أمين اللجنة') && !shapeText.includes('verified_by_name') && !shapeText.includes('USR-9'),
    { verdict: full.extract.verdict });

  check('EX-008', 'internal identifiers and provenance never travel',
    !shapeText.includes('USR-7') && !shapeText.includes('corr_abc') && !shapeText.includes('data_origin')
    && !shapeText.includes('is_demo_data') && !shapeText.includes('owner_secretary') && !shapeText.includes('reminder_count'),
    { owner_user_id_leaked: shapeText.includes('USR-7'), provenance_leaked: shapeText.includes('data_origin') });

  check('EX-009', 'the exclusion boundary is stated as data, bilingually',
    EXCLUDED_BY_CONTRACT.length >= 8 && EXCLUDED_BY_CONTRACT.every((r) => !!r.key && !!r.ar && !!r.en),
    EXCLUDED_BY_CONTRACT.map((r) => r.key));

  const narrow = shape(grantOf({ permitted_sections: ['obligation', 'progress'] }));
  check('EX-010', 'what was withheld is REPORTED, so the boundary is visible rather than implied',
    narrow.sections_withheld.length > 0 && narrow.sections_included.length === 2
    && narrow.sections_withheld.includes('verdict') && narrow.withheld_field_count >= 8,
    { withheld: narrow.sections_withheld, count: narrow.withheld_field_count });

  check('EX-011', 'the grant carries the five delivery states and nothing else',
    GRANT_STATES.length === 5 && GRANT_STATES.includes('acknowledged'), GRANT_STATES);

  // ── The token's own verdict ────────────────────────────────────────────────
  const unknown = assessGrant({ grant: null });
  check('EX-012', 'an unknown token is refused as unknown', unknown.ok === false && unknown.code === 'token_unknown' && unknown.status === 404, unknown.code);

  const revoked = assessGrant({ grant: grantOf({ status: 'revoked' }) });
  check('EX-013', 'a revoked link is dead, and says so', revoked.ok === false && revoked.code === 'revoked' && revoked.status === 410, revoked.code);

  const expired = assessGrant({ grant: grantOf({ expires_at: '2026-10-06T00:00:00Z' }), at: '2026-10-06T00:00:00Z' });
  check('EX-014', 'an expired link is dead from the expiry instant itself', expired.ok === false && expired.code === 'expired' && expired.status === 410, expired.code);

  const early = assessGrant({ grant: grantOf({ valid_from: '2026-10-10T00:00:00Z' }), at: '2026-10-06T00:00:00Z' });
  check('EX-015', 'a link that has not opened yet is refused as not yet valid', early.ok === false && early.code === 'not_yet_valid', early.code);

  const live = assessGrant({ grant: grantOf(), at: '2026-10-08T00:00:00Z' });
  check('EX-016', 'a live link is usable and reports its own state',
    live.ok === true && live.state === 'sent' && live.acknowledged === false && live.opened === false && live.accepts_acts === true, live.state);

  check('EX-017', 'opening moves sent to opened, and never moves a later state back',
    stateAfterOpen({ status: 'sent' }) === 'opened'
    && stateAfterOpen({ status: 'acknowledged' }) === 'acknowledged'
    && stateAfterOpen({ status: 'opened' }) === 'opened', null);

  // ── Acknowledgement is a receipt ───────────────────────────────────────────
  const nameless = assessAcknowledgement({ grant: grantOf(), name: '   ' });
  check('EX-018', 'an acknowledgement must state who acknowledges', nameless.ok === false && nameless.code === 'acknowledgement_name_required', nameless.code);

  const again = assessAcknowledgement({ grant: grantOf({ status: 'acknowledged', acknowledged_at: '2026-10-07T00:00:00Z' }), name: 'شركة التنفيذ' });
  check('EX-019', 'a second acknowledgement is an idempotent answer, never a second act',
    again.ok === true && again.idempotent === true && again.effect === 'already_recorded', again.effect);

  check('EX-020', 'acknowledgement states plainly what it is NOT',
    ACKNOWLEDGEMENT_SEMANTICS.is_receipt === true && ACKNOWLEDGEMENT_SEMANTICS.is_approval === false
    && ACKNOWLEDGEMENT_SEMANTICS.is_completion === false && ACKNOWLEDGEMENT_SEMANTICS.is_verification === false
    && ACKNOWLEDGEMENT_SEMANTICS.moves_obligation === false && ACKNOWLEDGEMENT_SEMANTICS.changes_deadline === false,
    ACKNOWLEDGEMENT_SEMANTICS);

  // ── Questions: a question is a question ────────────────────────────────────
  const empty = assessQuestion({ grant: grantOf(), category: 'scope', question: '  ' });
  check('EX-021', 'an empty question is refused', empty.ok === false && empty.code === 'question_required', empty.code);

  const long = assessQuestion({ grant: grantOf(), category: 'scope', question: 'x'.repeat(MAX_QUESTION_LENGTH + 1) });
  check('EX-022', 'an over-long question is refused against a stated bound', long.ok === false && long.code === 'question_too_long' && long.max === MAX_QUESTION_LENGTH, long.max);

  const weird = assessQuestion({ grant: grantOf(), category: 'not_a_category', question: 'سؤال' });
  check('EX-023', 'an unknown category is refused', weird.ok === false && weird.code === 'question_category_unknown', weird.code);

  const many = assessQuestion({ grant: grantOf(), category: 'other', question: 'سؤال', open_count: MAX_OPEN_QUESTIONS });
  check('EX-024', 'the number of open questions is bounded',
    many.ok === false && many.code === 'question_limit_reached' && many.status === 429 && many.max === MAX_OPEN_QUESTIONS, many.max);

  const ok5 = assessQuestion({ grant: grantOf(), category: 'deadline', question: 'هل يمكن تمديد المهلة؟' });
  check('EX-025', 'a question changes no state and no deadline',
    ok5.ok === true && ok5.changes_state === false && ok5.changes_deadline === false && ok5.category === 'deadline', ok5.category);

  check('EX-026', 'the question vocabulary is bilingual and closed',
    QUESTION_CATEGORY_KEYS.length === 5 && QUESTION_CATEGORY_KEYS.every((k) => !!QUESTION_CATEGORIES[k].ar && !!QUESTION_CATEGORIES[k].en),
    QUESTION_CATEGORY_KEYS);

  const answerEmpty = assessAnswer({ clarification: { id: 'CLR-1', status: 'raised' }, answer: '' });
  const answerTwice = assessAnswer({ clarification: { id: 'CLR-1', status: 'answered' }, answer: 'ردّ' });
  const answerOk = assessAnswer({ clarification: { id: 'CLR-1', status: 'raised' }, answer: 'ردّ كافٍ' });
  check('EX-027', 'answering requires text, and an answered question cannot be answered twice',
    answerEmpty.ok === false && answerEmpty.code === 'answer_required'
    && answerTwice.ok === false && answerTwice.code === 'question_already_answered'
    && answerOk.ok === true && answerOk.status === 'answered', { empty: answerEmpty.code, twice: answerTwice.code });

  const answerLong = assessAnswer({ clarification: { id: 'CLR-1', status: 'raised' }, answer: 'x'.repeat(MAX_ANSWER_LENGTH + 1) });
  check('EX-028', 'an over-long answer is refused against a stated bound', answerLong.ok === false && answerLong.code === 'answer_too_long' && answerLong.max === MAX_ANSWER_LENGTH, answerLong.max);

  // ── The window, and the scope statement ────────────────────────────────────
  check('EX-029', 'the validity window defaults, and is capped at the contract maximum',
    deriveWindow(undefined).days === DEFAULT_EXTRACT_DAYS && deriveWindow(365).days === MAX_EXTRACT_DAYS
    && deriveWindow(365).clamped === true && deriveWindow(7).clamped === false,
    { dflt: deriveWindow(undefined).days, capped: deriveWindow(365).days });

  const nonsense = deriveWindow(-3);
  check('EX-030', 'a nonsensical window is refused rather than guessed', nonsense.ok === false && nonsense.code === 'window_invalid', nonsense.code);

  check('EX-031', 'the extract states its own scope: one obligation, bounded in time',
    full.scope.access_scope === EXTRACT_SCOPE && !!full.scope.expires_at && !!full.recipient?.name
    && full.sections_present_count === Object.keys(full.extract).length,
    full.scope);

  const passed = cases.filter((c) => c.verdict === 'PASS').length;
  const failed = cases.length - passed;
  return Response.json({
    suite: 'TestExecutionExtract',
    contract_version: EXTRACT_VERSION,
    total: cases.length,
    passed,
    failed,
    verdict: failed === 0 ? 'PASS' : 'FAIL',
    failures: cases.filter((c) => c.verdict === 'FAIL'),
    writes_performed: 0,
    records_read: 0,
    scope_note: 'Proves the CONTRACT consumed by ShareActionExtract, ListActionExtracts, GetActionExtractView, RespondToActionExtract and AnswerActionClarification. A persisted link, a real acknowledgement on a live obligation and browser behaviour are NOT TESTED (no authorized seated actor).',
    results: cases,
  });
}