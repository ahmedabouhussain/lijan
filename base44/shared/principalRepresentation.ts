// principalRepresentation.ts — WHO VOTES when one person holds more than one seat.
//
// CONTRACT VERSION: principal-representation-1.0.0 (6 Oct 2026 — S23).
//
// The defect this module answers (measured, not assumed): the platform counted an ELECTORATE IN SEATS
// while it admitted BALLOTS PER PERSON. Where one person holds two voting seats, the electorate read as
// N seats while the real capacity was N-1 voters, and nothing said so:
//   • A vote could be opened against a quorum the committee can never reach.
//   • A written resolution was worse: `computeOutcome` required a response on EVERY eligible seat, and
//     the second seat of one person is refused by contract (`duplicate_principal`) — so a round with a
//     unanimous approval from every person could never reach `ready`, and could only expire into
//     `not_carried`. A committee with one dual-seat member could never approve by circulation.
//
// The rule, stated ONCE here and consumed by every path that opens or answers a round:
//   1. Seats are the unit of ELIGIBILITY; persons are the unit of VOTING CAPACITY. Both are reported.
//   2. Whether a person holding two seats carries two votes or one is the INSTITUTION'S OWN choice
//      (per_seat · per_person). It is never assumed: while the choice is unrecorded and a dual-seat
//      holder is actually IN the electorate, the affected act stops with the choice named.
//   3. Before a round is opened, the arithmetic is stated: a required quorum the recorded basis can
//      never produce refuses the round instead of opening one that cannot conclude.
//   4. Every seat that carries no separate vote is named with its reason and with the voting seat of
//      the same person — an electorate is never reduced silently.
//
// Reading no records and writing none: pure policy, so a test asserts the exact object every handler
// consumes.
export const PRINCIPAL_REPRESENTATION_VERSION = 'principal-representation-1.0.0';

export const PRINCIPAL_BASES = { PER_SEAT: 'per_seat', PER_PERSON: 'per_person' };
export const PRINCIPAL_BASIS_VALUES = [PRINCIPAL_BASES.PER_SEAT, PRINCIPAL_BASES.PER_PERSON];

/** The two choices the institution may record. Named back to it whenever the choice is unresolved. */
export const PRINCIPAL_AUTHORIZED_CHOICES = [
  {
    value: PRINCIPAL_BASES.PER_PERSON,
    ar: 'صوت واحد للشخص: يُحتسب الشخص مرة واحدة مهما حمل من مقاعد، ويُسمّى المقعد الذي يحمل الصوت.',
    en: 'One vote per person: the person counts once however many seats they hold, and the seat carrying the vote is named.',
  },
  {
    value: PRINCIPAL_BASES.PER_SEAT,
    ar: 'صوت لكل مقعد: يحمل كل مقعد تصويتي صوته المستقل، ويُحتسب النصاب بالمقاعد.',
    en: 'One vote per seat: each voting seat carries its own vote and the quorum is counted in seats.',
  },
];

/** The institution's own record of its choice. The ONLY source this contract accepts. */
export const principalBasisKey = (committeeId) => `principal_basis:${committeeId}`;

export const PRINCIPAL_REFUSALS = {
  principal_basis_unresolved: {
    code: 'principal_basis_unresolved',
    ar: 'يحمل شخص واحد أكثر من مقعد تصويت في هذه الهيئة، ولم تسجّل المؤسسة بعد هل يحمل المقعدان صوتين أم صوتًا واحدًا؛ لا يُفتح الدور على قاعدة غير مكتوبة.',
    en: 'One person holds more than one voting seat here, and the institution has not recorded whether those seats carry two votes or one; no round is opened on an unwritten rule.',
  },
  quorum_unreachable: {
    code: 'quorum_unreachable',
    ar: 'النصاب المطلوب يتجاوز ما يمكن أن تنتجه هذه الهيئة على الأساس المسجَّل؛ لا تُفتح دورة لا يمكن بلوغ نصابها.',
    en: 'The required quorum exceeds what this committee can produce under the recorded basis; a round whose quorum cannot be reached is not opened.',
  },
  principal_basis_invalid: {
    code: 'principal_basis_invalid',
    ar: 'أساس التصويت المسجَّل غير معروف؛ يُرفض قبل أي حساب.',
    en: 'The recorded voting basis is not recognised; it is refused before any count.',
  },
};

/** A recorded choice read from the institution's own policy row. Null when nothing is recorded. */
export function readRecordedBasis(row) {
  const payload = row && row.payload;
  if (!payload || typeof payload !== 'object') return null;
  if (!payload.basis) return null;
  return {
    basis: payload.basis,
    basis_reference: payload.basis_reference || null,
    policy_version: payload.policy_version || null,
    contract_version: payload.contract_version || null,
    recorded_by_name: payload.recorded_by_name || null,
    recorded_at: payload.recorded_at || null,
    source: 'institution_record',
  };
}

// Deterministic order used to name WHICH seat carries the person's single vote under per_person: the
// earliest seat the institution created, then by id. Declared, reproducible, and reported on the round.
const orderKey = (seat) => `${seat.created_date || ''}|${seat.id || ''}`;

/**
 * @param eligibleSeats  the seats the eligibility rule already accepted (out-of-term and recused seats
 *                       are resolved BEFORE this module: representation never re-admits an excluded seat)
 * @param basis          the basis recorded by the institution, or null when it recorded none
 * @param quorumRequired the quorum the round will be tested against, or null when it is not known yet
 */
