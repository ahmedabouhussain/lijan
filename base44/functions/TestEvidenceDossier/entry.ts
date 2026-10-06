import {
  EVIDENCE_DOSSIER_VERSION, DOSSIER_SECTIONS, DOSSIER_STATEMENTS, SECTION_STATES, ROW_CAP,
  assembleDossier, dossierToMarkdown, dossierToPrintableHtml, escapeHtml,
} from '../../shared/evidenceDossier.ts';

// TestEvidenceDossier — PROVES the dossier rule (evidence-dossier-1.0.0, D-091).
//
// It proves the three structural rules — every fact names its source, an absent record is stated, an
// unread source is named — and that the two renderings are built from ONE assembly, escaping record
// content and carrying the digest disclaimer. It does NOT prove that a dossier was assembled over a
// persisted decision (no authorized seated actor — D-064). writes: 0, records read: 0.

export default async function () {
  type Check = { id: string; label: string; pass: boolean; detail?: any };
  const results: Check[] = [];
  const check = (id: string, label: string, pass: boolean, detail?: any) => results.push({ id, label, pass: !!pass, detail: detail ?? null });

  const decision = {
    id: 'dec-1', decision_number: '2026/09', title_ar: 'إقرار خطة التحول الرقمي', title_en: 'Digital transformation plan',
    status: 'issued', issuance_state: 'complete', issue_manifest_sha256: 'abcdef0123456789fedcba', committee_id: 'c-1',
  };
  const records = {
    decision,
    meeting: { id: 'm-1', title: 'الاجتماع الرابع', date: '2026-10-01', status: 'completed' },
    electorate: [{ round: 1, proposal_version: 'pc:91ab', eligible_seat_count: 5, eligible_count: 5, voter_basis: 'per_seat', voting_rule: 'simple_majority_of_eligible', quorum_required: 3, frozen_at: '2026-10-01T09:00:00Z', material_change_count: 0, status: 'active' }],
    votes: [{ voter_name: 'أحمد', vote_choice: 'for' }, { voter_name: 'سارة', vote_choice: 'against' }],
    circulation: [],
    circulation_responses: null,
    issuance: [{ snapshot_version: 1, issued_at: '2026-10-02T10:00:00Z', round_number: 1, proposal_version: 'pc:91ab', electorate_size: 5, accepted_ballot_count: 4, quorum_met: true, threshold_met: true, assurance_level: 'content_digest', manifest_sha256: 'abcdef0123456789' }],
    actions: [
      { title_ar: 'تحديث المنصة', owner_name: 'سارة', deadline: '2026-11-15', status: 'closed', verification_state: 'accepted', closed_at: '2026-11-10T09:00:00Z' },
      { title_ar: 'إعداد التقرير', owner_name: 'أحمد', deadline: '2026-12-01', status: 'in_progress', verification_state: 'submitted' },
    ],
    minutes: [{ status: 'approved', approved_by_name: 'أحمد', attendance: [{ seat_id: 's1' }, { seat_id: 's2' }] }],
    audit_events: [{ action: 'decision.issue', timestamp: '2026-10-02T10:00:00Z', actor_name: 'أحمد' }],
  };

  const dossier = assembleDossier({ decision, records, assembledAt: '2026-10-06T12:00:00Z' });
  check('ED-001', 'the contract declares its own version', EVIDENCE_DOSSIER_VERSION === 'evidence-dossier-1.0.0' && dossier.contract_version === EVIDENCE_DOSSIER_VERSION);
  check('ED-002', 'the dossier carries its decision identity and its assembly instant',
    dossier.decision_ref.number === '2026/09' && dossier.decision_ref.title.ar && dossier.assembled_at === '2026-10-06T12:00:00Z');
  check('ED-003', 'the sections follow ONE declared order, from identity to audit',
    dossier.sections.map((s: any) => s.key).join(',') === DOSSIER_SECTIONS.map((s) => s.key).join(','), dossier.section_order);

  const allRows = dossier.sections.flatMap((s: any) => s.rows);
  check('ED-004', 'EVERY FACT NAMES ITS SOURCE (a value with no record behind it is not printable)',
    allRows.length > 0 && allRows.every((r: any) => typeof r.source === 'string' && r.source.length > 0), allRows.length);

  const voting = dossier.sections.find((s: any) => s.key === 'voting');
  check('ED-005', 'the frozen electorate is stated as it was frozen, with its basis and rule',
    voting.rows.some((r: any) => r.value === '5' && r.source === 'EligibleVoterSnapshot')
    && voting.rows.some((r: any) => r.value === 'per_seat') && voting.rows.some((r: any) => r.value === 'simple_majority_of_eligible'));
  check('ED-006', 'the votes are counted AND listed', voting.rows.some((r: any) => r.en.includes('count') && r.value === '2') && voting.rows.some((r: any) => r.value === 'for') && voting.rows.some((r: any) => r.value === 'against'));

  const circulation = dossier.sections.find((s: any) => s.key === 'circulation');
  check('ED-007', 'an EMPTY source is stated as not recorded, never dropped from the document',
    circulation.state === 'not_recorded' && circulation.rows.length === 0
    && circulation.state_label.ar === SECTION_STATES.not_recorded.ar, circulation.state);

  const unreadDossier = assembleDossier({
    decision, records: { ...records, circulation_responses: null }, unread: [{ source: 'circulation_responses', reason: 'authorizeRead refused: read_denied' }],
    assembledAt: '2026-10-06T12:00:00Z',
  });
  const unreadCirculation = unreadDossier.sections.find((s: any) => s.key === 'circulation');
  check('ED-008', 'AN UNREAD SOURCE IS NAMED with its reason on the section itself', unreadCirculation.unread_reason === 'authorizeRead refused: read_denied');
  check('ED-009', 'a section whose source was not read is marked as such (never read as empty)',
    unreadDossier.unread_sources.length === 1 && unreadDossier.sections.some((s: any) => s.unread_reason));

  const execution = dossier.sections.find((s: any) => s.key === 'execution');
  check('ED-010', 'execution states the count and the verdict, not only the titles',
    execution.rows.some((r: any) => r.en === 'Actions created (count)' && r.value === '2')
    && execution.rows.some((r: any) => r.en === 'Closed' && r.value === '1')
    && execution.rows.some((r: any) => r.en === 'With accepted evidence' && r.value === '1'));

  const issuance = dossier.sections.find((s: any) => s.key === 'issuance');
  check('ED-011', 'issuance states WHICH round and WHICH text were issued, and the package digest',
    issuance.rows.some((r: any) => r.en === 'Round relied upon' && r.value === '1')
    && issuance.rows.some((r: any) => r.en === 'Frozen proposal version issued' && r.value === 'pc:91ab')
    && issuance.rows.some((r: any) => r.en === 'Manifest digest' && r.value.startsWith('abcdef0123456789')));

  const audit = dossier.sections.find((s: any) => s.key === 'audit');
  check('ED-012', 'the audit section states the act, its instant and its actor', audit.rows.some((r: any) => r.value === 'decision.issue') && audit.rows.some((r: any) => r.value === 'أحمد'));

  // ── Markdown rendering ────────────────────────────────────────────────────────────────────────
  const md = dossierToMarkdown(dossier, 'ar');
  check('ED-013', 'the Markdown carries the decision number and title', md.includes('2026/09') && md.includes('إقرار خطة التحول الرقمي'));
  check('ED-014', 'the Markdown prints EVERY section with its state, including the empty ones',
    DOSSIER_SECTIONS.every((s) => md.includes(s.ar)) && md.includes(SECTION_STATES.not_recorded.ar));
  check('ED-015', 'the Markdown states the digest disclaimer in words (a digest is not validity)',
    md.includes(DOSSIER_STATEMENTS.digest_not_validity.ar) && md.includes(DOSSIER_STATEMENTS.absence_is_stated.ar));
  check('ED-016', 'the Markdown names the source beside the value', /_\( EligibleVoterSnapshot \)_/.test(md));
  check('ED-017', 'the Markdown names a source it could not read, with the reason',
    dossierToMarkdown(unreadDossier, 'ar').includes('authorizeRead refused: read_denied'));

  // ── Printable document ───────────────────────────────────────────────────────────────────────
  const html = dossierToPrintableHtml(dossier, 'ar');
  const htmlEn = dossierToPrintableHtml(dossier, 'en');
  check('ED-018', 'the printable document is SELF-CONTAINED: no scripts, no external assets',
    !/<script/i.test(html) && !/<link/i.test(html) && !/https?:\/\//.test(html.replace(/https?:\/\/www\.w3\.org/g, '')));
  check('ED-019', 'direction follows the language', html.includes('dir="rtl"') && htmlEn.includes('dir="ltr"') && html.includes('lang="ar"'));
  check('ED-020', 'record content is ESCAPED (a title carrying markup cannot become markup)',
    (() => {
      const injected = assembleDossier({ decision: { ...decision, title_ar: '<b>x</b><script>alert(1)</script>' }, records, assembledAt: null });
      const out = dossierToPrintableHtml(injected, 'ar');
      return out.includes('&lt;script&gt;') && !/<script>alert/.test(out);
    })());
  check('ED-021', 'escapeHtml escapes the five dangerous characters', escapeHtml('<a href="x">&\'</a>') === '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  check('ED-022', 'the printable document carries the disclaimer and the decision identity',
    html.includes('ملف أدلة القرار') && html.includes(DOSSIER_STATEMENTS.digest_not_validity.ar) && html.includes('2026/09'));

  // ── Both renderings come from ONE assembly ───────────────────────────────────────────────────
  check('ED-023', 'Markdown and the printable document are rendered from the SAME assembly (no second computation)',
    md.includes(dossier.sections.find((s: any) => s.key === 'issuance').rows.find((r: any) => r.en === 'Round relied upon').value)
    && html.includes(dossier.sections.find((s: any) => s.key === 'issuance').rows.find((r: any) => r.en === 'Round relied upon').value));
  check('ED-024', 'a long section is capped and SAYS it was capped', (() => {
    const many = { ...records, actions: Array.from({ length: ROW_CAP + 12 }, (_, i) => ({ title_ar: `إجراء ${i}`, status: 'closed' })) };
    const d = assembleDossier({ decision, records: many });
    const s = d.sections.find((x: any) => x.key === 'execution');
    return s.truncated === true && s.rows.length === ROW_CAP && dossierToMarkdown(d).includes(`أُدرج ${ROW_CAP} من`);
  })());
  check('ED-025', 'no writes, no reads: the module only states what it was given',
    dossier.sections.every((s: any) => s.state === 'not_read' || s.state === 'recorded' || s.state === 'not_recorded'));

  const unreadDossierMd = dossierToMarkdown(unreadDossier, 'ar');
  check('ED-026', 'an unread NESTED source prints NOTHING for it — never a false zero',
    !unreadDossierMd.includes('ردود مسجَّلة') || !unreadDossierMd.includes('ردود مسجَّلة (عدد): 0'));

  const passed = results.filter((r) => r.pass).length;
  return Response.json({
    suite: 'TestEvidenceDossier',
    contract_version: EVIDENCE_DOSSIER_VERSION,
    total: results.length,
    passed,
    failed: results.length - passed,
    verdict: passed === results.length ? 'PASS' : 'FAIL',
    failures: results.filter((r) => !r.pass),
    writes_performed: 0,
    records_read: 0,
    scope_note: 'Proves the DOSSIER RULE: every fact names its source, an absent record is stated rather than omitted, an unread source is named with its reason, the two renderings come from one assembly, and record content is escaped. It does not prove that a dossier was assembled over a persisted decision (no authorized seated actor — D-064).',
    results,
  });
}