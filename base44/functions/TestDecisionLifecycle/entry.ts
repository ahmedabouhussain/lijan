import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  DECISION_LIFECYCLE_VERSION,
  DECISION_STATE,
  DECISION_TRANSITIONS,
  canOpenVote,
  canCastVote,
  canCloseVote,
  issuanceGate,
  refusalFor,
  decisionChain,
  canAdvanceDecision,
} from '../../shared/decisionLifecycle.ts';

// TestDecisionLifecycle — read-only suite for the decision state chain (D-041, mandate §2, R-17).
//
// The defect this suite exists for: the chain was declared in more than one place and the
// declarations disagreed, so a governed `draft` could never open a voting round and no state that
// any command writes was reachable through the only key the gate accepted. The fix states the chain
// once (shared/decisionLifecycle.ts) and every handler now reads it.
//
// This suite performs NO writes and reads NO records. It asserts the contract object itself, which is
// what the handlers consume — so a case here proves the rule, not the deployment. Deployment-level
// proof (an authenticated persisted cycle) is a separate evidence class and is NOT claimed here.

export default async function(req) {
  const results = [];
  const record = (test_id, description, verdict, detail) => results.push({ test_id, description, verdict, detail });

  const check = (test_id, description, fn) => {
    try {
      const detail = fn();
      const passed = detail === true || detail?.passed === true;
      record(test_id, description, passed ? 'PASS' : 'FAIL', detail === true ? {} : detail);
    } catch (e) {
      record(test_id, description, 'FAIL', { error: e.message });
    }
  };

  try {
    createClientFromRequest(req);

    // ── Opening a round (the D-041 regression guard) ─────────────────────────────────────────────
    check('LC-001', 'A governed DRAFT may open a voting round (the unreachable-chain defect)', () => {
      const ok = canOpenVote(DECISION_STATE.DRAFT);
      return { passed: ok, draft_opens_vote: ok, note: 'before the fix, OpenVote refused draft and nothing wrote proposed' };
    });

    check('LC-002', 'A legacy PROPOSED record may still open a round (history is not orphaned)', () => ({
      passed: canOpenVote(DECISION_STATE.PROPOSED),
      proposed_opens_vote: canOpenVote(DECISION_STATE.PROPOSED),
    }));

    check('LC-003', 'An already VOTING decision cannot open a second round', () => ({
      passed: canOpenVote(DECISION_STATE.VOTING) === false,
    }));

    check('LC-004', 'An APPROVED or ISSUED decision cannot open a round', () => ({
      passed: canOpenVote(DECISION_STATE.APPROVED) === false && canOpenVote(DECISION_STATE.ISSUED) === false,
      approved: canOpenVote(DECISION_STATE.APPROVED),
      issued: canOpenVote(DECISION_STATE.ISSUED),
    }));

    // ── Ballots and closing ──────────────────────────────────────────────────────────────────────
    check('LC-005', 'Only an open VOTING round accepts a ballot', () => ({
      passed: canCastVote(DECISION_STATE.VOTING) === true
        && canCastVote(DECISION_STATE.DRAFT) === false
        && canCastVote(DECISION_STATE.APPROVED) === false,
    }));

    check('LC-006', 'Only an open VOTING round may be closed', () => ({
      passed: canCloseVote(DECISION_STATE.VOTING) === true && canCloseVote(DECISION_STATE.DRAFT) === false,
    }));

    // ── Issuance: approval is required, and re-issuing is idempotent ────────────────────────────
    check('LC-007', 'A DRAFT cannot be issued — approval is not writable from an interface', () => {
      const g = issuanceGate(DECISION_STATE.DRAFT);
      return { passed: g.allowed === false && g.code === 'decision_not_approved', gate: g };
    });

    check('LC-008', 'A VOTING decision cannot be issued before the result is certified', () => {
      const g = issuanceGate(DECISION_STATE.VOTING);
      return { passed: g.allowed === false, gate: g };
    });

    check('LC-009', 'An APPROVED decision may be issued, and that is a FIRST issuance', () => {
      const g = issuanceGate(DECISION_STATE.APPROVED);
      return { passed: g.allowed === true && g.idempotent === false, gate: g };
    });

    check('LC-010', 'An ISSUED decision answers IDEMPOTENT, never a silent second issuance', () => {
      const g = issuanceGate(DECISION_STATE.ISSUED);
      return { passed: g.allowed === true && g.idempotent === true && g.code === 'already_issued', gate: g };
    });

    // ── The contract's own consistency ──────────────────────────────────────────────────────────
    check('LC-011', 'Every state a transition accepts is written by SOME command (no unwritten key)', () => {
      const chain = decisionChain();
      const reachable = new Set(chain.filter((c) => c.reachable).map((c) => c.state));
      const orphans = Object.entries(DECISION_TRANSITIONS)
        .filter(([, t]: any) => !(t.from || []).some((s) => reachable.has(s)))
        .map(([name]) => name);
      return { passed: orphans.length === 0, orphan_transitions: orphans, reachable: [...reachable] };
    });

    check('LC-012', 'The positive chain draft → voting → approved → issued is reachable end to end', () => {
      const steps = [
        canOpenVote(DECISION_STATE.DRAFT),
        canCastVote(DECISION_TRANSITIONS.open_vote.to),
        canCloseVote(DECISION_TRANSITIONS.cast_vote.from[0]),
        issuanceGate(DECISION_TRANSITIONS.close_vote.to[0]).allowed,
      ];
      return { passed: steps.every(Boolean), steps };
    });

    check('LC-013', 'Every refusal carries a code plus Arabic and English text', () => {
      const missing = ['open_vote', 'cast_vote', 'close_vote', 'issue', 'submit_for_review', 'start_execution'].filter((t) => {
        const r: any = refusalFor(t, 'x');
        return !r.code || !r.message?.ar || !r.message?.en;
      });
      return { passed: missing.length === 0, incomplete: missing };
    });

    check('LC-014', 'The lifecycle contract version is pinned and named in every refusal', () => {
      const r: any = refusalFor('issue', 'draft');
      return {
        passed: DECISION_LIFECYCLE_VERSION === 'decision-lifecycle-1.1.0'
          && r.lifecycle_policy_version === DECISION_LIFECYCLE_VERSION,
        version: DECISION_LIFECYCLE_VERSION,
      };
    });

    // ── The two steps that had NO command (decision-lifecycle-1.1.0) ──────────────────────────────
    check('LC-015', 'A DRAFT is sent for review, and a draft is the only state it may be sent from', () => {
      const t: any = DECISION_TRANSITIONS.submit_for_review;
      return {
        passed: t.to === DECISION_STATE.IN_REVIEW
          && canAdvanceDecision(DECISION_STATE.DRAFT, 'submit_for_review') === true
          && canAdvanceDecision(DECISION_STATE.APPROVED, 'submit_for_review') === false,
        capability: t.capability,
      };
    });

    check('LC-016', 'Sending for review is its OWN right — neither proposing nor reviewing', () => ({
      passed: (DECISION_TRANSITIONS as any).submit_for_review.capability === 'decision.submit'
        && (DECISION_TRANSITIONS as any).submit_for_review.capability !== 'decision.propose'
        && (DECISION_TRANSITIONS as any).submit_for_review.capability !== 'decision.review',
    }));

    check('LC-017', 'A REVIEWED draft may still be taken to a vote — the new state is not a dead end', () => ({
      passed: canOpenVote(DECISION_STATE.IN_REVIEW) === true,
      in_review_opens_vote: canOpenVote(DECISION_STATE.IN_REVIEW),
    }));

    check('LC-018', 'A REVIEWED draft cannot be issued — review is not approval', () => {
      const g = issuanceGate(DECISION_STATE.IN_REVIEW);
      return { passed: g.allowed === false && g.code === 'decision_not_approved', gate: g };
    });

    check('LC-019', 'Execution starts from ISSUED only, and only once', () => ({
      passed: (DECISION_TRANSITIONS as any).start_execution.to === DECISION_STATE.EXECUTING
        && canAdvanceDecision(DECISION_STATE.ISSUED, 'start_execution') === true
        && canAdvanceDecision(DECISION_STATE.APPROVED, 'start_execution') === false
        && canAdvanceDecision(DECISION_STATE.EXECUTING, 'start_execution') === false,
      capability: (DECISION_TRANSITIONS as any).start_execution.capability,
    }));

    check('LC-020', 'Starting execution uses the right that was declared but never exercised', () => ({
      passed: (DECISION_TRANSITIONS as any).start_execution.capability === 'decision.execute',
    }));

    check('LC-021', 'Every state in this chain is written by a named command (no state without a writer)', () => {
      const chain = decisionChain();
      const unwritten = chain.filter((c: any) => c.reachable && !c.writable_by).map((c: any) => c.state);
      const missing = [DECISION_STATE.IN_REVIEW, DECISION_STATE.EXECUTING]
        .filter((s) => !chain.some((c: any) => c.state === s && c.reachable));
      return { passed: unwritten.length === 0 && missing.length === 0, unwritten, states_missing_from_chain: missing };
    });

    check('LC-022', 'Both new steps refuse with a code plus Arabic and English text', () => {
      const incomplete = ['submit_for_review', 'start_execution'].filter((t) => {
        const r: any = refusalFor(t, 'x');
        return !r.code || !r.message?.ar || !r.message?.en;
      });
      return { passed: incomplete.length === 0, incomplete };
    });

    const passed = results.filter((r) => r.verdict === 'PASS').length;
    const failed = results.length - passed;

    return Response.json({
      lifecycle_policy_version: DECISION_LIFECYCLE_VERSION,
      suites: {
        decision_lifecycle: { total: results.length, passed, failed, verdict: failed === 0 ? 'PASS' : 'FAIL' },
      },
      failures: results.filter((r) => r.verdict !== 'PASS'),
      writes_performed: 0,
      records_read: 0,
      scope_note: 'the contract object only — this suite does not exercise a handler, a persisted decision or a deployment',
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message, results }, { status: 500 });
  }
}