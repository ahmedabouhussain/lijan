// voteEligibility.ts — the ONE rule that computes the eligible electorate of a voting round.
//
// Both the command that OPENS a vote and the test that asserts the electorate use this module, so
// what a vote is opened against is exactly what can be asserted about it.
//
// The rule is deliberately narrow and fails toward exclusion, never toward permission:
//   • A seat outside its own term window is not eligible.
//   • Recusal is matched by IDENTIFIER — the seat or the person. One person holding two seats
//     (principal + alternate) is removed from BOTH, so one person can never cast two votes.
//   • A legacy NAME match is kept only as an ADDITIONAL exclusion. It can only remove someone from
//     the electorate, never grant a vote, and every such exclusion is counted and reported.
//   • An electorate of zero is returned as zero — the caller stops. It is never padded.

export const ELIGIBILITY_POLICY_VERSION = "vote-eligibility-1.0.0";

const norm = (v) => String(v || "").trim().replace(/\s+/g, " ").toLowerCase();

const coversDay = (row, day) =>
  (!row.term_start || day >= row.term_start) && (!row.term_end || day <= row.term_end);

/**
 * @param seats    active CommitteeMembership rows with a voting right
 * @param recusals active Recusal rows for the same committee
 * @param day      the day the electorate is frozen for (YYYY-MM-DD)
 */
export function computeElectorate({ seats = [], recusals = [], day = new Date().toISOString().slice(0, 10) } = {}) {
  const inTerm = [];
  const outOfTerm = [];
  for (const s of seats || []) (coversDay(s, day) ? inTerm : outOfTerm).push(s);

  const recusedIds = new Set();
  const recusedNames = new Set();
  for (const r of recusals || []) {
    for (const id of [r.member_user_id, r.user_id, r.membership_id, r.committee_membership_id, r.member_id]) {
      if (id) recusedIds.add(id);
    }
    if (r.member_name) recusedNames.add(norm(r.member_name));
  }

  const eligible = [];
  const excludedRows = outOfTerm.map((s) => `${s.id}|out_of_term`);
  let recusedByIdentifier = 0;
  let legacyNameMatch = 0;
  for (const s of inTerm) {
    if (recusedIds.has(s.id) || (s.user_id && recusedIds.has(s.user_id))) {
      recusedByIdentifier += 1;
      excludedRows.push(`${s.id}|recused_by_identifier`);
      continue;
    }
    if (recusedNames.size > 0 && recusedNames.has(norm(s.full_name))) {
      legacyNameMatch += 1;
      excludedRows.push(`${s.id}|legacy_name_match`);
      continue;
    }
    eligible.push(s);
  }

  return {
    policy_version: ELIGIBILITY_POLICY_VERSION,
    day,
    eligible,
    eligible_seat_ids: eligible.map((s) => s.id),
    eligible_seats: eligible.map((s) => ({ seat_id: s.id, user_id: s.user_id || null, role: s.role || null })),
    // The excluded seats are NAMED with their reason, so an electorate can always be accounted for
    // seat by seat rather than only as a total.
    excluded_seat_rows: excludedRows,
    size: eligible.length,
    excluded: {
      out_of_term: outOfTerm.length,
      recused_by_identifier: recusedByIdentifier,
      legacy_name_match: legacyNameMatch,
      legacy_name_match_is_deny_only: true,
    },
  };
}