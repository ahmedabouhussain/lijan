import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  EVIDENCE_ACCEPTANCE_VERSION,
  EVIDENCE_TRANSITIONS,
  EVIDENCE_STATE_GATES,
  EVIDENCE_ACTOR_EXCLUDED,
  EVIDENCE_REFUSALS,
  VERIFICATION_STATES,
} from '../../shared/evidenceAcceptance.ts';
import {
  PERMITTED_STATES,
  REQUIRED_STATES,
  ACTOR_BOUND,
  ACTOR_EXCLUDED,
} from '../../shared/commandGuard.ts';
import {
  AUTHORITY_POLICY_VERSION,
  DELEGABLE_CAPABILITIES,
  capabilitiesForRole,
  isOperationalCapability,
} from '../../shared/authorityKernel.ts';

// TestEvidenceAcceptance — the CONTRACT and the GUARD TABLES for accepting execution evidence.
//
// What this suite guards (D-046): closure used to rest on the owner's own word — one act wrote the
// evidence reference, asserted completion and set `compliance_verified: true`. This suite proves the
// shape that replaced it: submitting is not verifying, a verdict is independent and bound to the
// revision it judged, and closure cannot be granted by an assertion.
//
// SCOPE, declared: these cases read the policy CONTRACT the evidence commands consume (and the guard
// tables that are generated from it). They do not exercise a handler, do not read a stored record and
// do not write anything — `writes_performed: 0`, `records_read: 0`. A persisted submission→verdict→
// closure journey is NOT established here and stays BLOCKED on a seated test actor.
export default async function (req) {
  const results = [];
  const push = (id, name, pass, detail = null) => results.push({ id, name, pass: !!pass, detail });

  try {
    const submit = EVIDENCE_TRANSITIONS.submit;
    const verdict = EVIDENCE_TRANSITIONS.verdict;
    const close = EVIDENCE_TRANSITIONS.close;

    // ── The three acts are three rights ────────────────────────────────────────────────────────
    push('EA-001', 'The acceptance contract version travels with every decision',
      EVIDENCE_ACCEPTANCE_VERSION === 'evidence-acceptance-1.0.0', { contract_version: EVIDENCE_ACCEPTANCE_VERSION });
    push('EA-002', 'Submission is the PERFORMER\'s right (action.progress), and it is operational',
      submit.capability === 'action.progress' && isOperationalCapability(submit.capability), { capability: submit.capability });
    push('EA-003', 'Verification is its OWN independent right (action.verify), and it is operational',
      verdict.capability === 'action.verify' && isOperationalCapability(verdict.capability), { capability: verdict.capability });
    push('EA-004', 'Closure keeps its own right (action.close), and it is operational',
      close.capability === 'action.close' && isOperationalCapability(close.capability), { capability: close.capability });

    // ── Submitting is never a verdict ──────────────────────────────────────────────────────────
    push('EA-005', 'A submission lands in "submitted", which is not a verdict state',
      submit.to === 'submitted' && VERIFICATION_STATES.includes('submitted') && VERIFICATION_STATES.includes('accepted'),
      { to: submit.to, states: VERIFICATION_STATES });
    push('EA-006', 'An ACCEPTED verdict is never overwritten by a later submission',
      !submit.from.includes('accepted') && submit.from.includes('returned'), { from: submit.from });
    push('EA-007', 'A verdict may only judge a submission awaiting one',
      Array.isArray(verdict.from) && verdict.from.length === 1 && verdict.from[0] === 'submitted', { from: verdict.from });

    // ── Separation of duty, declared once and enforced structurally ────────────────────────────
    push('EA-008', 'Closure requires an ACCEPTED verdict — declared once in the contract',
      close.requires === 'accepted' && close.field === 'verification_state', { requires: close.requires, field: close.field });
    const guardCloseGate = REQUIRED_STATES['action.close'];
    push('EA-009', 'The guard\'s closure gate IS the contract\'s (no second, hand-written rule)',
      !!guardCloseGate && guardCloseGate.equals === close.requires && guardCloseGate.field === 'verification_state'
        && guardCloseGate.code === 'closure_requires_acceptance',
      { guard_gate: guardCloseGate || null });
    const guardVerdictGate = REQUIRED_STATES['action.verify'];
    push('EA-010', 'The guard\'s verdict gate IS the contract\'s submission state',
      !!guardVerdictGate && guardVerdictGate.field === verdict.field
        && JSON.stringify(guardVerdictGate.states) === JSON.stringify(verdict.from),
      { guard_gate: guardVerdictGate || null });
    const excluded = ACTOR_EXCLUDED['action.verify'] || [];
    push('EA-011', 'The submitter and the owner are both barred from judging their own record',
      excluded.includes('owner_user_id') && excluded.includes('evidence_submitted_by_user_id')
        && JSON.stringify([...excluded].sort()) === JSON.stringify([...verdict.independent_of].sort()),
      { excluded });
    push('EA-012', 'The exclusion applies to EVERY role — it is a separation gate, not the member owner-binding',
      !ACTOR_BOUND['action.verify'] && excluded.length === 2, { actor_bound: ACTOR_BOUND['action.verify'] || null });

    // ── The closure state gate still cannot close twice ────────────────────────────────────────
    const closeStatusGate = PERMITTED_STATES['action.close'];
    push('EA-013', 'Closure may act after an accepted verdict, and never on an already-closed record',
      closeStatusGate.states.includes('verified') && !closeStatusGate.states.includes('closed'),
      { states: closeStatusGate.states });

    // ── Who holds the verification right ──────────────────────────────────────────────────────
    const chair = capabilitiesForRole('chair', { delegationActive: false });
    const secretary = capabilitiesForRole('secretary', { delegationActive: false });
    const member = capabilitiesForRole('member', { delegationActive: false });
    const admin = capabilitiesForRole('committee_administrator', { delegationActive: false });
    push('EA-014', 'The chair and the secretary hold the verification right',
      chair.includes('action.verify') && secretary.includes('action.verify'),
      { chair: chair.includes('action.verify'), secretary: secretary.includes('action.verify') });
    push('EA-015', 'A plain member and a committee administrator do NOT hold it',
      !member.includes('action.verify') && !admin.includes('action.verify'),
      { member: member.includes('action.verify'), committee_administrator: admin.includes('action.verify') });
    const viceBefore = capabilitiesForRole('vice_chair', { delegationActive: false });
    const viceAfter = capabilitiesForRole('vice_chair', { delegationActive: true });
    push('EA-016', 'A vice-chair verifies only under an active delegation (bounded chair authority)',
      !viceBefore.includes('action.verify') && viceAfter.includes('action.verify') && DELEGABLE_CAPABILITIES.includes('action.verify'),
      { delegated: viceAfter.includes('action.verify'), delegable: DELEGABLE_CAPABILITIES.includes('action.verify') });

    // ── No act without a right, no refusal without both languages ─────────────────────────────
    const acts = [submit.capability, verdict.capability, close.capability];
    push('EA-017', 'Every act in the evidence contract is an operational capability',
      acts.every((c) => isOperationalCapability(c)), { acts });
    const codes = ['invalid_evidence_url', 'return_reason_required', 'not_a_verdict', 'already_accepted',
      'progress_incomplete', 'evidence_missing', 'actor_not_independent', 'closure_requires_acceptance'];
    const missing = codes.filter((c) => {
      const r = EVIDENCE_REFUSALS[c];
      return !r || !r.en || !r.ar || !r.status;
    });
    push('EA-018', 'Every refusal is bilingual, non-empty and carries a status',
      missing.length === 0, { missing });
    push('EA-019', 'The two structural refusals are wired to the guard\'s own codes',
      REQUIRED_STATES['action.close'].code === 'closure_requires_acceptance'
        && (ACTOR_EXCLUDED['action.verify'] || []).length > 0
        && EVIDENCE_REFUSALS.actor_not_independent.status === 403,
      { closure_code: REQUIRED_STATES['action.close'].code, exclusion_code: 'actor_not_independent' });
    push('EA-020', 'The evidence gates cover exactly the two acts that need them',
      Object.keys(EVIDENCE_STATE_GATES).sort().join(',') === 'action.close,action.verify',
      { gates: Object.keys(EVIDENCE_STATE_GATES) });

    const failed = results.filter((r) => !r.pass);
    return Response.json({
      suite: 'TestEvidenceAcceptance',
      contract_version: EVIDENCE_ACCEPTANCE_VERSION,
      policy_version: AUTHORITY_POLICY_VERSION,
      tests: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      failures: failed,
      results,
      writes_performed: 0,
      records_read: 0,
      scope: 'Policy contract and guard tables only. No handler was exercised, no record was read and '
        + 'nothing was written; a persisted submission → independent verdict → closure journey remains BLOCKED on a seated test actor.',
    });
  } catch (error) {
    return Response.json({
      suite: 'TestEvidenceAcceptance',
      error: error.message,
      tests: results.length,
      failures: results.filter((r) => !r.pass),
      writes_performed: 0,
      records_read: 0,
    }, { status: 500 });
  }
}