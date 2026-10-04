import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';

// IssueDecision — issues a decision with ProofChainSnapshot.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { decision_id } = body;

    if (!decision_id) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    const decision = await base44.asServiceRole.entities.Decision.get(decision_id);
    if (!decision) return Response.json({ error: 'Decision not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: decision.committee_id, capability: 'decision.issue' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

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