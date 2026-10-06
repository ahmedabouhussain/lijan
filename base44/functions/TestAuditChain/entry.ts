import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { CHAINS, CHAIN_KEYS, AUDIT_CHAIN_VERSION, AUDIT_CHAIN_REFUSALS, buildChain, trailVerdict } from '../../shared/auditChain.ts';

// TestAuditChain — the frozen CONTRACT suite for audit-chain-1.0.0 (G-5).
//
// It proves the property that makes an audit trail usable as evidence rather than as narrative: an
// absent required step is a NAMED GAP (never inferred), an event recorded before its predecessor is
// reported OUT OF ORDER (never re-sorted), a trail that could not be read is reported as incomplete
// (never as empty), and a trail never yields a legal conclusion it did not record.
//
// Reads no record, writes nothing (`writes_performed: 0`).
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases: any[] = [];
  const check = (id: string, label: string, pass: boolean, detail: any = null) => cases.push({ test_id: id, label, verdict: pass ? 'PASS' : 'FAIL', detail });

  const ev = (action: string, at: string, extra: any = {}) => ({
    action, created_date: at, actor_name: extra.actor || 'أمين اللجنة', authority_context: extra.capacity || 'capability:action.progress:authz-1.10.0',
    correlation_id: extra.corr || 'corr_test', description: extra.desc || null,
  });

  check('AC-001', 'the chain contract declares its own version', AUDIT_CHAIN_VERSION === 'audit-chain-1.0.0', AUDIT_CHAIN_VERSION);

  check('AC-002', 'every chain is declared and bilingual',
    CHAIN_KEYS.length >= 2 && CHAIN_KEYS.every((k) => !!CHAINS[k].ar && !!CHAINS[k].en && CHAINS[k].steps.length > 0), CHAIN_KEYS);

  check('AC-003', 'every step declares its meaning, and each chain keeps its verdict steps',
    Object.values(CHAINS).every((c: any) => c.steps.every((s: any) => ['act', 'verdict', 'gate'].includes(s.meaning)))
    && CHAINS.evidence.steps.some((s: any) => s.key === 'verdict_accepted' && s.meaning === 'verdict')
    && CHAINS.decision.steps.some((s: any) => s.key === 'round_certified' && s.meaning === 'verdict'), null);

  check('AC-004', 'a chain whose required steps are all recorded reads COMPLETE',
    (() => {
      const c = buildChain({ chain: 'evidence', events: [
        ev('action.progress_recorded', '2026-10-01T08:00:00Z'),
        ev('action.evidence_submitted', '2026-10-02T08:00:00Z', { actor: 'المالك' }),
        ev('action.evidence.accepted', '2026-10-03T08:00:00Z', { actor: 'الرئيس' }),
        ev('action.closed', '2026-10-04T08:00:00Z', { actor: 'الرئيس' }),
      ] });
      return c.completeness === 'complete' && c.gaps.length === 0 && c.event_count === 4;
    })(), null);

  check('AC-005', 'a required step with no event is a NAMED gap, never inferred',
    (() => {
      const c = buildChain({ chain: 'evidence', events: [ev('action.evidence_submitted', '2026-10-02T08:00:00Z')] });
      const gapKeys = c.gaps.map((g: any) => g.key);
      return c.completeness === 'open' && gapKeys.includes('verdict_accepted') && gapKeys.includes('closed')
        && c.gaps.every((g: any) => !!g.ar && !!g.en && !!g.why_ar && !!g.why_en);
    })(), null);

  check('AC-006', 'an optional step with no event is absent but is NOT a gap',
    (() => {
      const c = buildChain({ chain: 'decision', events: [
        ev('decision.draft_created', '2026-10-01T08:00:00Z'),
        ev('vote.opened', '2026-10-02T08:00:00Z'),
        ev('vote.closed', '2026-10-03T08:00:00Z'),
        ev('decision.issued', '2026-10-04T08:00:00Z'),
      ] });
      const step = c.steps.find((s: any) => s.key === 'submitted_for_review');
      return step.state === 'absent' && !c.gaps.some((g: any) => g.key === 'submitted_for_review') && c.completeness === 'complete';
    })(), null);

  check('AC-007', 'an event recorded before its predecessor is reported OUT OF ORDER, and rows are not re-sorted to hide it',
    (() => {
      const c = buildChain({ chain: 'evidence', events: [
        ev('action.progress_recorded', '2026-10-01T08:00:00Z'),
        ev('action.evidence_submitted', '2026-10-05T08:00:00Z'),
        ev('action.evidence.accepted', '2026-10-06T08:00:00Z', { actor: 'الرئيس' }),
        ev('action.closed', '2026-10-02T08:00:00Z', { actor: 'الرئيس' }),
      ] });
      return c.out_of_order.some((s: any) => s.key === 'closed') && c.steps.find((s: any) => s.key === 'closed').order === 'out_of_order';
    })(), null);

  check('AC-008', 'a trail that could not be read is reported INCOMPLETE and never as an empty trail',
    (() => {
      const c = buildChain({ chain: 'evidence', events: [], unread: { source: 'AuditEvent', reason: 'read failed' } });
      return c.completeness === 'incomplete' && c.inventory_not_read.length === 1 && c.inventory_not_read[0].source === 'AuditEvent';
    })(), null);

  check('AC-009', 'the chain carries the caution that a trail proves nothing about what did not happen',
    (() => {
      const c = buildChain({ chain: 'evidence', events: [] });
      return String(c.meaning_note.ar).includes('لا يُثبت') && String(c.meaning_note.en).includes('does not prove');
    })(), null);

  check('AC-010', 'a missing required step is distinguished from "the act never happened"',
    (() => {
      const c = buildChain({ chain: 'evidence', events: [] });
      return String(c.refusal_note.ar).includes('ناقص') && String(c.refusal_note.en).includes('incomplete');
    })(), null);

  check('AC-011', 'repeated events are counted, not collapsed into one',
    (() => {
      const c = buildChain({ chain: 'evidence', events: [ev('action.evidence_submitted', '2026-10-01T08:00:00Z'), ev('action.evidence_submitted', '2026-10-05T08:00:00Z')] });
      const step = c.steps.find((s: any) => s.key === 'evidence_submitted');
      return step.count === 2 && step.records.length === 2;
    })(), null);

  check('AC-012', 'each record carries only what the event holds: time, actor, action, capacity, correlation',
    (() => {
      const c = buildChain({ chain: 'evidence', events: [ev('action.evidence.accepted', '2026-10-03T08:00:00Z', { actor: 'الرئيس', corr: 'corr_x1' })] });
      const r = c.steps.find((s: any) => s.key === 'verdict_accepted').records[0];
      return r.at === '2026-10-03T08:00:00Z' && r.actor === 'الرئيس' && r.action === 'action.evidence.accepted'
        && r.correlation_id === 'corr_x1' && r.validity === undefined && r.outcome === undefined;
    })(), null);

  check('AC-013', 'a chain that does not exist is refused, with the supported list',
    (() => {
      const r = buildChain({ chain: 'not_a_chain', events: [] });
      return r.ok === false && r.code === 'chain_unknown' && Array.isArray(r.supported) && r.supported.includes('decision');
    })(), null);

  check('AC-014', 'the refusal vocabulary is bilingual and covers the unreadable trail',
    !!AUDIT_CHAIN_REFUSALS.trail_unreadable?.ar && !!AUDIT_CHAIN_REFUSALS.trail_unreadable?.en
    && !!AUDIT_CHAIN_REFUSALS.chain_unknown?.ar, Object.keys(AUDIT_CHAIN_REFUSALS));

  check('AC-015', 'the verdict line reports a gap count for an incomplete trail and never a conclusion',
    (() => {
      const open = buildChain({ chain: 'evidence', events: [] });
      const v = trailVerdict(open);
      const none = trailVerdict({ ok: false });
      return v !== null && String(v.ar).includes('ناقص') && none === null;
    })(), null);

  check('AC-016', 'the evidence chain treats the legal hold as a gate step, not as a note',
    CHAINS.evidence.steps.some((s: any) => s.key === 'hold_placed' && s.meaning === 'gate')
    && CHAINS.evidence.steps.some((s: any) => s.key === 'hold_released' && s.meaning === 'gate')
    && CHAINS.evidence.steps.filter((s: any) => s.meaning === 'gate').every((s: any) => s.required === false), null);

  check('AC-017', 'issuance is a required step of the decision chain: no decision trail is complete without it',
    CHAINS.decision.steps.find((s: any) => s.key === 'issued')?.required === true
    && CHAINS.decision.steps.find((s: any) => s.key === 'round_opened')?.required === true, null);

  const passed = cases.filter((c) => c.verdict === 'PASS').length;
  const failed = cases.length - passed;
  return Response.json({
    suite: 'TestAuditChain',
    contract_version: AUDIT_CHAIN_VERSION,
    total: cases.length, passed, failed, verdict: failed === 0 ? 'PASS' : 'FAIL',
    failures: cases.filter((c) => c.verdict === 'FAIL'),
    writes_performed: 0, records_read: 0,
    scope_note: 'Proves the CHAIN CONTRACT consumed by GetRecordAuditTrail. A trail read over a persisted record and browser behaviour are NOT TESTED (no authorized seated actor — D-064).',
    results: cases,
  });
}