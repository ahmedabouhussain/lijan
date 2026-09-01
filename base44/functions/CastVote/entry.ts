import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// CastVote — a member casts a vote on a decision.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, decision_id, vote_choice, dissent_reason } = body;

    if (!committee_id || !decision_id || !vote_choice) {
      return Response.json({ error: 'committee_id, decision_id, vote_choice are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'vote.cast' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const decision = await base44.asServiceRole.entities.Decision.get(decision_id);
    if (!decision || decision.committee_id !== committee_id) {
      return Response.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decision.status !== 'voting') {
      return Response.json({ error: 'Voting is not open for this decision' }, { status: 400 });
    }

    // Check for duplicate vote
    const existing = await base44.asServiceRole.entities.Vote
      .filter({ decision_id, voter_user_id: auth.user.id }).catch(() => []);
    if (existing && existing.length > 0) {
      return Response.json({ error: 'You have already voted on this decision' }, { status: 400 });
    }

    // Check recusal
    const recusals = await base44.asServiceRole.entities.Recusal
      .filter({ committee_id, member_name: auth.user.full_name || auth.user.email, status: 'active' }).catch(() => []);
    if (recusals && recusals.length > 0) {
      return Response.json({ error: 'Cannot vote while recused' }, { status: 403 });
    }

    const vote = await base44.asServiceRole.entities.Vote.create({
      organization_id: auth.organization_id,
      committee_id, decision_id,
      meeting_id: decision.meeting_id || null,
      voter_name: auth.user.full_name || auth.user.email,
      voter_user_id: auth.user.id,
      voter_role: auth.effective_role,
      vote_choice,
      dissent_reason: dissent_reason || null,
      vote_method: 'open',
      voted_at: new Date().toISOString(),
    });

    return Response.json({ status: 'ok', vote, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}