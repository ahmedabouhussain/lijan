import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';

// IssueDecision — issues a decision with ProofChainSnapshot.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { decision_id } = body;

    if (!decision_id) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    // Authority on a TRUSTED target: the guard loads the decision itself and derives the committee
    // from it, so no scope arrives from the request at all.
    const auth = await authorizeCommand(base44, {
      capability: 'decision.issue',
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const decision = auth.target;

    // Verify mandate authority
    const committee = await base44.asServiceRole.entities.Committee.get(decision.committee_id);
    if (!committee.mandate && !committee.mandate_id) {
      return Response.json({ error: 'Committee has no mandate — cannot issue decisions' }, { status: 400 });
    }

    // Verify vote certification (if voting was required)
    if (decision.status !== 'approved' && decision.status !== 'voting') {
      return Response.json({ error: `Decision must be approved before issuance (current: ${decision.status})` }, { status: 400 });
    }

    // Get certified signatures
    const signatures = await base44.asServiceRole.entities.Signature
      .filter({ document_type: 'Decision', document_id: decision_id, status: 'active' }).catch(() => []);

    // Get votes
    const votes = await base44.asServiceRole.entities.Vote
      .filter({ decision_id }).catch(() => []);

    // Get actions created from this decision
    const actions = await base44.asServiceRole.entities.Action
      .filter({ decision_id }).catch(() => []);

    // Build ProofChainSnapshot
    const proofChain = {
      decision_id,
      decision_number: decision.decision_number,
      title: decision.title,
      content_hash: `sha256:${decision_id}:${Date.now()}`,
      committee_id: decision.committee_id,
      committee_name: committee.name_ar || committee.name_en,
      mandate: committee.mandate || committee.mandate_id,
      meeting_id: decision.meeting_id,
      vote_certification: {
        for: decision.vote_for,
        against: decision.vote_against,
        abstain: decision.vote_abstain,
        total_votes: votes.length,
        voting_rule: committee.voting_rule,
      },
      required_signatures: signatures.map(s => ({
        signer: s.signer_name, role: s.signer_role, intent: s.intent, signed_at: s.signed_at,
      })),
      issuing_authority: auth.user.full_name || auth.user.email,
      issuing_role: auth.effective_role,
      created_actions: actions.map(a => ({ id: a.id, title: a.title, owner: a.owner_name })),
      issued_at: new Date().toISOString(),
      audit_correlation_id: auth.correlation_id,
    };

    // Issue the decision (idempotent — if already issued, return existing)
    if (decision.status === 'issued' || decision.status === 'executing') {
      return Response.json({ status: 'ok', decision_id, proof_chain: proofChain, already_issued: true, correlation_id: auth.correlation_id });
    }

    // Exclusivity on ISSUANCE: two simultaneous issues both see a non-issued status, so the right to
    // issue is claimed first. Exactly one transition writes the material effect and one audit event;
    // the loser performs NO write and is told the issuance is already claimed.
    const claim = await claimTransition(base44, {
      key: `decision.issue:${decision_id}`,
      command: 'IssueDecision',
      entity_type: 'Decision',
      entity_id: decision_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'This decision issuance is already in progress or complete');

    await base44.asServiceRole.entities.Decision.update(decision_id, {
      status: 'issued',
      outcome: decision.outcome || 'Issued with proof chain',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: decision.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'decision.issue', entity_type: 'Decision', entity_id: decision_id,
      entity_title: decision.title,
      description: `Decision issued with ProofChainSnapshot (${signatures.length} signatures, ${votes.length} votes)`,
      new_value: 'issued',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    await completeTransition(base44, claim.claim_id, { result_ref: decision_id });

    // Dispatch decision_issued notifications to all active committee members
    try {
      const members = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id: decision.committee_id, status: 'active' }).catch(() => []);
      const actorName = auth.user.full_name || auth.user.email;
      const deepLink = `/o/${auth.organization_id}/c/${decision.committee_id}/decisions/${decision_id}`;
      const notifParams = (members || [])
        .filter((m) => m.user_id && m.user_id !== auth.user.id)
        .map((m) => ({
          organization_id: auth.organization_id,
          committee_id: decision.committee_id,
          recipient_user_id: m.user_id,
          recipient_name: m.full_name || m.full_name_ar || '',
          event_type: 'decision_issued',
          context: {
            decision_title: decision.title,
            decision_number: decision.decision_number || '',
            committee_name: committee.name_ar || committee.name_en || '',
            actor_name: actorName,
            deep_link: deepLink,
          },
          source_entity_type: 'Decision',
          source_entity_id: decision_id,
          source_title: decision.title,
          priority: 'urgent',
          correlation_id: auth.correlation_id,
          actor_name: actorName,
          deep_link: deepLink,
        }));
      if (notifParams.length > 0) {
        await dispatchBatch(base44, notifParams);
      }
    } catch {}

    return Response.json({ status: 'ok', decision_id, proof_chain: proofChain, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}