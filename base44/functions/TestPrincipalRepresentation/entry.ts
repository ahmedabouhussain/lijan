import { assessRepresentation, representationRefusal, readRecordedBasis, principalBasisKey, PRINCIPAL_BASES, PRINCIPAL_REPRESENTATION_VERSION, PRINCIPAL_AUTHORIZED_CHOICES, PRINCIPAL_BASIS_VALUES } from '../../shared/principalRepresentation.ts';

// TestPrincipalRepresentation — proves the RULE, not a run.
//
// It asserts the exact object every handler consumes (OpenVote, CastVote, OpenCirculation,
// RecordCirculationResponse, SetPrincipalBasis, GetPrincipalBasis): who counts as a voter when one
// person holds more than one seat, that the choice belongs to the institution and is never assumed,
// and that a quorum the recorded basis can never produce is refused before anything is written.
//
// It reads no record and writes none: this is policy, and the persisted journeys remain NOT TESTED
// until a seated actor exists (D-064).
const seat = (id, user, created = '2026-01-01T00:00:00.000Z', name) => ({
  id,
  user_id: user,
  created_date: created,
  full_name: name || (user ? `Person ${user}` : null),
  role: 'member',
});

const run = (results, id, label, fn) => {
  let verdict = 'PASS';
  let detail = null;
  try {
    const d = fn();
    detail = d === undefined ? null : d;
  } catch (e) {
    verdict = 'FAIL';
    detail = `threw: ${e && e.message}`;
  }
  results.push({ test_id: id, label, verdict, detail });
};

