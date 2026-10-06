// circulationRoundContext.ts — the ONE place that turns an APPROVED circulation round into the same
// frozen-round shape issuance already evaluates, so a decision approved by written resolution can be
// issued instead of dying at "no frozen round".
//
// Why this module exists (dead-end rule, D-041 class): IssueDecision refuses to issue without a frozen
// round, precisely so that issuance can never rest on a live recomputation. A written resolution
// freezes its own evidence — the eligible seats at dispatch, the text, the rule, each authenticated
// response — so it IS a frozen round, described the same way, and issuance reads it through the same
// evaluation. What it is NOT: a vote. The route is named in the basis text, so a package never
// pretends a ballot round existed.
import { CIRCULATION_CONTRACT_VERSION, CIRCULATION_STATES } from './circulationApproval.ts';
import { ELIGIBILITY_POLICY_VERSION } from './voteEligibility.ts';

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));
const day = (v: any): string | null => (typeof v === 'string' && v.length >= 10 ? v.slice(0, 10) : null);

/** A response becomes a ballot under the choice vocabulary the integrity evaluator already reads. */
const CHOICE = { approve: 'for', reject: 'against', abstain: 'abstain' };

export async function circulationAsFrozenRound(sr: any, { decision_id, committee_id }: { decision_id: string; committee_id: string }) {
  const rounds = arr(await sr.entities.CirculationRound
    .filter({ decision_id }, { sort: '-created_date', limit: 20 })
    .catch(() => []));
  const approved = rounds.filter((r: any) => r.state === CIRCULATION_STATES.APPROVED);

  // Two approved rounds for one decision is a contradiction to settle, never a pick by sort order.
  if (approved.length > 1) {
    return {
      round: null, conflict: 'multiple_approved_circulation_rounds',
      basis: 'more than one APPROVED circulation round exists for this decision — no round is chosen, so no package may be issued on this evidence',
    };
  }
  const round = approved[0] || null;
  if (!round) return { round: null, conflict: null, basis: 'no approved circulation round exists for this decision' };

  // An approval that was invalidated by a material amendment is NOT an approval.
  if (Number(round.invalidated_response_count || 0) > 0) {
    return {
      round: null, conflict: 'invalidated_responses_present',
      basis: 'the approved circulation round contains responses invalidated by a material amendment; issuance does not rest on invalidated approvals',
    };
  }

  const responses = arr(await sr.entities.CirculationResponse.filter({ round_id: round.id }, { limit: 200 }).catch(() => []));
  const usable = responses.filter((r: any) => !r.invalidated_at && r.response && r.response !== 'pending');
  const recused = usable.filter((r: any) => r.response === 'recuse').map((r: any) => r.seat_id);
  const eligible = (round.eligible_seat_ids || []).filter((id: string) => !recused.includes(id));

  const allMemberships = arr(await sr.entities.CommitteeMembership.filter({ committee_id }).catch(() => []));
  const byId = new Map(allMemberships.map((m: any) => [m.id, m]));
  const unresolved = eligible.filter((id: string) => !byId.has(id));
  // Seats are presented AS FROZEN — today's register never re-elects the electorate.
  const memberships = eligible.filter((id: string) => byId.has(id))
    .map((id: string) => ({ ...byId.get(id), id, status: 'active', voting_right: true }));

  const ballots = usable
    .filter((r: any) => CHOICE[r.response])
    .map((r: any) => ({
      id: r.id,
      voter_membership_id: r.seat_id,
      voter_user_id: r.user_id,
      voter_name: r.person_name || null,
      eligible_voter_snapshot_id: round.id,
      vote_choice: CHOICE[r.response],
      vote_method: 'circulation',
      voted_at: r.responded_at || null,
      capacity_at_response: r.capacity_at_response || null,
    }));

  const asOf = day(round.dispatched_at) || day(round.created_date);

  return {
    round: {
      id: round.id,
      round: round.round_number || 1,
      eligible_seat_ids: eligible,
      eligible_count: eligible.length,
      proposal_version: round.proposal_version,
      proposal_sha256: round.proposal_sha256,
      proposal_content: round.proposal_content,
      frozen_on: asOf,
      eligibility_policy_version: `${ELIGIBILITY_POLICY_VERSION} + ${CIRCULATION_CONTRACT_VERSION}`,
      quorum_required: round.quorum_required,
      voting_rule: round.rule,
      status: 'active',
      supersedes_snapshot_id: round.supersedes_round_id || null,
    },
    round_status: 'active',
    selection: 'circulation_round',
    route: 'circulation',
    conflict: null,
    superseded_by: null,
    rounds_seen: rounds.length,
    as_of: asOf,
    memberships,
    // A recused seat was removed from the electorate above; it is not a committee recusal record here.
    recusals: [],
    ballots,
    out_of_round_votes: [],
    unresolved_seat_ids: unresolved,
    basis: `decision by circulation round ${round.round_number || 1} (approved, written resolution) — ${eligible.length} seat(s) eligible from dispatch on ${asOf || '—'}; rule ${round.rule}${round.quorum_required ? `; participation required ${round.quorum_required}` : ''}; ${ballots.length} authenticated response(s) counted (delivery and acknowledgment are not responses; silence is never approval); contract ${CIRCULATION_CONTRACT_VERSION}`,
  };
}