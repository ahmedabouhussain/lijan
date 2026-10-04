import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { evaluateActionPolicy, capabilitiesForRole, AUTHORITY_POLICY_VERSION, DELEGABLE_CAPABILITIES } from '../../shared/authorityKernel.ts';

// TestAuthorizationGuard — server-side negative-boundary test of the ONE policy table.
//
// It exercises the pure evaluator (no writes, no records touched) so every refusal can be read as
// evidence rather than as a description of the interface. It answers only for the signed-in caller
// and returns no other person's data.
const CASES = [
  { id: 'AUTH-001', role: 'member', capability: 'read', delegation: false, expect: true, note: 'member reads the register' },
  { id: 'AUTH-002', role: 'member', capability: 'comment.shared', delegation: false, expect: true, note: 'member comments when permitted' },
  { id: 'AUTH-003', role: 'member', capability: 'meeting.start', delegation: false, expect: false, note: 'member cannot start a meeting' },
  { id: 'AUTH-004', role: 'member', capability: 'decision.issue', delegation: false, expect: false, note: 'member cannot issue a decision' },
  { id: 'AUTH-005', role: 'member', capability: 'minutes.approve', delegation: false, expect: false, note: 'member cannot approve minutes' },
  { id: 'AUTH-006', role: 'member', capability: 'decision.sign_image', delegation: false, expect: false, note: 'member cannot sign' },
  { id: 'AUTH-007', role: 'member', capability: 'decision.vote', delegation: false, expect: true, note: 'voting is a member right, not an approval' },
  { id: 'AUTH-008', role: 'secretary', capability: 'agenda.edit', delegation: false, expect: true, note: 'secretary prepares the agenda' },
  { id: 'AUTH-009', role: 'secretary', capability: 'minutes.draft', delegation: false, expect: true, note: 'secretary drafts minutes' },
  { id: 'AUTH-010', role: 'secretary', capability: 'minutes.approve', delegation: false, expect: false, note: 'secretary cannot approve minutes' },
  { id: 'AUTH-011', role: 'secretary', capability: 'decision.issue', delegation: false, expect: false, note: 'secretary cannot issue a decision' },
  { id: 'AUTH-012', role: 'secretary', capability: 'vote.cast', delegation: false, expect: false, note: 'secretary does not vote by office' },
  { id: 'AUTH-013', role: 'vice_chair', capability: 'meeting.start', delegation: false, expect: false, note: 'vice-chair has NO chair power without delegation' },
  { id: 'AUTH-014', role: 'vice_chair', capability: 'decision.issue', delegation: false, expect: false, note: 'vice-chair does not inherit issuing' },
  { id: 'AUTH-015', role: 'vice_chair', capability: 'minutes.approve', delegation: false, expect: false, note: 'vice-chair does not inherit approval' },
  { id: 'AUTH-016', role: 'vice_chair', capability: 'decision.propose', delegation: false, expect: true, note: 'vice-chair proposes and recommends' },
  { id: 'AUTH-017', role: 'vice_chair', capability: 'meeting.start', delegation: true, expect: true, note: 'vice-chair acts as chair under an ACTIVE delegation' },
  { id: 'AUTH-018', role: 'vice_chair', capability: 'decision.issue', delegation: true, expect: true, note: 'delegated issuing within the transfer' },
  { id: 'AUTH-019', role: 'vice_chair', capability: 'committee.close', delegation: true, expect: false, note: 'a delegation never transfers closing the committee' },
  { id: 'AUTH-020', role: 'chair', capability: 'minutes.approve', delegation: false, expect: true, note: 'the chair approves' },
  { id: 'AUTH-021', role: 'chair', capability: 'decision.digital_sign', delegation: false, expect: false, note: 'no digital-signature right exists until an approved policy names the trust service' },
  { id: 'AUTH-022', role: 'chair', capability: 'decision.issue', delegation: false, grant: { permitted_actions: [], denied_actions: ['decision.issue'], record_state: 'in_validity', conflict_status: 'none' }, expect: false, note: 'an explicit grant denial beats the role ceiling' },
  { id: 'AUTH-023', role: 'chair', capability: 'decision.issue', delegation: false, grant: { permitted_actions: [], record_state: 'out_of_validity', conflict_status: 'none' }, expect: false, note: 'a grant outside its validity removes the seat' },
  { id: 'AUTH-024', role: 'chair', capability: 'decision.issue', delegation: false, grant: { permitted_actions: [], record_state: 'in_validity', conflict_status: 'declared' }, expect: false, note: 'a declared conflict blocks the seat' },
  { id: 'AUTH-025', role: 'chair', capability: 'vote.cast', delegation: false, recusal: true, expect: false, note: 'a recused member cannot vote' },
  { id: 'AUTH-026', role: 'member', capability: 'decision.vote', delegation: false, recusal: true, legacyName: true, expect: false, note: 'a legacy NAME match may only deny — never permit' },
  { id: 'AUTH-027', role: 'member', capability: 'decision.vote', delegation: false, recusal: true, legacyName: true, expect: false, note: 'legacy match is reported as legacy' },
  { id: 'AUTH-028', role: null, capability: 'read', delegation: false, expect: false, note: 'no seat means no authority' },
  { id: 'AUTH-029', role: 'chair', capability: 'decision.issue', delegation: false, isPlatformAdmin: true, expect: false, note: 'is_admin is NOT operational authority' },
  { id: 'AUTH-030', role: null, capability: 'audit.read', delegation: false, isPlatformAdmin: true, expect: true, note: 'administration keeps a read-only ceiling' },
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized', code: 'unauthenticated' }, { status: 401 });

    const results = CASES.map((c) => {
      const verdict = evaluateActionPolicy({
        role: c.role,
        capability: c.capability,
        delegationActive: !!c.delegation,
        recusalActive: !!c.recusal,
        recusalLegacyNameMatch: !!c.legacyName,
        grant: c.grant || null,
        isPlatformAdmin: !!c.isPlatformAdmin,
      });
      return {
        test_id: c.id,
        role: c.role,
        capability: c.capability,
        delegation: !!c.delegation,
        grant: c.grant ? c.grant.record_state : null,
        recusal: !!c.recusal,
        expected: c.expect,
        actual: verdict.allowed,
        passed: verdict.allowed === c.expect,
        code: verdict.code || null,
        cap_source: verdict.cap_source || null,
        note: c.note,
      };
    });

    const failed = results.filter((r) => !r.passed);

    return Response.json({
      policy_version: AUTHORITY_POLICY_VERSION,
      delegable_capabilities: DELEGABLE_CAPABILITIES,
      chair_baseline_size: capabilitiesForRole('chair').length,
      vice_chair_baseline_size: capabilitiesForRole('vice_chair').length,
      vice_chair_delegated_size: capabilitiesForRole('vice_chair', { delegationActive: true }).length,
      total: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      verdict: failed.length === 0 ? 'PASS' : 'FAIL',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}