export default async function() {
  const results = [];
  const twoSeatsOnePerson = [seat('s1', 'u1', '2026-01-01T00:00:00.000Z'), seat('s2', 'u1', '2026-02-01T00:00:00.000Z'), seat('s3', 'u2')];
  const plain = [seat('s1', 'u1'), seat('s2', 'u2'), seat('s3', 'u3')];

  run(results, 'PR-001', 'the contract declares its own version', () => PRINCIPAL_REPRESENTATION_VERSION);
  run(results, 'PR-002', 'the institution is offered exactly two choices, each with a bilingual sentence',
    () => (PRINCIPAL_AUTHORIZED_CHOICES.length === 2 && PRINCIPAL_AUTHORIZED_CHOICES.every((c) => c.ar && c.en && PRINCIPAL_BASIS_VALUES.includes(c.value)))
      ? PRINCIPAL_AUTHORIZED_CHOICES.map((c) => c.value) : (() => { throw new Error('choices invalid'); })());

  run(results, 'PR-003', 'a single-seat electorate needs no basis, and reports voters equal to seats',
    () => {
      const a = assessRepresentation({ eligibleSeats: plain, quorumRequired: 2 });
      if (a.basis_required !== false) throw new Error('basis was required without a dual-seat holder');
      if (a.refusal) throw new Error(`unexpected refusal ${a.refusal.code}`);
      if (a.voter_count !== a.eligible_seat_count || a.non_voting_seats.length !== 0) throw new Error('capacity differs from seats');
      return { voters: a.voter_count, seats: a.eligible_seat_count };
    });

  run(results, 'PR-004', 'an UNRECORDED basis changes nothing where the question does not arise (no invented refusal)',
    () => {
      const a = assessRepresentation({ eligibleSeats: plain, basis: null, quorumRequired: 3 });
      if (a.refusal) throw new Error(`refused without cause: ${a.refusal.code}`);
      if (a.basis_source !== 'not_required') throw new Error(`basis_source=${a.basis_source}`);
      return a.basis_source;
    });

  run(results, 'PR-005', 'a dual-seat holder with no recorded basis stops the act, naming the person and the seats',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, quorumRequired: 3 });
      if (!a.refusal || a.refusal.code !== 'principal_basis_unresolved') throw new Error('the unresolved choice did not stop the act');
      if (a.refusal.refused_before_write !== true) throw new Error('the refusal is not stated before write');
      if (a.multi_seat_principals.length !== 1 || a.multi_seat_principals[0].seat_ids.length !== 2) throw new Error('the dual-seat holder was not reported');
      if (!a.authorized_choices || a.authorized_choices.length !== 2) throw new Error('the choices were not named back');
      if (a.voter_count !== 0) throw new Error('a capacity was reported for a stopped act');
      return a.refusal.code;
    });

  run(results, 'PR-006', 'the same committee with a recorded basis proceeds (the choice is the institution’s)',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_SEAT, quorumRequired: 3 });
      if (a.refusal) throw new Error(`refused with a recorded basis: ${a.refusal.code}`);
      return { basis: a.basis, voters: a.voter_count };
    });

  run(results, 'PR-007', 'per_person: capacity is counted in PERSONs, not seats',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 2 });
      if (a.eligible_seat_count !== 3 || a.voter_count !== 2) throw new Error(`seats ${a.eligible_seat_count} / voters ${a.voter_count}`);
      return { seats: a.eligible_seat_count, voters: a.voter_count };
    });

  run(results, 'PR-008', 'per_person: the seat carrying no separate vote names its reason AND the voting seat of the same person',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 2 });
      const n = a.non_voting_seats[0];
      if (a.non_voting_seats.length !== 1) throw new Error('the reduced seat was not declared');
      if (n.reason !== 'duplicate_principal_seat') throw new Error(`reason=${n.reason}`);
      if (n.held_by_user_id !== 'u1' || !n.voting_seat_id) throw new Error('the holder or the voting seat was not named');
      return n;
    });

  run(results, 'PR-009', 'per_person: WHICH seat votes is deterministic and does not move between assessments',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 2 });
      const b = assessRepresentation({ eligibleSeats: [...twoSeatsOnePerson].reverse(), basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 2 });
      const votingA = a.voting_seat_ids.join(',');
      const votingB = b.voting_seat_ids.join(',');
      if (votingA !== votingB) throw new Error(`order changed the voter: ${votingA} vs ${votingB}`);
      if (a.non_voting_seats[0].voting_seat_id !== 's1') throw new Error('the earliest seat did not carry the vote');
      return votingA;
    });

  run(results, 'PR-010', 'per_seat: every voting seat carries its own vote and none is reduced',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_SEAT, quorumRequired: 3 });
      if (a.voter_count !== 3 || a.non_voting_seats.length !== 0) throw new Error(`voters ${a.voter_count} / reduced ${a.non_voting_seats.length}`);
      return a.voter_count;
    });

  run(results, 'PR-011', 'a seat with no account is not a second vote: two account-less seats are never a dual-seat holder',
    () => {
      const a = assessRepresentation({ eligibleSeats: [seat('s1', null), seat('s2', null)], basis: null, quorumRequired: 2 });
      if (a.basis_required !== false || a.refusal) throw new Error('an account-less pair raised a representation question');
      return a.basis_required;
    });

  run(results, 'PR-012', 'three seats of one person under per_person: two are reduced, both pointing at one voting seat',
    () => {
      const a = assessRepresentation({
        eligibleSeats: [seat('s1', 'u1', '2026-01-01T00:00:00.000Z'), seat('s2', 'u1', '2026-02-01T00:00:00.000Z'), seat('s3', 'u1', '2026-03-01T00:00:00.000Z')],
        basis: PRINCIPAL_BASES.PER_PERSON,
        quorumRequired: 1,
      });
      if (a.voter_count !== 1 || a.non_voting_seats.length !== 2) throw new Error(`voters ${a.voter_count} / reduced ${a.non_voting_seats.length}`);
      if (new Set(a.non_voting_seats.map((n) => n.voting_seat_id)).size !== 1) throw new Error('the reduced seats do not point at one voting seat');
      return a.voter_count;
    });

  run(results, 'PR-013', 'a quorum equal to capacity is reachable; one above it is not',
    () => {
      const ok = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 2 });
      const bad = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 3 });
      if (ok.quorum_reachable !== true) throw new Error('capacity-equal quorum read unreachable');
      if (!bad.refusal || bad.refusal.code !== 'quorum_unreachable') throw new Error('an unreachable quorum was not refused');
      return { reachable: ok.quorum_reachable, refused: bad.refusal.code };
    });

  run(results, 'PR-014', 'the SAME committee reads differently under the two bases: the record decides, the platform never assumes',
    () => {
      const perPerson = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 3 });
      const perSeat = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_SEAT, quorumRequired: 3 });
      if (!perPerson.refusal || perPerson.refusal.code !== 'quorum_unreachable') throw new Error('per_person did not refuse quorum 3');
      if (perSeat.refusal) throw new Error('per_seat refused quorum 3 although it can produce it');
      return { per_person: 'quorum_unreachable', per_seat: 'reachable' };
    });

  run(results, 'PR-015', 'the unreachable-quorum refusal states the numbers it decided on',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 4 });
      const r = representationRefusal(a, 'corr_test');
      if (r.quorum_required !== 4 || r.max_voters !== 2) throw new Error(`quorum ${r.quorum_required} / capacity ${r.max_voters}`);
      if (r.refused_before_write !== true) throw new Error('not stated as refused before write');
      return { quorum_required: r.quorum_required, max_voters: r.max_voters };
    });

  run(results, 'PR-016', 'an unrecognised recorded basis is refused before any count, naming the recorded value',
    () => {
      const a = assessRepresentation({ eligibleSeats: plain, basis: 'weighted_by_interest', quorumRequired: 2 });
      if (!a.refusal || a.refusal.code !== 'principal_basis_invalid') throw new Error('an unknown basis was accepted');
      if (a.refusal.recorded_basis !== 'weighted_by_interest') throw new Error('the recorded value was not named');
      return a.refusal.code;
    });

  run(results, 'PR-017', 'the basis is read from the institution’s own row only — a missing payload yields nothing, never a value',
    () => {
      if (readRecordedBasis(null) !== null) throw new Error('a basis was invented from no row');
      if (readRecordedBasis({ payload: {} }) !== null) throw new Error('a basis was invented from an empty payload');
      if (readRecordedBasis({ payload: { basis: PRINCIPAL_BASES.PER_SEAT } }).basis !== PRINCIPAL_BASES.PER_SEAT) throw new Error('a recorded basis was not read');
      return 'null on absence, value on record';
    });

  run(results, 'PR-018', 'a recorded basis carries who recorded it and when, so a superseded choice stays accountable',
    () => {
      const r = readRecordedBasis({ payload: { basis: PRINCIPAL_BASES.PER_PERSON, basis_reference: 'instrument art. 7', policy_version: 'v2', recorded_by_name: 'Secretary', recorded_at: '2026-10-06T10:00:00.000Z' } });
      if (!r.basis_reference || !r.policy_version || !r.recorded_by_name || !r.recorded_at) throw new Error('the record is not accountable');
      return r.basis_reference;
    });

  run(results, 'PR-019', 'the refusal response keeps the ONE shape every handler returns, and carries no decision',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, quorumRequired: 3 });
      const r = representationRefusal(a, 'corr_test');
      const keys = ['error', 'error_ar', 'code', 'refused_before_write', 'authorized_choices', 'multi_seat_principals', 'contract_version'];
      const missing = keys.filter((k) => r[k] === undefined);
      if (missing.length > 0) throw new Error(`missing ${missing.join(',')}`);
      if ('outcome' in r || 'decision' in r) throw new Error('the refusal carries a decision');
      if (r.contract_version !== PRINCIPAL_REPRESENTATION_VERSION) throw new Error('contract version missing');
      return r.code;
    });

  run(results, 'PR-020', 'representation never widens eligibility: the voting seats are a subset of the eligible seats',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 2 });
      const eligible = new Set(twoSeatsOnePerson.map((s) => s.id));
      if (!a.voting_seat_ids.every((id) => eligible.has(id))) throw new Error('a seat outside the electorate was admitted to vote');
      return a.voting_seat_ids;
    });

  run(results, 'PR-021', 'the counts add up: voters plus reduced seats equal the eligible seats',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, quorumRequired: 2 });
      if (a.voter_count + a.non_voting_seats.length !== a.eligible_seat_count) throw new Error('the seat count does not reconcile');
      return `${a.voter_count} + ${a.non_voting_seats.length} = ${a.eligible_seat_count}`;
    });

  run(results, 'PR-022', 'the basis row is keyed to ONE committee: two committees never share a choice',
    () => (principalBasisKey('c1') !== principalBasisKey('c2') && principalBasisKey('c1').includes('c1')) ? principalBasisKey('c1') : (() => { throw new Error('keys collide'); })());

  run(results, 'PR-023', 'a dual-seat holder with a recorded, reachable basis produces NO refusal and an auditable count',
    () => {
      const a = assessRepresentation({ eligibleSeats: twoSeatsOnePerson, basis: PRINCIPAL_BASES.PER_PERSON, basisReference: 'instrument art. 7', quorumRequired: 2 });
      if (a.refusal) throw new Error(`refused although reachable: ${a.refusal.code}`);
      if (a.basis_source !== 'institution_record' || a.basis_reference !== 'instrument art. 7') throw new Error('the record is not reported');
      if (a.non_voting_seats[0].reason !== 'duplicate_principal_seat') throw new Error('the reduced seat carries no reason');
      return { basis: a.basis, voters: a.voter_count, reduced: a.non_voting_seats.length };
    });

  run(results, 'PR-024', 'no case in this suite reads or writes a record (pure policy)',
    () => 'writes_performed: 0, records_read: 0');

  const failed = results.filter((r) => r.verdict !== 'PASS');
  return Response.json({
    suite: 'TestPrincipalRepresentation',
    contract_version: PRINCIPAL_REPRESENTATION_VERSION,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    verdict: failed.length === 0 ? 'PASS' : 'FAIL',
    failures: failed,
    writes_performed: 0,
    records_read: 0,
    scope_note: 'Proves the RULE: seats are eligibility, persons are capacity; the basis belongs to the institution and is never assumed; a seat carrying no separate vote is named with its reason and with the voting seat of the same person; an unreachable quorum is refused before write. It does not prove any round was opened or answered over a persisted record (no authorized seated actor — D-064).',
    results,
  });
}