import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, releaseTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import { contentBinding, bindingRefusal } from '../../shared/proposalContent.ts';
import { DECISION_STATE, DECISION_LIFECYCLE_VERSION } from '../../shared/decisionLifecycle.ts';
import {
  computeOutcome, CIRCULATION_STATES, CIRCULATION_REFUSALS, CIRCULATION_CONTRACT_VERSION,
  COLLECTING_STATES, FINALIZABLE_STATES, RESPONSE_STATES,
} from '../../shared/circulationApproval.ts';

// FinalizeCirculation — the acts that end, extend or withdraw a written resolution.
//
// Two authorities, deliberately different (brief rev 5 §4C):
//   • mark ready / finalize  → circulation.finalize — the policy's FINALIZER. The seat that
//     dispatched the round is refused here: the secretary prepares, checks, routes and records; they
//     do not approve the committee's decision because they sent it.
//   • extend / cancel / withdraw → circulation.open — dispatch authority. None of these produces an
//     outcome, so none of them can approve anything.
//
// APPROVAL IS NOT ISSUANCE: a passing outcome writes the decision state 'approved' (the same state a
// vote result produces) and stops there. Issuance stays its own human-authorized step (IssueDecision),
// and so does execution routing.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { round_id, decision_id, action, reason = null, new_deadline_at = null } = body;

    const acts = ['mark_ready', 'finalize', 'extend', 'cancel', 'withdraw'];
    if (!round_id || !decision_id || !acts.includes(action)) {
      return Response.json({ error: `round_id, decision_id and action (${acts.join('|')}) are required` }, { status: 400 });
    }

    const isFinalizerAct = ['mark_ready', 'finalize'].includes(action);
    // The trusted target differs by act: the finalizer acts ON the round (its state is the gate);
    // the administrative acts act on the DECISION, with the round contained as a related record.
    const auth = isFinalizerAct
      ? await authorizeCommand(base44, {
          capability: 'circulation.finalize', target_type: 'CirculationRound', target_id: round_id,
        })
      : await authorizeCommand(base44, {
          capability: 'circulation.open', target_type: 'Decision', target_id: decision_id,
          related: [{ type: 'CirculationRound', ids: [round_id] }],
        });
    if (!auth.allowed) return refusalResponse(auth);

    const round = isFinalizerAct
      ? auth.target
      : await sr.entities.CirculationRound.get(round_id).catch(() => null);
    if (!round || round.decision_id !== decision_id) {
      return Response.json({ error: 'Circulation round not found for this decision' }, { status: 404 });
    }

    const policyRows = await sr.entities.GovernanceConfig
      .filter({ config_key: round.policy_config_key || `circulation_policy:${round.committee_id}` }, { limit: 1 })
      .catch(() => []);
    const policy = ((policyRows && policyRows[0]) || {}).payload || {};

    if (action === 'extend' || action === 'cancel' || action === 'withdraw') {
      if (!COLLECTING_STATES.includes(round.state) && round.state !== CIRCULATION_STATES.READY) {
        return Response.json({
          error: CIRCULATION_REFUSALS.round_not_open.en, error_ar: CIRCULATION_REFUSALS.round_not_open.ar,
          code: 'round_not_open', round_state: round.state, correlation_id: auth.correlation_id,
        }, { status: 409 });
      }
      if (action === 'extend') {
        if (policy.allow_extension !== true) {
          return Response.json({
            error: 'The committee policy does not permit extending a circulation deadline',
            error_ar: 'سياسة اللجنة لا تجيز تمديد مهلة التمرير.', code: 'extension_not_permitted',
            correlation_id: auth.correlation_id,
          }, { status: 409 });
        }
        const limit = Number(policy.extension_count_limit || 0);
        if (Number(round.extension_count || 0) >= limit) {
          return Response.json({
            error: 'The permitted number of extensions has been used',
            error_ar: 'استُوفي عدد التمديدات المسموح به.', code: 'extension_limit_reached',
            limit, used: Number(round.extension_count || 0), correlation_id: auth.correlation_id,
          }, { status: 409 });
        }
        const next = new Date(new_deadline_at).getTime();
        if (!next || Number.isNaN(next) || next <= Date.now()) {
          return Response.json({
            error: CIRCULATION_REFUSALS.deadline_invalid.en, error_ar: CIRCULATION_REFUSALS.deadline_invalid.ar,
            code: 'deadline_invalid', correlation_id: auth.correlation_id,
          }, { status: 400 });
        }
        const history = [...(round.extension_history || []),
          `from ${round.deadline_at} to ${new Date(next).toISOString()} by ${auth.user.full_name || auth.user.email}: ${reason || '—'}`];
        await sr.entities.CirculationRound.update(round.id, {
          deadline_at: new Date(next).toISOString(),
          extension_count: Number(round.extension_count || 0) + 1,
          extension_history: history,
        });
      } else {
        await sr.entities.CirculationRound.update(round.id, {
          state: action === 'cancel' ? CIRCULATION_STATES.CANCELLED : CIRCULATION_STATES.WITHDRAWN,
          supersede_reason: reason || null,
        });
      }
      await sr.entities.AuditEvent.create({
        organization_id: round.organization_id, committee_id: round.committee_id,
        actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
        action: `circulation.${action}`, entity_type: 'CirculationRound', entity_id: round.id,
        entity_title: `دورة تمرير ${round.round_number || 1}`,
        description: `Circulation round ${action} (${reason || 'no reason stated'}) — an administrative act that produces no outcome`,
        correlation_id: auth.correlation_id, authority_context: auth.authority_context,
      });
      return Response.json({ status: 'ok', action, round_id: round.id, state: action === 'extend' ? round.state : (action === 'cancel' ? 'cancelled' : 'withdrawn'), correlation_id: auth.correlation_id });
    }

    // ── Finalizer acts ────────────────────────────────────────────────────────────────────────────
    if (!FINALIZABLE_STATES.includes(round.state)) {
      return Response.json({
        error: CIRCULATION_REFUSALS.round_not_open.en, error_ar: CIRCULATION_REFUSALS.round_not_open.ar,
        code: 'round_not_open', round_state: round.state, correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // 1 · The finalizer is the POLICY's, not whoever happens to be signed in.
    const finalizerRole = policy.finalizer_role || null;
    if (finalizerRole && auth.effective_role !== finalizerRole) {
      return Response.json({
        error: CIRCULATION_REFUSALS.not_authorized_finalizer.en,
        error_ar: CIRCULATION_REFUSALS.not_authorized_finalizer.ar,
        code: 'not_authorized_finalizer',
        policy_finalizer_role: finalizerRole, acting_role: auth.effective_role || null,
        correlation_id: auth.correlation_id,
      }, { status: 403 });
    }

    // 2 · The seat that dispatched the round does not finalize it (unless the policy says it may).
    if (round.dispatch_authorized_by_user_id === auth.user.id && policy.dispatch_may_finalize !== true) {
      return Response.json({
        error: CIRCULATION_REFUSALS.invalidator_is_dispatcher.en,
        error_ar: CIRCULATION_REFUSALS.invalidator_is_dispatcher.ar,
        code: 'invalidator_is_dispatcher',
        policy_authorized_alternative: policy.dispatch_may_finalize === true ? 'policy permits it' : null,
        correlation_id: auth.correlation_id,
      }, { status: 403 });
    }

    const decision = await sr.entities.Decision.get(decision_id).catch(() => null);
    if (!decision) return Response.json({ error: 'Decision not found' }, { status: 404 });

    const responses = (await sr.entities.CirculationResponse
      .filter({ round_id: round.id }, { limit: 200 }).catch(() => []));
    const result = computeOutcome({ round, responses });

    if (action === 'mark_ready') {
      if (!result.ready) {
        return Response.json({
          error: CIRCULATION_REFUSALS.awaiting_responses.en, error_ar: CIRCULATION_REFUSALS.awaiting_responses.ar,
          code: 'awaiting_responses',
          participation: result.participation, quorum_required: result.quorum_required,
          all_answered: result.all_answered, deadline_passed: result.deadline_passed,
          correlation_id: auth.correlation_id,
        }, { status: 409 });
      }
      await sr.entities.CirculationRound.update(round.id, {
        state: CIRCULATION_STATES.READY, ready_at: new Date().toISOString(), ready_by_user_id: auth.user.id,
      });
      await sr.entities.AuditEvent.create({
        organization_id: round.organization_id, committee_id: round.committee_id,
        actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
        action: 'circulation.ready', entity_type: 'CirculationRound', entity_id: round.id,
        entity_title: `دورة تمرير ${round.round_number || 1}`,
        description: `Round marked ready for authorized finalization (${result.threshold_basis}) — ready is NOT a decision`,
        correlation_id: auth.correlation_id, authority_context: auth.authority_context,
      });
      return Response.json({
        status: 'ok', state: CIRCULATION_STATES.READY, ready_is_not_a_decision: true,
        outcome: null, tally: result.tally, basis: result.threshold_basis,
        contract_version: CIRCULATION_CONTRACT_VERSION, correlation_id: auth.correlation_id,
      });
    }

    // 3 · Not before the deadline unless every eligible seat has answered.
    if (!result.all_answered && !result.deadline_passed) {
      return Response.json({
        error: CIRCULATION_REFUSALS.awaiting_responses.en, error_ar: CIRCULATION_REFUSALS.awaiting_responses.ar,
        code: 'awaiting_responses',
        participation: result.participation, quorum_required: result.quorum_required,
        deadline_at: round.deadline_at, tally: result.tally,
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // 4 · The text is re-verified before ANY outcome. A material amendment invalidates the approvals
    //     already given: they are preserved as evidence and never carried onto changed wording.
    const binding = await contentBinding({ round, decision });
    if (binding.state !== 'bound') {
      if (binding.state === 'stale') {
        const now = new Date().toISOString();
        const openRows = (responses || []).filter((r: any) => RESPONSE_STATES.includes(r.response) && !r.invalidated_at);
        await sr.entities.CirculationResponse.updateMany(
          { round_id: round.id, invalidated_at: { $exists: false } },
          { $set: { invalidated_at: now, invalidated_reason: 'the proposal text changed after circulation began' } },
        );
        await sr.entities.CirculationRound.update(round.id, {
          invalidated_at: now,
          invalidated_reason: 'proposal text changed after dispatch',
          invalidated_response_count: openRows.length,
          state: CIRCULATION_STATES.CANCELLED,
          supersede_reason: 'material amendment: the round is closed and a new round must be dispatched on the new text',
        });
        await sr.entities.AuditEvent.create({
          organization_id: round.organization_id, committee_id: round.committee_id,
          actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
          action: 'circulation.invalidate', entity_type: 'CirculationRound', entity_id: round.id,
          entity_title: `دورة تمرير ${round.round_number || 1}`,
          description: `Material amendment detected at finalization: ${openRows.length} approval(s) invalidated and preserved as evidence; a new round is required`,
          correlation_id: auth.correlation_id, authority_context: auth.authority_context,
        });
      }
      return Response.json({
        ...bindingRefusal(binding, auth.correlation_id),
        invalidated_responses: binding.state === 'stale' ? (responses || []).filter((r: any) => RESPONSE_STATES.includes(r.response)).length : 0,
        decided: 'refused_before_write',
      }, { status: 409 });
    }

    // 5 · One material outcome per round, whatever runs at the same time.
    const claim = await claimTransition(base44, {
      key: `circulation.finalize:${round.id}`,
      command: 'FinalizeCirculation', entity_type: 'CirculationRound', entity_id: round.id,
      committee_id: round.committee_id, organization_id: round.organization_id, actor_user_id: auth.user.id,
    });
    if (!claim.claimed) return duplicateResponse(claim, 'This round has already been finalized');

    try {
      const outcome = result.outcome;
      const now = new Date().toISOString();
      const state = outcome === CIRCULATION_STATES.APPROVED
        ? CIRCULATION_STATES.APPROVED
        : (outcome === CIRCULATION_STATES.REJECTED || outcome === CIRCULATION_STATES.NOT_CARRIED
            ? outcome
            : (result.deadline_passed && result.tally.approve === 0 && result.tally.reject === 0
                ? CIRCULATION_STATES.EXPIRED
                : CIRCULATION_STATES.NOT_CARRIED));

      const updatedRound = await sr.entities.CirculationRound.update(round.id, {
        state,
        outcome: outcome || state,
        outcome_basis: result.threshold_basis,
        finalized_at: now,
        finalized_by_user_id: auth.user.id,
        finalized_by_name: auth.user.full_name || auth.user.email,
        finalized_capacity: auth.effective_role || null,
        tally_approve: result.tally.approve, tally_reject: result.tally.reject,
        tally_abstain: result.tally.abstain, tally_recuse: result.tally.recuse,
        tally_silent: result.tally.pending,
        participation_count: result.participation,
        quorum_met: result.quorum_met, threshold_met: result.threshold_met,
      });

      // Approval writes the DECISION state a vote result would write — and nothing more. Issuance is
      // a separate human-authorized step, so a written resolution can never issue itself.
      let decision_state = decision.status;
      if (state === CIRCULATION_STATES.APPROVED) {
        await sr.entities.Decision.update(decision_id, { status: DECISION_STATE.APPROVED });
        decision_state = DECISION_STATE.APPROVED;
      }

      await sr.entities.AuditEvent.create({
        organization_id: round.organization_id, committee_id: round.committee_id,
        actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
        action: 'circulation.finalize', entity_type: 'CirculationRound', entity_id: round.id,
        entity_title: decision.title_ar || decision.title || 'قرار',
        description: `Written resolution finalized as '${state}' (${result.threshold_basis}) by ${auth.effective_role || '—'}; issuance is a separate step`,
        correlation_id: auth.correlation_id, authority_context: auth.authority_context,
      });

      await completeTransition(base44, claim.claim_id, { result_ref: round.id });

      return Response.json({
        status: 'ok',
        round: updatedRound,
        outcome: state,
        decision_state,
        tally: result.tally,
        quorum: { met: result.quorum_met, required: result.quorum_required, participation: result.participation },
        threshold: { met: result.threshold_met, basis: result.threshold_basis },
        approval_is_not_issuance: true,
        next_step: state === CIRCULATION_STATES.APPROVED ? 'IssueDecision (separate authorized step)' : null,
        lifecycle_policy_version: DECISION_LIFECYCLE_VERSION,
        contract_version: CIRCULATION_CONTRACT_VERSION,
        correlation_id: auth.correlation_id,
      });
    } catch (e) {
      await releaseTransition(base44, claim.claim_id, { correlation_id: auth.correlation_id });
      throw e;
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}