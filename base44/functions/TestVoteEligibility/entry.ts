import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { computeElectorate, ELIGIBILITY_POLICY_VERSION } from '../../shared/voteEligibility.ts';

// TestVoteEligibility — the executed evidence for the electorate rule (A05/A06).
//
// Pure: no entity is written, so running it changes nothing. It exercises the SAME module the
// OpenVote command uses, so a PASS here is a statement about the rule an opened vote is frozen
// against — not about the command's wiring, which is exercised separately.

const seat = (n, over = {}) => ({
  id: `SEAT-${n}`, user_id: `USER-${n}`, full_name: `Member ${n}`, role: 'member',
  status: 'active', voting_right: true, ...over,
});

export default async function () {
  try {
    const results = [];
    const check = (id, description, ok, detail) => results.push({ test_id: id, description, verdict: ok ? 'PASS' : 'FAIL', detail });

    const base = [seat(1), seat(2), seat(3), seat(4), seat(5)];

    // EL-001 — recusal by SEAT identifier
    const bySeat = computeElectorate({ seats: base, recusals: [{ id: 'R1', status: 'active', membership_id: 'SEAT-2' }] });
    check('EL-001', 'A recusal naming a seat removes exactly that seat', bySeat.size === 4 && !bySeat.eligible_seat_ids.includes('SEAT-2') && bySeat.excluded.recused_by_identifier === 1, { size: bySeat.size, excluded: bySeat.excluded, ids: bySeat.eligible_seat_ids });

    // EL-002 — recusal by PERSON identifier
    const byPerson = computeElectorate({ seats: base, recusals: [{ id: 'R1', status: 'active', member_user_id: 'USER-3' }] });
    check('EL-002', 'A recusal naming a person removes that person’s seat', byPerson.size === 4 && !byPerson.eligible_seat_ids.includes('SEAT-3'), { size: byPerson.size, excluded: byPerson.excluded });

    // EL-003 — legacy name match: deny-only, counted, never a grant
    const byName = computeElectorate({ seats: base, recusals: [{ id: 'R1', status: 'active', member_name: 'member 4' }] });
    check('EL-003', 'A legacy name match only ever removes a seat, and is reported as name-based', byName.size === 4 && byName.excluded.legacy_name_match === 1 && byName.excluded.legacy_name_match_is_deny_only === true, { size: byName.size, excluded: byName.excluded });

    // EL-004 — a shared name excludes BOTH seats (conservative) and is reported
    const collision = computeElectorate({
      seats: [seat(1, { full_name: 'Mohamed Ali' }), seat(2, { full_name: 'Mohamed Ali' }), seat(3)],
      recusals: [{ id: 'R1', status: 'active', member_name: 'Mohamed Ali' }],
    });
    check('EL-004', 'A name shared by two seats excludes both and reports two name matches', collision.size === 1 && collision.excluded.legacy_name_match === 2, { size: collision.size, excluded: collision.excluded });

    // EL-005 / EL-006 — term boundaries
    const expired = computeElectorate({ seats: [seat(1, { term_end: '2026-01-01' }), seat(2)], recusals: [], day: '2026-10-05' });
    check('EL-005', 'A seat whose term has ended is not eligible', expired.size === 1 && expired.eligible_seat_ids.includes('SEAT-2'), { size: expired.size, excluded: expired.excluded });
    const notStarted = computeElectorate({ seats: [seat(1, { term_start: '2026-12-01' }), seat(2)], recusals: [], day: '2026-10-05' });
    check('EL-006', 'A seat whose term has not started is not eligible', notStarted.size === 1 && notStarted.eligible_seat_ids.includes('SEAT-2'), { size: notStarted.size });
    const onBoundary = computeElectorate({ seats: [seat(1, { term_start: '2026-10-05', term_end: '2026-10-05' })], recusals: [], day: '2026-10-05' });
    check('EL-006b', 'The term boundary days themselves are inside the appointment', onBoundary.size === 1, { size: onBoundary.size, excluded: onBoundary.excluded });

    // EL-007 — a clean committee
    const clean = computeElectorate({ seats: base, recusals: [] });
    check('EL-007', 'With no recusals every valid seat is eligible, with unique seat ids', clean.size === 5 && new Set(clean.eligible_seat_ids).size === 5, { size: clean.size, ids: clean.eligible_seat_ids });

    // EL-008 — the shape that produced "0 eligible against 13 recorded votes"
    const empty = computeElectorate({ seats: [], recusals: [] });
    check('EL-008', 'No seats yields an electorate of zero, never a padded one', empty.size === 0 && empty.eligible_seat_ids.length === 0, { size: empty.size, excluded: empty.excluded });

    // EL-009 — an identifier recusal excludes even when no name matches anyone
    // EL-009 — an identifier recusal excludes even when no name matches anyone.
    // (An earlier version of this assertion expected 3 eligible seats; one seat is excluded by
    // identifier, so 4 remain. The assertion was wrong, not the rule.)
    const idOnly = computeElectorate({ seats: base, recusals: [{ id: 'R1', status: 'active', committee_membership_id: 'SEAT-1', member_name: 'Someone Else Entirely' }] });
    check('EL-009', 'An identifier recusal excludes by identity alone, independently of any name', idOnly.size === 4 && idOnly.excluded.recused_by_identifier === 1 && idOnly.excluded.legacy_name_match === 0, { size: idOnly.size, excluded: idOnly.excluded });

    // EL-010 — principal + alternate held by ONE person: a recusal removes both seats
    const twoSeatsOnePerson = computeElectorate({
      seats: [seat(1, { role: 'chair' }), seat(9, { user_id: 'USER-1', role: 'alternate', full_name: 'Member 1 (alternate)' })],
      recusals: [{ id: 'R1', status: 'active', member_user_id: 'USER-1' }],
    });
    check('EL-010', 'One person holding two seats (principal + alternate) is removed from both, so one person cannot vote twice', twoSeatsOnePerson.size === 0 && twoSeatsOnePerson.excluded.recused_by_identifier === 2, { size: twoSeatsOnePerson.size, excluded: twoSeatsOnePerson.excluded });

    const failed = results.filter((r) => r.verdict === 'FAIL');
    return Response.json({
      eligibility_policy_version: ELIGIBILITY_POLICY_VERSION,
      suites: { vote_eligibility: { total: results.length, passed: results.length - failed.length, failed: failed.length, verdict: failed.length === 0 ? 'PASS' : 'FAIL' } },
      // Failures are listed FIRST so a failing case can never be hidden by output truncation.
      failures: failed.map((r) => ({ test_id: r.test_id, description: r.description, detail: r.detail })),
      writes_performed: 0,
      results,
      evidence_ids: results.map((r) => `E-A06-${r.test_id}`),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}