import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import { loadRoundContext } from '../../shared/roundContext.ts';
import { canCastVote, refusalFor } from '../../shared/decisionLifecycle.ts';
import { contentBinding, bindingRefusal } from '../../shared/proposalContent.ts';
import { PRINCIPAL_BASES } from '../../shared/principalRepresentation.ts';

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

    // The open-round condition is read from the ONE lifecycle contract, so the vote path and the
    // surface that offers the ballot cannot disagree about what "voting is open" means.
    if (!canCastVote(decision.status)) {
      return Response.json(refusalFor('cast_vote', decision.status), { status: 409 });
    }

    // A ballot belongs to a FROZEN round. Without one there is no electorate to be eligible in, so
    // the vote is not recorded: "no frozen round" is a governed stop, not an assumption.
    //
    // D-039 (S1, R-17): this function used to resolve its own round — `status:'active'`, sorted
    // `-created_date`, limit 1 — so with two active rounds it silently bound the ballot to whichever
    // the sort put first, while issuance and the governed read REFUSE that same state
    // (`multiple_active_rounds`). The ballot was then recorded against an electorate no package could
    // ever be issued from: a silent orphan vote plus a false "has voted" state. The ONE round contract
    // (`roundContext`, round-context-1.1.0) now answers for this path too, and by contract it never
    // chooses an electorate by sort order.
    const ctx = await loadRoundContext(base44.asServiceRole, {
      decision_id,
      committee_id: auth.trusted_target.derived_committee_id,
    });
    if (ctx.conflict === 'multiple_active_rounds') {
      return Response.json({
        error: 'More than one active frozen round exists for this decision',
        code: 'multiple_active_rounds',
        message: {
          ar: 'توجد أكثر من دورة تصويت نشطة لهذا القرار؛ لا تُختار دورة تلقائيًا ولا يُسجَّل صوت حتى تُحسم الدورة.',
          en: 'More than one active frozen round exists for this decision; no round is chosen automatically and no ballot is recorded until the round is resolved.',
        },
        rounds_seen: ctx.rounds_seen,
      }, { status: 409 });
    }
    const round = ctx.round;
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

    // D-061 (proposal-content-1.0.0): a ballot is recorded only against the text the round FROZE.
    // A proposal edited after the round opened is stale — the member would be voting on words the
    // round never froze — and a round that predates content freezing names no text at all. Both are
    // governed stops with the material changes named, never a silent vote on a moved text.
    const binding = await contentBinding({ round, decision });
    if (binding.state !== 'bound') {
      return Response.json(bindingRefusal(binding, auth.correlation_id), { status: 409 });
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

    // Identity and replay (defect corrected, 5 Oct review): the claim key was
    // `vote.cast:<decision>:<user>` — it omitted the ROUND and the SEAT, so a legitimate LATER round
    // could not be voted in at all, while two seats held by one person collided on the same key. The
    // key is now bound to (decision, round, seat): a new round is a new claim, and a repeated vote in
    // the same round is refused on the seat's own identity.
    //
    // The two reads below are COURTESY refusals with a precise reason — they show the duplicate to the
    // person instead of dropping it silently. The authoritative controls stay the claim (concurrency)
    // and ballot reconciliation at issuance, where a seat or person counted twice is a BLOCKER.
    // The ballots of THIS round come from the same round context that resolved it: one contract, one
    // read path, so a ballot is never judged against a differently-resolved electorate.
    // WHO VOTES is the institution's recorded basis, never an assumption (D-083,
    // principal-representation-1.0.0). Under `per_person` one person carries one ballot however many
    // seats they hold; under `per_seat` each voting seat carries its own, so a second seat held by the
    // same person is a legitimate second ballot. A round frozen before this contract carries no basis
    // and is read as `per_person` — exactly the behaviour it was opened with.
    const roundBasis = round.voter_basis || PRINCIPAL_BASES.PER_PERSON;
    const roundVotes = ctx.ballots;
    if (roundBasis !== PRINCIPAL_BASES.PER_SEAT && roundVotes.some((v) => v.voter_user_id === auth.user.id)) {
      return Response.json({
        error: 'This person has already voted in this round',
        code: 'already_voted_in_round',
        message: {
          ar: 'سُجّل صوت لهذا الشخص في هذه الدورة بالفعل؛ لا يُسجَّل صوت ثانٍ على أساس «صوت واحد للشخص» — وهو الأساس المسجَّل لهذه اللجنة، ويشمل ذلك الجمع بين مقعد أصيل ومقعد بديل.',
          en: 'A ballot for this person is already recorded in this round; no second ballot is recorded under the recorded basis “one vote per person”, which includes holding a principal seat and an alternate seat.',
        },
        round: round.round || 1,
        voter_basis: roundBasis,
      }, { status: 409 });
    }
    const seatTaken = roundVotes.find((v) => v.voter_membership_id === seatId);
    if (seatTaken) {
      return Response.json({
        error: 'This seat has already voted in this round',
        code: 'seat_already_voted',
        message: {
          ar: 'سجّل هذا المقعد صوته في هذه الدورة؛ لا يُسجَّل صوت ثانٍ للمقعد نفسه.',
          en: 'This seat has already voted in this round; no second ballot is recorded for the same seat.',
        },
        round: round.round || 1,
        voted_at: seatTaken.voted_at || null,
      }, { status: 409 });
    }

    // Exclusivity on the VOTE transition. Two simultaneous votes from one seat both pass a
    // read-then-write duplicate check, so the right to vote is CLAIMED first: exactly one claim wins,
    // every later claim on the same key is refused, and no second material vote is ever written.
    const claim = await claimTransition(base44, {
      key: `vote.cast:${decision_id}:${round.id}:${seatId}`,
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