export function assessRepresentation({
  eligibleSeats = [],
  basis = null,
  basisReference = null,
  basisSource = null,
  quorumRequired = null,
} = {}) {
  const seats = (eligibleSeats || []).filter(Boolean);

  // A principal is a PERSON with an account. A seat carrying no account is not a second vote: it is
  // simply not workable, which the readiness measure reports separately.
  const byPerson = new Map();
  for (const seat of seats) {
    if (!seat.user_id) continue;
    const list = byPerson.get(seat.user_id) || [];
    list.push(seat);
    byPerson.set(seat.user_id, list);
  }
  const multiSeatPrincipals = [...byPerson.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([user_id, list]) => ({
      user_id,
      name: list[0].full_name || list[0].full_name_ar || list[0].user_email || null,
      seat_ids: list.map((s) => s.id).sort(),
      seat_count: list.length,
    }));

  const basisRequired = multiSeatPrincipals.length > 0;
  const base = {
    contract_version: PRINCIPAL_REPRESENTATION_VERSION,
    eligible_seat_count: seats.length,
    basis_required: basisRequired,
    multi_seat_principals: multiSeatPrincipals,
    authorized_choices: PRINCIPAL_AUTHORIZED_CHOICES,
  };

  if (basis && !PRINCIPAL_BASIS_VALUES.includes(basis)) {
    return {
      ...base,
      basis: basis,
      basis_source: basisSource || 'institution_record',
      basis_reference: basisReference,
      voting_seat_ids: [],
      voter_count: 0,
      non_voting_seats: [],
      max_voters: 0,
      quorum_required: quorumRequired === null || quorumRequired === undefined ? null : Number(quorumRequired),
      quorum_reachable: null,
      refusal: { ...PRINCIPAL_REFUSALS.principal_basis_invalid, recorded_basis: basis, refused_before_write: true },
    };
  }

  // (2) An unrecorded choice is not decided for the institution: the affected act stops, and the exact
  // persons and seats that raised the question are named so it can be recorded.
  if (basisRequired && !basis) {
    return {
      ...base,
      basis: null,
      basis_source: 'unresolved',
      basis_reference: null,
      voting_seat_ids: [],
      voter_count: 0,
      non_voting_seats: [],
      max_voters: 0,
      quorum_required: quorumRequired === null || quorumRequired === undefined ? null : Number(quorumRequired),
      quorum_reachable: null,
      refusal: {
        ...PRINCIPAL_REFUSALS.principal_basis_unresolved,
        multi_seat_principals: multiSeatPrincipals,
        authorized_choices: PRINCIPAL_AUTHORIZED_CHOICES,
        refused_before_write: true,
      },
    };
  }

  // Only reached when the question does not arise, so the effective basis here cannot disenfranchise
  // anybody: every eligible seat carries its own vote exactly as it does today.
  const effectiveBasis = basis || PRINCIPAL_BASES.PER_PERSON;

  const nonVotingSeats = [];
  if (basisRequired && effectiveBasis === PRINCIPAL_BASES.PER_PERSON) {
    for (const principal of multiSeatPrincipals) {
      const ordered = [...(byPerson.get(principal.user_id) || [])].sort((a, b) => (orderKey(a) < orderKey(b) ? -1 : 1));
      const voting = ordered[0];
      for (const seat of ordered.slice(1)) {
        nonVotingSeats.push({
          seat_id: seat.id,
          reason: 'duplicate_principal_seat',
          held_by_user_id: principal.user_id,
          voting_seat_id: voting.id,
        });
      }
    }
  }

  const nonVotingIds = new Set(nonVotingSeats.map((n) => n.seat_id));
  // Deterministic ORDER as well as deterministic content: two assessments of the same seats produce the
  // identical frozen array, whatever order the records happened to be read in.
  const votingSeatIds = seats
    .filter((s) => !nonVotingIds.has(s.id))
    .sort((a, b) => (orderKey(a) < orderKey(b) ? -1 : 1))
    .map((s) => s.id);
  const maxVoters = votingSeatIds.length;
  const quorum = quorumRequired === null || quorumRequired === undefined ? null : Number(quorumRequired);
  const quorumReachable = quorum === null || Number.isNaN(quorum) ? null : quorum <= maxVoters;

  // (3) The arithmetic, stated before anything is written.
  const refusal = quorumReachable === false
    ? {
      ...PRINCIPAL_REFUSALS.quorum_unreachable,
      quorum_required: quorum,
      max_voters: maxVoters,
      basis: effectiveBasis,
      refused_before_write: true,
    }
    : null;

  return {
    ...base,
    basis: effectiveBasis,
    basis_source: basis ? (basisSource || 'institution_record') : 'not_required',
    basis_reference: basisReference,
    voting_seat_ids: votingSeatIds,
    voter_count: maxVoters,
    non_voting_seats: nonVotingSeats,
    max_voters: maxVoters,
    quorum_required: quorum,
    quorum_reachable: quorumReachable,
    refusal,
  };
}

/** The refusal shape every handler returns unchanged, so the same stop reads the same everywhere. */
export function representationRefusal(assessment, correlationId = null) {
  const r = assessment && assessment.refusal;
  if (!r) return null;
  return {
    error: r.en,
    error_ar: r.ar,
    code: r.code,
    refused_before_write: true,
    basis_required: !!assessment.basis_required,
    multi_seat_principals: assessment.multi_seat_principals || [],
    authorized_choices: assessment.authorized_choices || PRINCIPAL_AUTHORIZED_CHOICES,
    eligible_seat_count: assessment.eligible_seat_count ?? null,
    max_voters: assessment.max_voters ?? null,
    quorum_required: r.quorum_required ?? assessment.quorum_required ?? null,
    contract_version: PRINCIPAL_REPRESENTATION_VERSION,
    correlation_id: correlationId,
  };
}