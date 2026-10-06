import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  evaluateResponse, RESPONSE_STATES, CIRCULATION_REFUSALS, CIRCULATION_CONTRACT_VERSION, COLLECTING_STATES,
} from '../../shared/circulationApproval.ts';

// RecordCirculationResponse — ONE recipient answers on their OWN row.
//
// Four facts stay separate, and this command is where that is enforced:
//   delivery  (dispatch_state)  — recorded by the dispatcher, never by the recipient
//   opening   (opened_at)       — the row was opened; an opening is not an acknowledgment
//   acknowledgment (acknowledged_at) — the recipient confirmed receiving it; still not an approval
//   response  (response)        — the authenticated answer, written only from an eligible seat
//
// A click on a link is not a signed vote: the response row carries the authenticated user id, the
// seat, the capacity at response time and its own effective time.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { response_id, action, reason = null, effective_at = null } = body;

    const allowed = ['open', 'acknowledge', ...RESPONSE_STATES];
    if (!response_id || !allowed.includes(action)) {
      return Response.json({ error: `response_id and action (${allowed.join('|')}) are required` }, { status: 400 });
    }

    // Identity-bound on a TRUSTED target: the guard reads the identity field from the contract, so
    // no seat — chair included — can answer on another person's row.
    const auth = await authorizeCommand(base44, {
      capability: 'circulation.respond',
      target_type: 'CirculationResponse',
      target_id: response_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const row = auth.target;
    const round = await sr.entities.CirculationRound.get(row.round_id).catch(() => null);
    if (!round) return Response.json({ error: 'The round this response belongs to no longer exists', code: 'round_not_found' }, { status: 404 });
    if (!COLLECTING_STATES.includes(round.state) && !['open', 'acknowledge'].includes(action)) {
      return Response.json({
        error: CIRCULATION_REFUSALS.round_not_open.en, error_ar: CIRCULATION_REFUSALS.round_not_open.ar,
        code: 'round_not_open', round_state: round.state, correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // One person, one response — a principal and a proxy for the same seat never both count.
    if (RESPONSE_STATES.includes(action)) {
      const siblings = await sr.entities.CirculationResponse.filter({ round_id: round.id }, { limit: 200 }).catch(() => []);
      const answeredElsewhere = (siblings || []).find((r: any) =>
        r.user_id === auth.user.id && r.id !== row.id && RESPONSE_STATES.includes(r.response) && !r.invalidated_at);
      if (answeredElsewhere) {
        return Response.json({
          error: CIRCULATION_REFUSALS.duplicate_principal.en, error_ar: CIRCULATION_REFUSALS.duplicate_principal.ar,
          code: 'duplicate_principal', already_answered_on_seat: answeredElsewhere.seat_id,
          correlation_id: auth.correlation_id,
        }, { status: 409 });
      }
    }

    const verdict = evaluateResponse({ round, response: row, actorUserId: auth.user.id, action });
    if (!verdict.ok) {
      return Response.json({
        error: verdict.en, error_ar: verdict.ar, code: verdict.code,
        round_state: round.state, deadline_at: round.deadline_at,
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    const now = new Date().toISOString();
    let updated = 0;

    if (action === 'open' || action === 'acknowledge') {
      // A compare-and-set on the field itself: the second writer of the same fact loses, and nothing
      // is reported as a first opening when the row was already opened.
      const field = action === 'open' ? 'opened_at' : 'acknowledged_at';
      const res = await sr.entities.CirculationResponse.updateMany(
        { id: row.id, [field]: { $exists: false } },
        { $set: { [field]: now } },
      );
      updated = res && typeof res.updated === 'number' ? res.updated : 1;
      if (updated === 0) {
        return Response.json({
          status: 'already_recorded', action, message: 'This fact was already recorded on the row',
          acknowledged_but_not_approved: action === 'acknowledge',
          correlation_id: auth.correlation_id,
        });
      }
    } else {
      const res = await sr.entities.CirculationResponse.updateMany(
        { id: row.id, response: 'pending' },
        {
          $set: {
            response: action,
            responded_at: now,
            effective_at: effective_at || now,
            response_reason: reason,
            capacity_at_response: auth.effective_role || row.seat_role || null,
            authority_basis: `role:${auth.effective_role || '—'}${auth.delegation_applied ? ' + active delegation' : ''}`,
          },
        },
      );
      updated = res && typeof res.updated === 'number' ? res.updated : 1;
      if (updated === 0) {
        // Lost the compare-and-set: a first response already exists. It is never overwritten.
        return Response.json({
          error: CIRCULATION_REFUSALS.already_responded.en, error_ar: CIRCULATION_REFUSALS.already_responded.ar,
          code: 'already_responded', response_id: row.id, correlation_id: auth.correlation_id,
        }, { status: 409 });
      }
    }

    // The round's counters are recomputed from the ROWS, never incremented from the request.
    const all = await sr.entities.CirculationResponse.filter({ round_id: round.id }, { limit: 200 }).catch(() => []);
    const live = (all || []).filter((r: any) => !r.invalidated_at);
    const count = (s: string) => live.filter((r: any) => r.response === s).length;
    await sr.entities.CirculationRound.update(round.id, {
      tally_approve: count('approve'),
      tally_reject: count('reject'),
      tally_abstain: count('abstain'),
      tally_recuse: count('recuse'),
      tally_silent: Math.max(Number(round.eligible_count || 0) - live.filter((r: any) => RESPONSE_STATES.includes(r.response)).length, 0),
      participation_count: count('approve') + count('reject') + count('abstain'),
    });

    await sr.entities.AuditEvent.create({
      organization_id: row.organization_id, committee_id: row.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: `circulation.${action}`, entity_type: 'CirculationResponse', entity_id: row.id,
      entity_title: row.person_name || auth.user.full_name || null,
      description: `Written resolution round ${round.round_number || 1}: ${action} recorded by the seat it belongs to (capacity ${auth.effective_role || '—'})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      action,
      response: action,
      round_id: round.id,
      round_state: round.state,
      contract_version: CIRCULATION_CONTRACT_VERSION,
      acknowledged_is_not_approval: true,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}