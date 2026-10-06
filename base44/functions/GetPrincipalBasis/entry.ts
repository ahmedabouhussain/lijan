import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { computeElectorate } from '../../shared/voteEligibility.ts';
import {
  assessRepresentation, readRecordedBasis, principalBasisKey, PRINCIPAL_REPRESENTATION_VERSION,
  PRINCIPAL_AUTHORIZED_CHOICES,
} from '../../shared/principalRepresentation.ts';

// The options form of filter/list returns a PAGE ({items, …}), never an array. Every read here is
// normalised once, so a route can never iterate a page object as if it were its rows.
const asArray = (v: any) => (Array.isArray(v) ? v : (v && Array.isArray(v.items) ? v.items : []));

// GetPrincipalBasis — the governed read behind the surface that records WHO VOTES.
//
// It answers two questions on ONE committee, from records, with no writes:
//   • what basis the institution has recorded (or that it recorded none), and
//   • what that basis means for THIS electorate right now — how many seats are eligible, how many
//     voters they carry, which persons hold more than one seat, and whether the committee's own
//     quorum is reachable at all.
// A source that could not be read is NAMED, never reported as "no holders".
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { committee_id } = body;
    if (!committee_id) return Response.json({ error: 'committee_id is required' }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'read',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const unread = [];
    const basisRows = asArray(await sr.entities.GovernanceConfig
      .filter({ config_key: principalBasisKey(committee_id) }, { limit: 1 }).catch(() => { unread.push('GovernanceConfig (سجل السياسة)'); return []; }));
    const recorded = readRecordedBasis(basisRows[0] || null);

    const seats = await sr.entities.CommitteeMembership
      .filter({ committee_id, status: 'active', voting_right: true }, { limit: 200 })
      .then(asArray)
      .catch(() => { unread.push('CommitteeMembership (المقاعد التصويتية)'); return null; });
    const recusals = asArray(await sr.entities.Recusal
      .filter({ committee_id, status: 'active' }).catch(() => { unread.push('Recusal (سجل التنحّي)'); return []; }));

    const electorate = seats === null ? null : computeElectorate({ seats, recusals });
    const assessment = electorate
      ? assessRepresentation({
        eligibleSeats: electorate.eligible,
        basis: recorded ? recorded.basis : null,
        basisReference: recorded ? recorded.basis_reference : null,
        quorumRequired: auth.committee ? auth.committee.quorum_count ?? null : null,
      })
      : null;

    return Response.json({
      status: 'ok',
      contract_version: PRINCIPAL_REPRESENTATION_VERSION,
      config_key: principalBasisKey(committee_id),
      recorded: recorded
        ? {
          basis: recorded.basis, basis_reference: recorded.basis_reference, policy_version: recorded.policy_version,
          recorded_by_name: recorded.recorded_by_name, recorded_at: recorded.recorded_at,
        }
        : null,
      authorized_choices: PRINCIPAL_AUTHORIZED_CHOICES,
      assessment: assessment
        ? {
          basis: assessment.basis,
          basis_source: assessment.basis_source,
          basis_required: assessment.basis_required,
          eligible_seat_count: assessment.eligible_seat_count,
          voter_count: assessment.voter_count,
          multi_seat_principals: assessment.multi_seat_principals,
          non_voting_seats: assessment.non_voting_seats,
          quorum_required: assessment.quorum_required,
          max_voters: assessment.max_voters,
          quorum_reachable: assessment.quorum_reachable,
          refusal: assessment.refusal ? { code: assessment.refusal.code, ar: assessment.refusal.ar, en: assessment.refusal.en } : null,
        }
        : null,
      excluded_seats: electorate ? electorate.excluded : null,
      unread_sources: unread,
      no_write: true,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}