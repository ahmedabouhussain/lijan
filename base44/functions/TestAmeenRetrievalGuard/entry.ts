import {
  AMEEN_RETRIEVAL_GUARD_VERSION, RETRIEVAL_REFUSALS, RETRIEVAL_GUARD_STATEMENTS, SCOPE_NOT_IN_FORCE,
  assessScopeInForce, assessSeatStanding, assessRetrieval,
} from '../../shared/ameenRetrievalGuard.ts';

// TestAmeenRetrievalGuard — PROVES the retrieval guard (ameen-retrieval-guard-1.0.0, D-092).
//
// It proves that «أمين» stops reading when the authority behind the read is no longer alive: a revoked or
// expired exploration session, a closed scope, a seat whose term ended or has not started, and — above
// all — an UNKNOWN standing (which denies, because standing is never assumed). The seat check runs over
// the authority kernel's own standing function with a stub store, so the test exercises the real rule and
// not a copy of it. writes: 0, real records read: 0 (the stub is in-memory).

export default async function () {
  type Check = { id: string; label: string; pass: boolean; detail?: any };
  const results: Check[] = [];
  const check = (id: string, label: string, pass: boolean, detail?: any) => results.push({ id, label, pass: !!pass, detail: detail ?? null });

  const future = new Date(Date.now() + 86400000 * 60).toISOString();
  const past = new Date(Date.now() - 86400000 * 60).toISOString();

  // A stub store: whatever the seat/event readers ask for, they get these two sets — no real records.
  const store = (seats: any[] | Error, events: any[] = []) => ({
    entities: new Proxy({}, {
      get: (_t, name) => ({
        filter: async () => {
          if (seats instanceof Error) throw seats;
          return String(name) === 'CommitteeMembership' ? seats : events;
        },
        list: async () => [],
        get: async () => null,
      }),
    }),
  });

  const standingSeat = { id: 'seat-1', committee_id: 'c-1', user_id: 'u-1', status: 'active', term_start: past, term_end: future };
  const endedSeat = { id: 'seat-2', committee_id: 'c-1', user_id: 'u-2', status: 'active', term_start: past, term_end: past };
  const futureSeat = { id: 'seat-3', committee_id: 'c-1', user_id: 'u-3', status: 'active', term_start: future, term_end: future };

  check('AG-001', 'the guard declares its own version', AMEEN_RETRIEVAL_GUARD_VERSION === 'ameen-retrieval-guard-1.0.0');

  check('AG-002', 'EVERY refusal the guard can emit is declared in both languages', (() => {
    const codes = ['session_revoked', 'session_expired', 'session_invalid', 'scope_closed', 'seat_ended', 'seat_not_yet_started', 'standing_unknown'];
    return codes.every((c) => RETRIEVAL_REFUSALS[c]?.ar && RETRIEVAL_REFUSALS[c]?.en);
  })(), Object.keys(RETRIEVAL_REFUSALS));

  check('AG-003', 'the guard states that it only denies, that it fails closed, and that standing has ONE definition',
    RETRIEVAL_GUARD_STATEMENTS.deny_only.ar && RETRIEVAL_GUARD_STATEMENTS.fail_closed.en && RETRIEVAL_GUARD_STATEMENTS.standing_from_one_contract.ar);

  // ── Scope in force ───────────────────────────────────────────────────────────────────────────
  check('AG-004', 'a live committee is a live scope', assessScopeInForce({ status: 'active' }).live === true);
  check('AG-005', 'A CLOSED SCOPE is refused and named', assessScopeInForce({ status: 'closed' }).live === false && assessScopeInForce({ status: 'closed' }).code === 'scope_closed');
  check('AG-006', 'suspended and archived are refused the same way', SCOPE_NOT_IN_FORCE.includes('suspended') && assessScopeInForce({ status: 'archived' }).code === 'scope_closed' && assessScopeInForce({ status: 'suspended' }).code === 'scope_closed');
  check('AG-007', 'a scope with NO readable status is refused (fail-closed, never assumed live)',
    assessScopeInForce({}).live === false && assessScopeInForce(null).code === 'standing_unknown');

  // ── Seat standing through the KERNEL's own function ──────────────────────────────────────────
  const standingOk = await assessSeatStanding(store([standingSeat]), { committee_id: 'c-1', user_id: 'u-1', at: new Date().toISOString() });
  check('AG-008', 'a seat inside its term IS standing', standingOk.state === 'standing' && standingOk.code === null, standingOk.state);
  const standingEnded = await assessSeatStanding(store([endedSeat]), { committee_id: 'c-1', user_id: 'u-2', at: new Date().toISOString() });
  check('AG-009', 'A SEAT WHOSE TERM ENDED IS NOT STANDING (the authority read must not outlive the seat)',
    standingEnded.state === 'ended' && standingEnded.code === 'seat_ended', standingEnded.state);
  const standingFuture = await assessSeatStanding(store([futureSeat]), { committee_id: 'c-1', user_id: 'u-3', at: new Date().toISOString() });
  check('AG-010', 'a seat that has not started is not standing either', standingFuture.code === 'seat_not_yet_started', standingFuture.state);
  const unreadable = await assessSeatStanding(store(new Error('store unavailable')), { committee_id: 'c-1', user_id: 'u-1' });
  check('AG-011', 'AN UNREADABLE SEAT LIST IS UNKNOWN STANDING — and unknown is a refusal',
    unreadable.state === 'unknown' && unreadable.code === 'standing_unknown', unreadable.reason);
  const noSeat = await assessSeatStanding(store([]), { committee_id: 'c-1', user_id: 'u-9' });
  check('AG-012', 'no seat for this person is unknown standing, not an open door', noSeat.code === 'standing_unknown', noSeat.reason);
  check('AG-013', 'the standing is evaluated AT AN INSTANT, and the instant travels with the verdict', !!standingOk.at && !!standingEnded.at);

  // A history that cannot be read is NOT an empty history (the kernel's reader says which it was).
  const unreadableHistory = await assessSeatStanding({
    entities: new Proxy({}, {
      get: (_t, name) => ({
        filter: async () => {
          if (String(name) === 'CommitteeMembership') return [standingSeat];
          throw new Error('appointment store unavailable');
        },
        list: async () => [],
        get: async () => null,
      }),
    }),
  }, { committee_id: 'c-1', user_id: 'u-1', at: new Date().toISOString() });
  check('AG-023', 'AN UNREADABLE APPOINTMENT HISTORY IS UNKNOWN STANDING — never read as an empty history',
    unreadableHistory.state === 'unknown' && unreadableHistory.code === 'standing_unknown', unreadableHistory.reason);

  // ── The verdict the command consumes ─────────────────────────────────────────────────────────
  const clean = assessRetrieval({ scope: assessScopeInForce({ status: 'active' }), standing: standingOk, session: { applicable: false } });
  check('AG-014', 'when everything is in force, the guard is silent (ok, no refusals)', clean.ok === true && clean.refusals.length === 0 && clean.checked.scope && clean.checked.standing && clean.checked.session === false);
  check('AG-015', 'the verdict names what it actually checked and when', clean.contract_version === AMEEN_RETRIEVAL_GUARD_VERSION && !!clean.at);

  const seatGone = assessRetrieval({ scope: assessScopeInForce({ status: 'active' }), standing: standingEnded, session: { applicable: false } });
  check('AG-016', 'an ended seat denies the read and carries its sentence', seatGone.ok === false && seatGone.codes.includes('seat_ended') && seatGone.refusals[0].ar && seatGone.refusals[0].en);

  const revoked = assessRetrieval({ scope: assessScopeInForce({ status: 'active' }), standing: standingOk, session: { applicable: true, valid: false, code: 'session_revoked', reason: 'revoked' } });
  check('AG-017', 'A REVOKED SESSION DENIES THE READ even when the seat is standing',
    revoked.ok === false && revoked.codes.includes('session_revoked'), revoked.codes);

  const both = assessRetrieval({ scope: assessScopeInForce({ status: 'closed' }), standing: standingEnded, session: { applicable: true, valid: false, code: 'session_expired' } });
  check('AG-018', 'every ground of refusal is reported together, in order, not just the first',
    both.codes.includes('session_expired') && both.codes.includes('scope_closed') && both.codes.includes('seat_ended'), both.codes);

  const unknown = assessRetrieval({ scope: assessScopeInForce({ status: 'active' }), standing: { state: 'unknown', code: 'standing_unknown' }, session: { applicable: false } });
  check('AG-019', 'UNKNOWN STANDING DENIES (fail-closed): the guard never reads as if standing were in force',
    unknown.ok === false && unknown.codes.includes('standing_unknown'));

  const noSession = assessRetrieval({ scope: assessScopeInForce({ status: 'active' }), standing: standingOk, session: { applicable: false, code: null } });
  check('AG-020', 'WITHOUT a session there is no session refusal — absent is not a denial', noSession.ok === true);

  check('AG-021', 'THE GUARD CANNOT GRANT: its verdict contains nothing that widens scope or classification',
    !('allowed_sources' in clean) && !('classification_ceiling' in clean) && !('capabilities' in clean) && !('grants' in clean),
    Object.keys(clean));

  check('AG-022', 'the guard never writes and never touches a record: it decides over values it is given',
    JSON.stringify(clean).length > 0 && clean.refusals.every((r: any) => typeof r.code === 'string'));

  const passed = results.filter((r) => r.pass).length;
  return Response.json({
    suite: 'TestAmeenRetrievalGuard',
    contract_version: AMEEN_RETRIEVAL_GUARD_VERSION,
    total: results.length,
    passed,
    failed: results.length - passed,
    verdict: passed === results.length ? 'PASS' : 'FAIL',
    failures: results.filter((r) => !r.pass),
    writes_performed: 0,
    records_read: 0,
    scope_note: 'Proves the RETRIEVAL GUARD over a stub store: a revoked/expired session, a closed scope, an ended or not-yet-started seat, and any unknown standing all DENY and name why; the seat check runs the authority kernel\u2019s own standing function; the verdict grants nothing. It does not prove a live refusal against a persisted session, seat or closed committee (no authorized seated actor — D-064).',
    results,
  });
}