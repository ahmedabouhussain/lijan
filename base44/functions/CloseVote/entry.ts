import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';

// CloseVote — closes voting and tallies results.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, decision_id } = body;

    if (!committee_id || !decision_id) {
      return Response.json({ error: 'committee_id, decision_id are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: closing a vote is CERTIFICATION, not the call for a vote —
    // it carries its own right, and the state gate allows it only while the vote is open.
    const auth = await authorizeCommand(base44, {
      capability: 'vote.certify',
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const decision = await base44.asServiceRole.entities.Decision.get(decision_id);
    if (!decision || decision.committee_id !== committee_id) {
      return Response.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decision.status !== 'voting') {
      return Response.json({ error: 'Voting is not open' }, { status: 400 });
    }

    // Tally votes
    const votes = await base44.asServiceRole.entities.Vote
      .filter({ decision_id }).catch(() => []);

    const voteFor = (votes || []).filter(v => v.vote_choice === 'for').length;
    const voteAgainst = (votes || []).filter(v => v.vote_choice === 'against').length;
    const voteAbstain = (votes || []).filter(v => v.vote_choice === 'abstain').length;
    const totalVotes = votes.length;

    // Determine result based on voting rule
    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    const rule = committee?.voting_rule || 'simple_majority';
    let passed = false;
    const votingMembers = voteFor + voteAgainst + (rule === 'simple_majority' ? 0 : voteAbstain);

    if (rule === 'simple_majority') {
      passed = voteFor > voteAgainst;
    } else if (rule === 'two_thirds') {
      passed = voteFor >= Math.ceil((voteFor + voteAgainst) * 2 / 3);
    } else if (rule === 'unanimous') {
      passed = voteFor > 0 && voteAgainst === 0 && voteAbstain === 0;
    } else if (rule === 'chair_decides') {
      passed = true; // Chair decides
    }

    // Exclusivity on CERTIFICATION: two simultaneous closes would both tally and both write a result.
    const claim = await claimTransition(base44, {
      key: `vote.certify:${decision_id}`,
      command: 'CloseVote',
      entity_type: 'Decision',
      entity_id: decision_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'This vote has already been closed and certified');

    await base44.asServiceRole.entities.Decision.update(decision_id, {
      vote_for: voteFor, vote_against: voteAgainst, vote_abstain: voteAbstain,
      status: passed ? 'approved' : 'rejected',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'vote.close', entity_type: 'Decision', entity_id: decision_id,
      entity_title: decision.title,
      description: `Vote closed: ${voteFor} for, ${voteAgainst} against, ${voteAbstain} abstain → ${passed ? 'APPROVED' : 'REJECTED'} (${rule})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    await completeTransition(base44, claim.claim_id, { result_ref: decision_id });

    return Response.json({
      status: 'ok', decision_id,
      tally: { for: voteFor, against: voteAgainst, abstain: voteAbstain, total: totalVotes },
      passed, voting_rule: rule,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}