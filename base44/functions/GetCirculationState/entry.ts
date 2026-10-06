import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import {
  computeOutcome, CIRCULATION_CONTRACT_VERSION, COLLECTING_STATES, CIRCULATION_TRANSITIONS,
} from '../../shared/circulationApproval.ts';

// GetCirculationState — the governed read behind the written-resolution surface.
//
// It exists so the surface tells the truth about what the committee may do: whether the route is
// enabled by the committee's OWN policy, which round is live, what THIS seat may answer on, and what
// the next authorized step is. A surface that guessed any of that from its own capability list would
// show actions the handler then refuses (the D-048 class).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { decision_id, committee_id = null } = body;
    if (!decision_id) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    const callerUser = await base44.auth.me().catch(() => null);
    const principal = await resolvePrincipal({ sr, body, callerUser });

    const decision = await sr.entities.Decision.get(decision_id).catch(() => null);
    if (!decision) return Response.json(refusalBody('not_found'), { status: 404 });

    const allowed = await authorizeRead({ base44, sr, principal, record: decision });
    if (!allowed.allowed) return Response.json(refusalBody(allowed.reason), { status: refusalStatus(allowed.reason) });

    // A written resolution is answered by a seated person under their own identity. A showcase
    // persona holds no row here, so the route is named as unavailable rather than half-shown.
    if (principal.kind !== 'user') {
      return Response.json({ status: 'unavailable_in_exploration', contract_version: CIRCULATION_CONTRACT_VERSION, decision_id });
    }
    const me = principal.user.id;

    const policyRows = await sr.entities.GovernanceConfig
      .filter({ config_key: `circulation_policy:${decision.committee_id}` }, { limit: 1 }).catch(() => []);
    const policy = ((policyRows && policyRows[0]) || {}).payload || null;

    const rounds = await sr.entities.CirculationRound
      .filter({ decision_id }, { sort: '-round_number', limit: 10 }).catch(() => []);
    const list = rounds || [];
    const live = list.find((r: any) => COLLECTING_STATES.includes(r.state) || r.state === 'ready') || null;
    const approved = list.filter((r: any) => r.state === 'approved');
    const current = live || (approved.length === 1 ? approved[0] : null) || list[0] || null;

    let responses = [];
    let myRow = null;
    let result = null;
    if (current) {
      responses = (await sr.entities.CirculationResponse.filter({ round_id: current.id }, { limit: 200 }).catch(() => [])) || [];
      myRow = responses.find((r: any) => r.user_id === me) || null;
      result = computeOutcome({ round: current, responses });
    }

    return Response.json({
      status: 'ok',
      enabled: !!(policy && policy.enabled === true),
      policy: policy ? {
        policy_version: policy.policy_version || null,
        finalizer_role: policy.finalizer_role || null,
        default_rule: policy.default_rule || null,
        default_deadline_hours: policy.default_deadline_hours || null,
        time_zone: policy.time_zone || null,
        permitted_matter_types: policy.permitted_matter_types || [],
        quorum_participation: policy.quorum_participation || null,
        allow_extension: policy.allow_extension === true,
        extension_count_limit: policy.extension_count_limit || 0,
      } : null,
      round: current,
      round_is_live: !!live,
      rounds_seen: list.length,
      ambiguous_approved_rounds: approved.length > 1,
      my_response_row: myRow,
      responses: responses.map((r: any) => ({
        seat_id: r.seat_id, user_id: r.user_id, person_name: r.person_name, seat_role: r.seat_role,
        response: r.response, responded_at: r.responded_at, dispatch_state: r.dispatch_state,
        opened_at: r.opened_at, acknowledged_at: r.acknowledged_at, invalidated_at: r.invalidated_at,
      })),
      tally: result ? result.tally : null,
      quorum: result ? { met: result.quorum_met, required: result.quorum_required, participation: result.participation } : null,
      threshold: result ? { met: result.threshold_met, basis: result.threshold_basis } : null,
      ready: result ? result.ready : false,
      all_answered: result ? result.all_answered : false,
      deadline_passed: result ? result.deadline_passed : false,
      i_am_dispatcher: !!(current && current.dispatch_authorized_by_user_id === me),
      // A read carries no seat role; the surface reads the caller's authority from the capability
      // response, so this never invents one.
      my_role: null,
      ready_is_not_a_decision: true,
      approval_is_not_issuance: true,
      terminal_states: [...CIRCULATION_TRANSITIONS.finalize.to, ...CIRCULATION_TRANSITIONS.administrative.to],
      contract_version: CIRCULATION_CONTRACT_VERSION,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}