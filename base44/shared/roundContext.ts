// roundContext.ts — the ONE place that answers "which round, whose seats, which ballots" for a
// decision: for issuing it, and for every governed read of it.
//
// CONTRACT VERSION: round-context-1.1.0 (5 Oct 2026 — second slice).
//
// Two failures this module exists to prevent (both named in the 5 October review):
//   • Issuance read ALL votes of a decision and then resolved the FROZEN seat ids through TODAY's
//     active memberships — so a seat that ended after the round froze made the round "unresolvable",
//     and a ballot cast in an EARLIER round could be counted in a later one.
//   • The governed read rebuilt issuance from the current register, which REWRITES the historical
//     electorate: rechecking authority today must never change who was eligible at the event time.
//
// 1.1.0 adds the two things the review found still missing:
//   • HISTORY BINDING. Only the ACTIVE round was ever resolved, so once round 2 superseded round 1 —
//     exactly what a re-vote or a correction produces — a decision validly issued from round 1 was
//     re-verified against round 2's electorate and ballots and read as INCONSISTENT: a false
//     accusation against a valid official record. A caller re-verifying an EXISTING package now names
//     the round it was issued from (`round_id` / `round_number`) and gets THAT round, whatever its
//     status, with the supersession reported.
//   • NO SILENT CHOICE. With more than one ACTIVE round the newest was picked — a choice of electorate
//     made by a sort order. That contradiction now returns NO round at all
//     (`conflict: "multiple_active_rounds"`), so the caller must refuse rather than proceed.
//
// The rule: the FROZEN ROUND is the authority for who was eligible and for which ballots belong to
// it. Current rows are used only to recover the acting person's recorded name/post — never to
// re-elect the electorate. A missing frozen round is reported as MISSING and blocks issuance; it is
// not replaced by a live recomputation, which is weaker evidence and must not stand in for one. An
// alternative procedure would have to be defined and policy-authorized; none is, so none is applied.

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));
const day = (v: any): string | null => (typeof v === "string" && v.length >= 10 ? v.slice(0, 10) : null);
const statusOf = (r: any): string => r?.status || "active";

export async function loadRoundContext(
  sr: any,
  { decision_id, committee_id, round_id = null, round_number = null }:
    { decision_id: string; committee_id: string; round_id?: string | null; round_number?: number | null },
) {
  const [roundRows, allMemberships, allRecusals, allVotes] = await Promise.all([
    // EVERY frozen round of this decision, ACTIVE and SUPERSEDED alike: a superseded round is still
    // the round a package was issued from, and it must stay readable. The selector is applied below.
    sr.entities.EligibleVoterSnapshot
      .filter({ decision_id, status: { $in: ["active", "superseded"] } }, { sort: "-created_date", limit: 50 })
      .catch(() => []),
    // ALL seats of the committee, ended ones included: an appointment that has since finished is
    // still the seat that voted in the round that is being read.
    sr.entities.CommitteeMembership.filter({ committee_id }).catch(() => []),
    sr.entities.Recusal.filter({ committee_id }).catch(() => []),
    sr.entities.Vote.filter({ decision_id }).catch(() => []),
  ]);

  const rounds = arr(roundRows);
  const votes = arr(allVotes);
  const active = rounds.filter((r: any) => statusOf(r) === "active");

  let round: any = null;
  let selection = "active_round";
  let conflict: string | null = null;
  if (round_id) {
    round = rounds.find((r: any) => r.id === round_id) || null;
    selection = "named_round_id";
  } else if (round_number != null) {
    round = rounds.find((r: any) => Number(r.round) === Number(round_number)) || null;
    selection = "named_round_number";
  } else if (active.length > 1) {
    // Choosing one of these by sort order would decide the electorate by accident. No round is chosen.
    conflict = "multiple_active_rounds";
    selection = "none_conflicting";
  } else {
    round = active[0] || null;
  }

  const supersededBy = round ? (rounds.find((r: any) => r.supersedes_snapshot_id === round.id) || null) : null;

  if (!round) {
    return {
      round: null,
      round_status: null,
      selection,
      conflict,
      superseded_by: null,
      rounds_seen: rounds.length,
      as_of: null,
      memberships: [],
      recusals: [],
      ballots: [],
      out_of_round_votes: votes,
      unresolved_seat_ids: [],
      basis: conflict === "multiple_active_rounds"
        ? "more than one ACTIVE frozen round exists for this decision — no round is chosen, so no package may be issued or certified on this evidence"
        : "no frozen voting round exists for this decision",
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
    round_status: statusOf(round),
    selection,
    conflict: null,
    superseded_by: supersededBy ? { id: supersededBy.id, round: supersededBy.round || null, status: statusOf(supersededBy) } : null,
    rounds_seen: rounds.length,
    as_of: asOf,
    memberships,
    recusals,
    ballots,
    out_of_round_votes: outOfRound,
    unresolved_seat_ids: unresolved,
    basis: `frozen round ${round.round || 1} (${statusOf(round)}) — ${seatIds.length} seat(s) frozen on ${asOf || "—"}; eligibility policy ${round.eligibility_policy_version || "—"}; proposal version ${round.proposal_version || "—"}`,
  };
}