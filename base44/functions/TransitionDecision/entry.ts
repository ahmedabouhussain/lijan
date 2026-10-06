import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  DECISION_LIFECYCLE_VERSION, decisionTransition, canAdvanceDecision, refusalFor,
} from '../../shared/decisionLifecycle.ts';

// TransitionDecision — the two decision steps that had NO command: SEND FOR REVIEW and START EXECUTION.
//
// Both were displayed on the decision surface as unavailable-with-a-reason because no governed command
// existed for them, and neither state was ever written from the browser (that discipline is exactly why
// this record no longer carries a result nobody can attribute to an electorate). Each step is taken
// under the right that fits the act, read from the ONE lifecycle contract:
//   • submit_for_review — decision.submit   the drafting office advances its own draft. Submitting is
//                                           not proposing (decision.propose) and not reviewing
//                                           (decision.review).
//   • start_execution   — decision.execute   execution begins on an ISSUED decision. The right was
//                                           already named in the catalogue and granted to the chair,
//                                           but no command exercised it — so `executing` was a state
//                                           every register displayed and nothing could write.
//
// This command deliberately cannot open a vote, cast a ballot, close a round or issue a decision: those
// transitions have their own commands and any other name is refused here by name.
const ALLOWED_TRANSITIONS = ['submit_for_review', 'start_execution'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { decision_id, transition } = body;

    if (!decision_id || !transition) {
      return Response.json({ error: 'decision_id, transition are required' }, { status: 400 });
    }
    if (!ALLOWED_TRANSITIONS.includes(transition)) {
      return Response.json({
        ...refusalFor(transition, null),
        error: `Transition '${transition}' is not handled by this command`,
        handled_transitions: ALLOWED_TRANSITIONS,
      }, { status: 400 });
    }

    const spec = decisionTransition(transition);
    const auth = await authorizeCommand(base44, {
      capability: spec.capability,
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: body.committee_id || null,
    });

    if (!auth.allowed) {
      // The guard's state gate reads the SAME contract list this command reads, so when the refusal is
      // a state refusal it is returned with the contract's own bilingual text instead of losing the
      // reason a seat can act on.
      if (auth.code === 'state_not_permitted') {
        return Response.json({
          ...refusalFor(transition, null),
          code: auth.code,
          error: auth.reason,
          policy_version: auth.policy_version,
          correlation_id: auth.correlation_id,
        }, { status: 409 });
      }
      return refusalResponse(auth);
    }

    const decision = auth.target;
    if (!canAdvanceDecision(decision.status, transition)) {
      return Response.json(refusalFor(transition, decision.status), { status: 409 });
    }

    await base44.asServiceRole.entities.Decision.update(decision_id, { status: spec.to });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      actor_user_id: auth.user.id,
      actor_name: auth.user.full_name || auth.user.email,
      actor_email: auth.user.email,
      action: `decision.${transition}`,
      entity_type: 'Decision',
      entity_id: decision_id,
      entity_title: decision.title || decision.title_ar || decision.decision_number || '',
      description: `Decision state ${decision.status} → ${spec.to} by ${auth.effective_role} (right exercised: ${spec.capability})`,
      correlation_id: auth.correlation_id,
      authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      decision_id,
      from: decision.status,
      to: spec.to,
      capability: spec.capability,
      lifecycle_policy_version: DECISION_LIFECYCLE_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}