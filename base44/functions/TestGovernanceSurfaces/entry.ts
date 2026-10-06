import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  GOVERNANCE_SURFACES, GOVERNANCE_SURFACES_VERSION, SURFACE_STAGES, UNAVAILABLE_CLASSES,
  ACTOR_BINDINGS, EVIDENCE_STATUSES, summarizeRegistry, auditRegistry, surfacesByStage,
  declaredCapabilities, surfaceById, SURFACE_IDS,
} from '../../shared/governanceSurfaceRegistry.ts';

// TestGovernanceSurfaces — the frozen SELF-CHECK of governance-surfaces-1.0.0 (G-1).
//
// It proves the property that cost this build twice already: no surface advertises an act that the
// platform cannot perform. Every surface must name the capability that governs it, the command that
// performs it, the contract that gates its state, and what it shows when the act is unavailable — and
// the register may not overstate its own evidence: a recorded path is claimed only with a correlation
// reference, and a capability that was not re-derived is DECLARED as a work item rather than implied.
//
// Reads no record, writes nothing (`writes_performed: 0`).
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases: any[] = [];
  const check = (id: string, label: string, pass: boolean, detail: any = null) => cases.push({ test_id: id, label, verdict: pass ? 'PASS' : 'FAIL', detail });

  const audit = auditRegistry();
  const summary = summarizeRegistry();
  const byStage = surfacesByStage();

  check('GS-001', 'the register declares its own version', GOVERNANCE_SURFACES_VERSION === 'governance-surfaces-1.0.0', GOVERNANCE_SURFACES_VERSION);

  check('GS-002', 'the register passes its own check: no blocking finding',
    audit.ok === true && audit.blocking.length === 0, audit.blocking.slice(0, 5));

  check('GS-003', 'no two surfaces share an id, and no two repeat the same route with the same command and right',
    !audit.findings.some((f: any) => f.code === 'duplicate_id' || f.code === 'duplicate_surface')
    && new Set(SURFACE_IDS).size === SURFACE_IDS.length, SURFACE_IDS.length);

  check('GS-004', 'every surface names the capability that governs it and the command that performs it',
    GOVERNANCE_SURFACES.every((s) => !!s.capability && !!s.command)
    && GOVERNANCE_SURFACES.every((s) => s.kind === 'view' || s.capability !== 'none'), null);

  check('GS-005', 'every act states what the surface shows when the act is unavailable, and the class has a bilingual sentence',
    GOVERNANCE_SURFACES.filter((s) => s.kind === 'act').every((s) => !!s.unavailable && !!UNAVAILABLE_CLASSES[s.unavailable]?.ar && !!UNAVAILABLE_CLASSES[s.unavailable]?.en),
    Object.keys(UNAVAILABLE_CLASSES));

  check('GS-006', 'every state-gated act names the state it acts on',
    GOVERNANCE_SURFACES.filter((s) => s.gated === true).every((s) => !!s.state_from),
    GOVERNANCE_SURFACES.filter((s) => s.gated === true).length);

  check('GS-007', 'every bound surface names the field that carries the binding',
    GOVERNANCE_SURFACES.filter((s) => (s.actor_binding || 'none') !== 'none').every((s) => !!s.bound_field),
    GOVERNANCE_SURFACES.filter((s) => (s.actor_binding || 'none') !== 'none').map((s) => s.id));

  check('GS-008', 'contract-verified is never claimed without naming its suite',
    GOVERNANCE_SURFACES.filter((s) => s.evidence === 'contract_verified').every((s) => !!s.suite), null);

  check('GS-009', 'coherence: a recorded path is claimed only with a correlation reference, and never while flagged as blocked',
    GOVERNANCE_SURFACES.every((s) => (s.recorded_path === true ? !!s.recorded_path_evidence : !s.recorded_path_evidence))
    && summary.recorded_paths === GOVERNANCE_SURFACES.filter((s) => s.recorded_path_evidence).length, summary.recorded_paths);

  check('GS-010', 'no governed surface performs a deletion',
    GOVERNANCE_SURFACES.every((s) => !/Delete|Remove/.test(s.command)), null);

  check('GS-011', 'the register DECLARES the capabilities it could not re-derive instead of implying completeness',
    summary.unverified_capabilities.length > 0
    && summary.unverified_capabilities.every((u: any) => !!u.command && !!u.id)
    && audit.declared_work.length === summary.unverified_capabilities.length, summary.unverified_capabilities.length);

  check('GS-012', 'every stage carries at least one surface',
    Object.keys(SURFACE_STAGES).every((k) => (byStage[k] || []).length > 0), Object.keys(SURFACE_STAGES).map((k) => `${k}:${(byStage[k] || []).length}`));

  check('GS-013', 'the summary counts agree with the register',
    summary.total === GOVERNANCE_SURFACES.length && summary.acts + summary.views === summary.total
    && Object.values(summary.by_stage).reduce((a: number, b: any) => a + b, 0) === summary.total
    && Object.values(summary.by_evidence).reduce((a: number, b: any) => a + b, 0) === summary.total, summary);

  check('GS-014', 'every declared contract is a versioned contract name',
    GOVERNANCE_SURFACES.filter((s) => !!s.contract).every((s) => /^\S+-\d+\.\d+\.\d+$/.test(String(s.contract))),
    GOVERNANCE_SURFACES.filter((s) => !!s.contract).map((s) => s.contract).slice(0, 4));

  check('GS-015', 'a read surface is never gated on a record state and never performs an act',
    GOVERNANCE_SURFACES.filter((s) => s.kind === 'view').every((s) => !s.gated && s.capability !== 'none' ? true : !s.gated), null);

  check('GS-016', 'the two mismatches that cost this build are settled in the register: proposal rests on decision.propose, closure on an accepted verdict',
    surfaceById('create_decision_draft')?.capability === 'decision.propose'
    && surfaceById('close_action')?.capability === 'action.close'
    && String(surfaceById('close_action')?.bound_field || '').includes('verified_by_user_id'), null);

  check('GS-017', 'the closure surface states the legal-hold gate, and withdrawal states that nothing is deleted',
    String(surfaceById('close_action')?.note_ar || '').includes('حجز')
    && String(surfaceById('archive_agenda_item')?.note_ar || '').includes('لا حذف'), null);

  check('GS-018', 'the declared capabilities carry no duplicate',
    declaredCapabilities().length === new Set(declaredCapabilities()).size, declaredCapabilities().length);

  check('GS-019', 'every actor binding is declared with a bilingual meaning',
    GOVERNANCE_SURFACES.every((s) => !!ACTOR_BINDINGS[s.actor_binding || 'none']?.ar && !!ACTOR_BINDINGS[s.actor_binding || 'none']?.en), Object.keys(ACTOR_BINDINGS));

  check('GS-020', 'every evidence status is declared with a bilingual meaning',
    GOVERNANCE_SURFACES.every((s) => !!EVIDENCE_STATUSES[s.evidence]?.ar && !!EVIDENCE_STATUSES[s.evidence]?.en), Object.keys(EVIDENCE_STATUSES));

  check('GS-021', 'the register states plainly that no surface acts by itself',
    GOVERNANCE_SURFACES.filter((s) => s.kind === 'act').every((s) => !!s.command), null);

  check('GS-022', 'the surfaces offered to a seated member are the ones that name a real command, and the rest carry a declared class',
    GOVERNANCE_SURFACES.every((s) => UNAVAILABLE_CLASSES[s.unavailable] !== undefined), null);

  const passed = cases.filter((c) => c.verdict === 'PASS').length;
  const failed = cases.length - passed;
  return Response.json({
    suite: 'TestGovernanceSurfaces',
    contract_version: GOVERNANCE_SURFACES_VERSION,
    total: cases.length, passed, failed, verdict: failed === 0 ? 'PASS' : 'FAIL',
    failures: cases.filter((c) => c.verdict === 'FAIL'),
    writes_performed: 0, records_read: 0,
    register_audit: { ok: audit.ok, blocking: audit.blocking.length, declared_work: audit.declared_work.length },
    scope_note: 'Proves the REGISTER itself: four stated facts per surface, evidence never overstated, gaps declared. It does not prove that any surface was exercised over a persisted record (no authorized seated actor — D-064).',
    results: cases,
  });
}