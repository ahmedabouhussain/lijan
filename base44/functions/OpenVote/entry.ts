import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';
import { computeElectorate } from '../../shared/voteEligibility.ts';

// OpenVote — opens a voting session for a decision.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, decision_id, meeting_id, vote_method } = body;

    if (!committee_id || !decision_id) {
      return Response.json({ error: 'committee_id, decision_id are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: the committee is derived from the decision record itself, and
    // the permitted-state gate makes a second open of an already-open vote impossible.
    const auth = await authorizeCommand(base44, {
      capability: 'vote.call',
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const decision = await base44.asServiceRole.entities.Decision.get(decision_id);
    if (!decision || decision.committee_id !== committee_id) {
      return Response.json({ error: 'Decision not found' }, { status: 404 });
    }

    if (decision.status !== 'voting' && decision.status !== 'proposed') {
      return Response.json({ error: `Cannot open vote on decision with status '${decision.status}'` }, { status: 400 });
    }

    // Eligibility freeze, computed by the ONE shared rule (base44/shared/voteEligibility.ts), so the
    // electorate a vote is opened against is the same object a test can assert against.
    const members = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id, status: 'active', voting_right: true }).catch(() => []);
    const recusals = await base44.asServiceRole.entities.Recusal
      .filter({ committee_id, status: 'active' }).catch(() => []);
    const electorate = computeElectorate({ seats: members || [], recusals: recusals || [] });
    const eligibleVoters = electorate.eligible;

    // An electorate of zero is a governed stop, not an empty vote: opening it would invite the very
    // contradiction this platform must refuse (a result with no one eligible to produce it).
    if (eligibleVoters.length === 0) {
      return Response.json({
        error: 'No eligible voting seat exists for this committee',
        code: 'no_electorate',
        message: {
          ar: 'لا يوجد مقعد تصويت مؤهل في هذه اللجنة؛ يلزم استكمال العضويات النشطة قبل فتح التصويت.',
          en: 'No eligible voting seat exists in this committee; active memberships are required before a vote can be opened.',
        },
        seats_considered: electorate.size + electorate.excluded.out_of_term,
        excluded_out_of_term: electorate.excluded.out_of_term,
        excluded_recused: electorate.excluded.recused_by_identifier,
        excluded_legacy_name_match: electorate.excluded.legacy_name_match,
        eligibility_policy_version: electorate.policy_version,
      }, { status: 409 });
    }

    // ── Freeze the round ────────────────────────────────────────────────────────────────────────
    // The electorate is written as its OWN record, so the round a vote belongs to outlives any later
    // change to the committee: a seat appointed after this moment cannot vote in this round, and the
    // issuance package reads the frozen seats rather than recomputing whoever holds a seat later.
    const priorRows = await base44.asServiceRole.entities.EligibleVoterSnapshot
      .filter({ decision_id, status: 'active' }, { sort: '-created_date', limit: 1 }).catch(() => []);
    const prior = (Array.isArray(priorRows) ? priorRows : (priorRows?.items || []))[0] || null;
    const frozenAt = new Date().toISOString();
    const round = (prior?.round || 0) + 1;
    const electorateSnapshot = await base44.asServiceRole.entities.EligibleVoterSnapshot.create({
      organization_id: auth.organization_id,
      committee_id,
      decision_id,
      meeting_id: decision.meeting_id || null,
      round,
      proposal_version: String(decision.updated_date || decision.created_date || ''),
      voting_rule: auth.committee?.voting_rule || null,
      quorum_required: auth.committee?.quorum_count ?? null,
      eligibility_policy_version: electorate.policy_version,
      frozen_on: electorate.day,
      frozen_at: frozenAt,
      eligible_seat_ids: electorate.eligible_seat_ids,
      eligible_seats: electorate.eligible_seats.map((s) => `${s.seat_id}|${s.user_id || '-'}|${s.role || '-'}`),
      eligible_count: electorate.size,
      excluded_seats: electorate.excluded_seat_rows,
      excluded_out_of_term: electorate.excluded.out_of_term,
      excluded_recused_by_identifier: electorate.excluded.recused_by_identifier,
      excluded_legacy_name_match: electorate.excluded.legacy_name_match,
      status: 'active',
      supersedes_snapshot_id: prior?.id || null,
      opened_by_user_id: auth.user.id,
      opened_by_name: auth.user.full_name || auth.user.email,
      correlation_id: auth.correlation_id,
    });
    if (prior) {
      // The previous round is superseded, never deleted: a vote already cast in it stays attributable.
      await base44.asServiceRole.entities.EligibleVoterSnapshot.updateMany(
        { id: prior.id, status: 'active' },
        { $set: { status: 'superseded', superseded_at: frozenAt } },
      );
    }

    await base44.asServiceRole.entities.Decision.update(decision_id, { status: 'voting' });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'vote.open', entity_type: 'Decision', entity_id: decision_id,
      entity_title: decision.title,
      description: `Vote opened — round ${round}: ${electorate.size} eligible seats frozen (by seat id: ${electorate.eligible_seat_ids.join(', ')}); excluded — out of term: ${electorate.excluded.out_of_term}, recused by identifier: ${electorate.excluded.recused_by_identifier}, legacy name match: ${electorate.excluded.legacy_name_match} (eligibility policy ${electorate.policy_version}); round record ${electorateSnapshot.id}${prior ? ` supersedes ${prior.id}` : ''}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify all eligible voters that voting is open
    try {
      const actorName = auth.user.full_name || auth.user.email;
      const deepLink = `/o/${auth.organization_id}/c/${committee_id}/voting`;
      const notifParams = (eligibleVoters || [])
        .filter((m) => m.user_id && m.user_id !== auth.user.id)
        .map((m) => ({
          organization_id: auth.organization_id,
          committee_id,
          recipient_user_id: m.user_id,
          recipient_name: m.full_name || m.full_name_ar || '',
          event_type: 'decision_voting_open',
          context: {
            decision_title: decision.title,
            decision_number: decision.decision_number || '',
            actor_name: actorName,
            message: `تم فتح باب التصويت على القرار: ${decision.title}`,
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

    return Response.json({
      status: 'ok', decision_id,
      // The frozen electorate is identified by SEAT, so a vote can later be reconciled against it.
      electorate_snapshot_id: electorateSnapshot.id,
      round,
      eligible_seats: electorate.eligible_seats,
      eligible_voters: eligibleVoters.map(m => ({ name: m.full_name, role: m.role })),
      eligible_count: electorate.size,
      eligible_seat_ids: electorate.eligible_seat_ids,
      excluded: electorate.excluded,
      eligibility_policy_version: electorate.policy_version,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}