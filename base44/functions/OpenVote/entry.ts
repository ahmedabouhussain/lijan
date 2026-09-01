import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// OpenVote — opens a voting session for a decision.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, decision_id, meeting_id, vote_method } = body;

    if (!committee_id || !decision_id) {
      return Response.json({ error: 'committee_id, decision_id are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'vote.call' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const decision = await base44.asServiceRole.entities.Decision.get(decision_id);
    if (!decision || decision.committee_id !== committee_id) {
      return Response.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decision.status !== 'voting' && decision.status !== 'proposed') {
      return Response.json({ error: `Cannot open vote on decision with status '${decision.status}'` }, { status: 400 });
    }

    // Eligibility freeze: get active voting members
    const members = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id, status: 'active', voting_right: true }).catch(() => []);

    // Exclude recused members
    const recusals = await base44.asServiceRole.entities.Recusal
      .filter({ committee_id, status: 'active' }).catch(() => []);
    const recusedNames = new Set((recusals || []).map(r => r.member_name));
    const eligibleVoters = (members || []).filter(m => !recusedNames.has(m.full_name));

    await base44.asServiceRole.entities.Decision.update(decision_id, { status: 'voting' });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'vote.open', entity_type: 'Decision', entity_id: decision_id,
      entity_title: decision.title,
      description: `Vote opened: ${eligibleVoters.length} eligible voters (frozen)`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok', decision_id,
      eligible_voters: eligibleVoters.map(m => ({ name: m.full_name, role: m.role })),
      eligible_count: eligibleVoters.length,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}