import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  evaluateActionPolicy, capabilitiesForRole, AUTHORITY_POLICY_VERSION, AUTHORITY_POLICY_BUILD, DELEGABLE_CAPABILITIES,
} from '../../shared/authorityKernel.ts';
import { authorizeCommand } from '../../shared/commandGuard.ts';

// TestAuthorizationGuard — the authority test suite for the FROZEN policy version.
//
// Three suites, deliberately separated in name and in kind:
//   1. Authority Role Tests      — does each role hold exactly the rights it should (30 cases)
//   2. Authority Positive Tests  — does the guard let a REAL act through (no over-blocking)
//   3. Fail-Closed Tests         — when a fact cannot be read, is the act REFUSED
//
// These are ROLE AND PERMISSION tests. They are NOT performance tests: no timing, no load, no
// p50/p95/p99 is claimed anywhere in this suite.
//
// Suites 2 and 3 run against an ISOLATED stub of the data layer (no record is touched, no write can
// land on real data), so one fact at a time can be made to fail and the refusal observed.
// It answers only for the signed-in caller and returns no other person's data.

const USER = { id: 'USR-T1', full_name: 'Test Seat', email: 'seat@test.invalid', role: 'user' };

// ── Suite 1 · Authority Role Tests ──────────────────────────────────────────
const ROLE_CASES = [
  { id: 'AUTH-001', role: 'member', capability: 'read', delegation: false, expect: true, note: 'member reads the register' },
  { id: 'AUTH-002', role: 'member', capability: 'comment.shared', delegation: false, expect: true, note: 'member comments when permitted' },
  { id: 'AUTH-003', role: 'member', capability: 'meeting.start', delegation: false, expect: false, note: 'member cannot start a meeting' },
  { id: 'AUTH-004', role: 'member', capability: 'decision.issue', delegation: false, expect: false, note: 'member cannot issue a decision' },
  { id: 'AUTH-005', role: 'member', capability: 'minutes.approve', delegation: false, expect: false, note: 'member cannot approve minutes' },
  { id: 'AUTH-006', role: 'member', capability: 'decision.sign_image', delegation: false, expect: false, note: 'member cannot sign' },
  { id: 'AUTH-007', role: 'member', capability: 'decision.vote', delegation: false, expect: true, note: 'voting is a member right, not an approval' },
  { id: 'AUTH-008', role: 'secretary', capability: 'agenda.edit', delegation: false, expect: true, note: 'secretary prepares the agenda' },
  { id: 'AUTH-009', role: 'secretary', capability: 'minutes.draft', delegation: false, expect: true, note: 'secretary drafts minutes' },
  { id: 'AUTH-010', role: 'secretary', capability: 'minutes.approve', delegation: false, expect: false, note: 'secretary cannot approve minutes it prepared' },
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

// ── Isolated data-layer stub (no real record is read; no write can land) ────
function stubClient({ user = USER, records = {}, fail = {} } = {}) {
  const entity = (type) => ({
    get: async (id) => {
      if (fail.get === type) throw new Error('read failed');
      const rec = (records[type] || {})[id];
      if (!rec) { const e = new Error('not found'); e.status = 404; throw e; }
      return rec;
    },
    filter: async () => {
      if (fail.filter === type) throw new Error('read failed');
      return records[`${type}!filter`] || [];
    },
    create: async (data) => {
      if (fail.create === type) throw new Error('write failed');
      return { id: `${type}_stub`, ...data };
    },
    update: async (id, data) => ({ id, ...data }),
    delete: async (id) => ({ id }),
  });
  return {
    auth: { me: async () => user },
    asServiceRole: { entities: new Proxy({}, { get: (_t, type) => entity(String(type)) }) },
  };
}

const ORG = 'ORG-T1';
const COM = 'COM-T1';
const MEETING = { id: 'MTG-T1', committee_id: COM, organization_id: ORG, status: 'scheduled' };
const MEETING_RUNNING = { ...MEETING, status: 'in_progress' };
const MINUTES = { id: 'MNT-T1', committee_id: COM, organization_id: ORG, meeting_id: 'MTG-T1', status: 'draft' };
const ACTION_OWNED = { id: 'ACT-T1', committee_id: COM, organization_id: ORG, status: 'in_progress', owner_user_id: USER.id, title: 'Action' };
const ACTION_ACCEPT = { ...ACTION_OWNED, id: 'ACT-T2', status: 'evidence_pending', owner_user_id: 'USR-OTHER' };
const REVIEW = { id: 'RRV-T1', committee_id: COM, organization_id: ORG, document_id: 'DOC-T1', reviewer_user_id: USER.id, status: 'pending' };
const DECISION = { id: 'DEC-T1', committee_id: COM, organization_id: ORG, status: 'approved' };
const DOCUMENT = { id: 'DOC-T1', committee_id: COM, organization_id: ORG };
const COMMITTEE = { id: COM, organization_id: ORG };

const seat = (role) => ({ id: 'SEAT-T1', committee_id: COM, user_id: USER.id, role, status: 'active' });
const baseRecords = (role, extra = {}) => ({
  Committee: { [COM]: COMMITTEE },
  [`CommitteeMembership!filter`]: [seat(role)],
  [`Recusal!filter`]: [],
  [`AuthorityGrant!filter`]: [],
  [`Delegation!filter`]: [],
  ...extra,
});

// ── Suite 2 · Authority Positive Tests (does the guard let real acts through) ─
const POSITIVE_CASES = [
  { id: 'POS-001', label: 'chair starts a valid meeting', role: 'chair', expect: true,
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1' },
    records: () => baseRecords('chair', { Meeting: { 'MTG-T1': MEETING } }) },
  { id: 'POS-002', label: 'secretary certifies attendance on a running meeting', role: 'secretary', expect: true,
    opts: { capability: 'attendance.certify', target_type: 'Meeting', target_id: 'MTG-T1' },
    records: () => baseRecords('secretary', { Meeting: { 'MTG-T1': MEETING_RUNNING } }) },
  { id: 'POS-003', label: 'member casts one vote inside the committee scope', role: 'member', expect: true,
    opts: { capability: 'vote.cast', target_type: 'Meeting', target_id: 'MTG-T1', related: [{ type: 'Vote', ids: ['VOT-T1'] }] },
    records: () => baseRecords('member', { Meeting: { 'MTG-T1': MEETING_RUNNING }, [`Vote!filter`]: [{ id: 'VOT-T1', committee_id: COM }] }) },
  { id: 'POS-004', label: 'member answers their OWN invitation (seat resolved server-side)', role: 'member', expect: true,
    opts: { capability: 'attendance.respond', target_type: 'Meeting', target_id: 'MTG-T1' },
    records: () => baseRecords('member', { Meeting: { 'MTG-T1': MEETING } }) },
  { id: 'POS-005', label: 'member declares their own conflict on their own committee', role: 'member', expect: true,
    opts: { capability: 'conflict.declare', target_type: 'Committee', target_id: COM },
    records: () => baseRecords('member') },
  { id: 'POS-006', label: 'member records their own recusal', role: 'member', expect: true,
    opts: { capability: 'recusal.record', target_type: 'Committee', target_id: COM },
    records: () => baseRecords('member') },
  { id: 'POS-007', label: 'chair approves minutes that are still a draft', role: 'chair', expect: true,
    opts: { capability: 'minutes.approve', target_type: 'MeetingMinutes', target_id: 'MNT-T1' },
    records: () => baseRecords('chair', { MeetingMinutes: { 'MNT-T1': MINUTES }, Meeting: { 'MTG-T1': MEETING } }) },
  { id: 'POS-008', label: 'action owner raises progress on their OWN action', role: 'member', expect: true,
    opts: { capability: 'action.progress', target_type: 'Action', target_id: 'ACT-T1' },
    records: () => baseRecords('member', { Action: { 'ACT-T1': ACTION_OWNED } }) },
  { id: 'POS-009', label: 'holder of the acceptance right closes an evidenced action', role: 'chair', expect: true,
    opts: { capability: 'action.close', target_type: 'Action', target_id: 'ACT-T2' },
    records: () => baseRecords('chair', { Action: { 'ACT-T2': ACTION_ACCEPT } }) },
  { id: 'POS-010', label: 'named reviewer answers the review addressed to them', role: 'secretary', expect: true,
    opts: { capability: 'review.respond', target_type: 'ReviewRequest', target_id: 'RRV-T1' },
    records: () => baseRecords('secretary', { ReviewRequest: { 'RRV-T1': REVIEW }, Document: { 'DOC-T1': DOCUMENT } }) },
  { id: 'POS-011', label: 'authorized seat signs a signature IMAGE (not a digital signature)', role: 'chair', expect: true,
    opts: { capability: 'decision.sign_image', target_type: 'Decision', target_id: 'DEC-T1' },
    records: () => baseRecords('chair', { Decision: { 'DEC-T1': DECISION } }) },
  { id: 'POS-012', label: 'vice-chair starts a meeting under an ACTIVE delegation', role: 'vice_chair', expect: true,
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1' },
    records: () => baseRecords('vice_chair', { Meeting: { 'MTG-T1': MEETING }, [`Delegation!filter`]: [{ id: 'DEL-T1', committee_id: COM, to_user_id: USER.id, status: 'active' }] }) },
];

// ── Suite 3 · Fail-Closed Tests (a fact that cannot be read is not an absent fact) ─
const FAIL_CLOSED_CASES = [
  { id: 'FCL-001', label: 'membership set cannot be read', expectCode: null,
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1' },
    stub: () => stubClient({ records: baseRecords('chair', { Meeting: { 'MTG-T1': MEETING } }), fail: { filter: 'CommitteeMembership' } }) },
  { id: 'FCL-002', label: 'authority grant cannot be read', expectCode: 'authority_unavailable',
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1' },
    stub: () => stubClient({ records: baseRecords('chair', { Meeting: { 'MTG-T1': MEETING } }), fail: { filter: 'AuthorityGrant' } }) },
  { id: 'FCL-003', label: 'recusal set cannot be read', expectCode: 'authority_unavailable',
    opts: { capability: 'vote.cast', target_type: 'Meeting', target_id: 'MTG-T1' },
    stub: () => stubClient({ records: baseRecords('member', { Meeting: { 'MTG-T1': MEETING_RUNNING } }), fail: { filter: 'Recusal' } }) },
  { id: 'FCL-004', label: 'target record cannot be read (not a 404)', expectCode: 'authority_unavailable',
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1' },
    stub: () => stubClient({ records: baseRecords('chair', {}), fail: { get: 'Meeting' } }) },
  { id: 'FCL-005', label: 'target record does not exist', expectCode: 'target_not_found',
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-MISSING' },
    stub: () => stubClient({ records: baseRecords('chair', {}) }) },
  { id: 'FCL-006', label: 'parent of the target no longer exists', expectCode: 'scope_chain_broken',
    opts: { capability: 'minutes.approve', target_type: 'MeetingMinutes', target_id: 'MNT-T1' },
    stub: () => stubClient({ records: baseRecords('chair', { MeetingMinutes: { 'MNT-T1': MINUTES } }) }) },
  { id: 'FCL-007', label: 'committee cannot be resolved', expectCode: 'committee_not_found',
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1' },
    stub: () => stubClient({ records: baseRecords('chair', { Meeting: { 'MTG-T1': MEETING } }), fail: { get: 'Committee' } }) },
  { id: 'FCL-008', label: 'delegation cannot be read (vice-chair keeps NO chair power)', expectCode: null,
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1' },
    stub: () => stubClient({ records: baseRecords('vice_chair', { Meeting: { 'MTG-T1': MEETING } }), fail: { filter: 'Delegation' } }) },
  { id: 'FCL-009', label: "a WRITE may not be gated by 'read'", expectCode: 'invalid_capability',
    opts: { capability: 'read', target_type: 'Meeting', target_id: 'MTG-T1' },
    stub: () => stubClient({ records: baseRecords('chair', { Meeting: { 'MTG-T1': MEETING } }) }) },
  { id: 'FCL-010', label: 'requested scope contradicts the record scope (even when the audit write fails)', expectCode: 'scope_mismatch',
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1', claimed_committee_id: 'COM-OTHER' },
    stub: () => stubClient({ records: baseRecords('chair', { Meeting: { 'MTG-T1': MEETING } }), fail: { create: 'AuditEvent' } }) },
  { id: 'FCL-011', label: 'a referenced record lies outside the committee', expectCode: 'related_out_of_scope',
    opts: { capability: 'vote.cast', target_type: 'Meeting', target_id: 'MTG-T1', related: [{ type: 'Vote', ids: ['VOT-OUT'] }] },
    stub: () => stubClient({ records: baseRecords('member', { Meeting: { 'MTG-T1': MEETING_RUNNING }, [`Vote!filter`]: [{ id: 'VOT-OUT', committee_id: 'COM-OTHER' }] }) }) },
  { id: 'FCL-012', label: 'unauthenticated caller is refused before anything is loaded', expectCode: 'unauthenticated',
    opts: { capability: 'meeting.start', target_type: 'Meeting', target_id: 'MTG-T1' },
    stub: () => stubClient({ user: null, records: {} }) },
  { id: 'FCL-013', label: 'a seat may not move an action bound to another person', expectCode: 'not_bound_to_actor',
    opts: { capability: 'action.progress', target_type: 'Action', target_id: 'ACT-T2' },
    stub: () => stubClient({ records: baseRecords('member', { Action: { 'ACT-T2': ACTION_ACCEPT } }) }) },
  { id: 'FCL-014', label: 'a state that does not permit the act is refused before it is written', expectCode: 'state_not_permitted',
    opts: { capability: 'minutes.approve', target_type: 'MeetingMinutes', target_id: 'MNT-T1' },
    stub: () => stubClient({ records: baseRecords('chair', { MeetingMinutes: { 'MNT-T1': { ...MINUTES, status: 'approved' } }, Meeting: { 'MTG-T1': MEETING } }) }) },
];

function verdictOf(rows) {
  const failed = rows.filter((r) => !r.passed);
  return { total: rows.length, passed: rows.length - failed.length, failed: failed.length, verdict: failed.length === 0 ? 'PASS' : 'FAIL' };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized', code: 'unauthenticated' }, { status: 401 });

    // Suite 1 — pure policy table
    const roleResults = ROLE_CASES.map((c) => {
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
        test_id: c.id, suite: 'Authority Role Tests', actor_role: c.role, operation: c.capability,
        delegation: !!c.delegation, recusal: !!c.recusal, grant: c.grant ? c.grant.record_state : null,
        expected: c.expect, actual: verdict.allowed, passed: verdict.allowed === c.expect,
        code: verdict.code || null, cap_source: verdict.cap_source || null, note: c.note,
      };
    });

    // Suites 2 & 3 — isolated stub of the data layer, one fact failed at a time
    const positiveResults = [];
    for (const c of POSITIVE_CASES) {
      const stub = stubClient({ records: c.records() });
      const auth = await authorizeCommand(stub, c.opts);
      positiveResults.push({
        test_id: c.id, suite: 'Authority Positive Tests', actor_role: c.role, operation: c.opts.capability,
        expected: c.expect, actual: auth.allowed === true, passed: (auth.allowed === true) === c.expect,
        code: auth.code || null, effective_role: auth.effective_role || null,
        trusted_target: auth.trusted_target ? `${auth.trusted_target.type}:${auth.trusted_target.derived_committee_id}` : null,
        delegation_applied: auth.delegation_applied === true, note: c.label,
      });
    }

    const failClosedResults = [];
    for (const c of FAIL_CLOSED_CASES) {
      const auth = await authorizeCommand(c.stub(), c.opts);
      const refused = auth.allowed === false;
      const codeMatches = c.expectCode ? auth.code === c.expectCode : true;
      failClosedResults.push({
        test_id: c.id, suite: 'Fail-Closed Tests', operation: c.opts.capability,
        expected: 'refused', actual: refused ? 'refused' : 'ALLOWED', passed: refused && codeMatches,
        code: auth.code || null, status: auth.status || null,
        correlation_id: auth.correlation_id || null, note: c.label,
      });
    }

    const role = verdictOf(roleResults);
    const positive = verdictOf(positiveResults);
    const failClosed = verdictOf(failClosedResults);

    return Response.json({
      policy_version: AUTHORITY_POLICY_VERSION,
      policy_build: AUTHORITY_POLICY_BUILD,
      suites: {
        authority_role_tests: role,
        authority_positive_tests: positive,
        fail_closed_tests: failClosed,
      },
      // Deliberately NOT a blanket PASS: migration coverage and showcase write eligibility are
      // reported as their own state, from the ledger and the spec — never inferred from this run.
      coverage: {
        command_migration: 'IN_PROGRESS — per-site ratio: docs/AUTHORITY_COMMAND_LEDGER.md',
        positive_authority_tests: positive.verdict,
        negative_authority_tests: role.verdict,
        fail_closed_tests: failClosed.verdict,
        showcase_write_eligibility: 'BLOCKED',
      },
      baseline_sizes: {
        chair: capabilitiesForRole('chair').length,
        vice_chair: capabilitiesForRole('vice_chair').length,
        vice_chair_delegated: capabilitiesForRole('vice_chair', { delegationActive: true }).length,
        delegable_capabilities: DELEGABLE_CAPABILITIES.length,
      },
      results: [...roleResults, ...positiveResults, ...failClosedResults],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}