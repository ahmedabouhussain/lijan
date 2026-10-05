import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';

// CastVote — a member casts a vote on a decision.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, decision_id, vote_choice, dissent_reason } = body;

    if (!committee_id || !decision_id || !vote_choice) {
      return Response.json({ error: 'committee_id, decision_id, vote_choice are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: the committee is DERIVED from the decision record itself, the
    // committee_id the caller sent is only compared against it, and recusal is resolved by
    // identifier inside the guard — never by a name comparison.
    const auth = await authorizeCommand(base44, {
      capability: 'vote.cast',
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const decision = auth.target;

    if (decision.status !== 'voting') {
      return Response.json({ error: 'Voting is not open for this decision' }, { status: 400 });
    }

    // A ballot belongs to a FROZEN round. Without one there is no electorate to be eligible in, so
    // the vote is not recorded: "no frozen round" is a governed stop, not an assumption.
    const roundRows = await base44.asServiceRole.entities.EligibleVoterSnapshot
      .filter({ decision_id, status: 'active' }, { sort: '-created_date', limit: 1 }).catch(() => []);
    const round = (Array.isArray(roundRows) ? roundRows : (roundRows?.items || []))[0] || null;
    if (!round) {
      return Response.json({
        error: 'No frozen voting round exists for this decision',
        code: 'no_frozen_electorate',
        message: {
          ar: 'لا توجد دورة تصويت مجمّدة لهذا القرار؛ أُعيد فتح التصويت لتثبيت الهيئة الناخبة قبل تسجيل أي صوت.',
          en: 'No frozen voting round exists for this decision; the vote must be reopened so the electorate is frozen before ballots are recorded.',
        },
      }, { status: 409 });
    }

    // The seat must be INSIDE the frozen electorate. A seat appointed after the round was opened is
    // not eligible in that round, and a person with no seat has no vote at all.
    const seatId = auth.membership?.id || null;
    if (!seatId || !(round.eligible_seat_ids || []).includes(seatId)) {
      return Response.json({
        error: 'This seat is not part of the frozen electorate for this round',
        code: 'seat_not_eligible',
        message: {
          ar: 'مقعدك ليس ضمن الهيئة الناخبة المجمّدة لهذه الدورة؛ لا يُسجَّل الصوت.',
          en: 'Your seat is not part of the electorate frozen for this round; the ballot is not recorded.',
        },
        round: round.round || 1,
      }, { status: 403 });
    }

    // Exclusivity on the VOTE transition. Two simultaneous votes from one seat both pass a
    // read-then-write duplicate check, so the right to vote is CLAIMED first: exactly one claim wins,
    // every later claim on the same key is refused, and no second material vote is ever written.
    const claim = await claimTransition(base44, {
      key: `vote.cast:${decision_id}:${auth.user.id}`,
      command: 'CastVote',
      entity_type: 'Decision',
      entity_id: decision_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'You have already voted on this decision');

    // A recusal was already resolved by identifier inside the guard (a name match there may only
    // ever deny), so no name comparison happens here.
    const vote = await base44.asServiceRole.entities.Vote.create({
      organization_id: auth.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      decision_id,
      meeting_id: decision.meeting_id || null,
      voter_name: auth.user.full_name || auth.user.email,
      voter_user_id: auth.user.id,
      voter_membership_id: seatId,
      eligible_voter_snapshot_id: round.id,
      voter_role: auth.effective_role,
      vote_choice,
      dissent_reason: dissent_reason || null,
      vote_method: 'open',
      voted_at: new Date().toISOString(),
    });

    await completeTransition(base44, claim.claim_id, { result_ref: vote.id });

    return Response.json({ status: 'ok', vote, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}