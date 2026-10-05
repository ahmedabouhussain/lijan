// roundContext.ts — the ONE place that answers "which round, whose seats, which ballots" for a
// decision: for issuing it, and for every governed read of it.
//
// Two failures this module exists to prevent (both named in the 5 October review):
//   • Issuance read ALL votes of a decision and then resolved the FROZEN seat ids through TODAY's
//     active memberships — so a seat that ended after the round froze made the round "unresolvable",
//     and a ballot cast in an EARLIER round could be counted in a later one.
//   • The governed read rebuilt issuance from the current register, which REWRITES the historical
//     electorate: rechecking authority today must never change who was eligible at the event time.
//
// The rule: the FROZEN ROUND is the authority for who was eligible and for which ballots belong to
// it. Current rows are used only to recover the acting person's recorded name/post — never to
// re-elect the electorate. A missing frozen round is reported as MISSING and blocks issuance; it is
// not replaced by a live recomputation, which is weaker evidence and must not stand in for one. An
// alternative procedure would have to be defined and policy-authorized; none is, so none is applied.

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));
const day = (v: any): string | null => (typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : null);

export async function loadRoundContext(sr: any, { decision_id, committee_id }: { decision_id: string; committee_id: string }) {
  const [roundRows, allMemberships, allRecusals, allVotes] = await Promise.all([
    sr.entities.EligibleVoterSnapshot.filter({ decision_id, status: "active" }, { sort: "-created_date", limit: 1 }).catch(() => []),
    // ALL seats of the committee, ended ones included: an appointment that has since finished is
    // still the seat that voted in the round that is being read.
    sr.entities.CommitteeMembership.filter({ committee_id }).catch(() => []),
    sr.entities.Recusal.filter({ committee_id }).catch(() => []),
    sr.entities.Vote.filter({ decision_id }).catch(() => []),
  ]);

  const round = arr(roundRows)[0] || null;
  const votes = arr(allVotes);

  if (!round) {
    return {
      round: null,
      as_of: null,
      memberships: [],
      recusals: [],
      ballots: [],
      out_of_round_votes: votes,
      unresolved_seat_ids: [],
      basis: "no frozen voting round exists for this decision",
    };
  }

  const asOf = day(round.frozen_on) || day(round.frozen_at) || null;
  const byId = new Map(arr(allMemberships).map((m: any) => [m.id, m]));
  const seatIds: string[] = round.eligible_seat_ids || [];
  const unresolved = seatIds.filter((id) => !byId.has(id));

  // The seats are presented AS FROZEN. Term and status are NOT re-decided here: the round already
  // established eligibility on its freeze day, and re-testing today's register would rewrite history.
  const memberships = seatIds
    .filter((id) => byId.has(id))
    .map((id) => ({ ...byId.get(id), id, status: "active", voting_right: true }));

  // Recusals are read as they stood ON THE FREEZE DAY, not as they stand today: a recusal lifted
  // afterwards was still in force when the round was frozen, and one declared afterwards was not.
  const recusals = arr(allRecusals)
    .filter((r: any) => (!r.start_time || !asOf || day(r.start_time) <= asOf) && (!r.end_time || !asOf || day(r.end_time) >= asOf))
    .map((r: any) => ({ ...r, status: "active" }));

  // A ballot belongs to the round it was cast against. A ballot bound to another round is REPORTED,
  // never counted in this one.
  const ballots = votes.filter((v: any) => v.eligible_voter_snapshot_id === round.id);
  const outOfRound = votes.filter((v: any) => v.eligible_voter_snapshot_id !== round.id);

  return {
    round,
    as_of: asOf,
    memberships,
    recusals,
    ballots,
    out_of_round_votes: outOfRound,
    unresolved_seat_ids: unresolved,
    basis: `frozen round ${round.round || 1} — ${seatIds.length} seat(s) frozen on ${asOf || "—"}; eligibility policy ${round.eligibility_policy_version || "—"}; proposal version ${round.proposal_version || "—"}`,
  };
}