import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { computeElectorate } from '../../shared/voteEligibility.ts';
import { canonicalProposal, proposalDigest, serializeProposal, versionLabel } from '../../shared/proposalContent.ts';
import {
  CIRCULATION_STATES, CIRCULATION_REFUSALS, CIRCULATION_CONTRACT_VERSION, COLLECTING_STATES,
  policyRefusal, THRESHOLD_RULES, PERMITTED_MATTER_TYPES,
} from '../../shared/circulationApproval.ts';

// OpenCirculation — dispatch a written resolution (decision by circulation) on a frozen text.
//
// The sequence, each step a refusal code rather than a convention:
//   policy → matter type → explicit future deadline → eligible seats (frozen snapshot) → frozen text
//   → one row per eligible recipient carrying DELIVERY (not receipt, not approval).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const {
      committee_id, decision_id, meeting_id = null, matter_type, rule = null,
      deadline_at, time_zone = null, supersedes_round_id = null, quorum_required = null,
    } = body;

    if (!committee_id || !decision_id || !matter_type || !deadline_at) {
      return Response.json({ error: 'committee_id, decision_id, matter_type and deadline_at are required' }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: 'circulation.open',
      target_type: 'Decision',
      target_id: decision_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const decision = await sr.entities.Decision.get(decision_id).catch(() => null);
    if (!decision || decision.committee_id !== committee_id) {
      return Response.json({ error: 'Decision not found' }, { status: 404 });
    }

    // 1 · The institution's own policy. Read from its record, never supplied with the round.
    const config_key = `circulation_policy:${committee_id}`;
    const policyRows = await sr.entities.GovernanceConfig.filter({ config_key }, { limit: 1 }).catch(() => []);
    const policyRow = (policyRows && policyRows[0]) || null;
    const policy = policyRow ? policyRow.payload || null : null;

    // A matter type the contract always excludes is refused before the policy is even consulted.
    if (!PERMITTED_MATTER_TYPES.includes(matter_type)) {
      return Response.json({
        error: 'Unknown matter type for a written resolution',
        error_ar: 'نوع موضوع غير معروف للقرار بالتمرير.',
        code: 'matter_type_unknown',
        policy_authorized_alternative: null,
        recognized: PERMITTED_MATTER_TYPES,
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }

    const refusal = policyRefusal(policy, matter_type);
    if (refusal) {
      return Response.json({
        error: refusal.en, error_ar: refusal.ar, code: refusal.code,
        missing_fields: refusal.missing_fields || null,
        policy_config_key: config_key,
        policy_authorized_alternative: null,
        decided: 'refused_before_write',
        correlation_id: auth.correlation_id,
      }, { status: refusal.code === 'policy_missing' ? 409 : 400 });
    }

    // 2 · An explicit future deadline. A round without one could never close honestly.
    const deadline = new Date(deadline_at).getTime();
    if (!deadline || Number.isNaN(deadline) || deadline <= Date.now()) {
      return Response.json({
        error: CIRCULATION_REFUSALS.deadline_invalid.en, error_ar: CIRCULATION_REFUSALS.deadline_invalid.ar,
        code: 'deadline_invalid', correlation_id: auth.correlation_id,
      }, { status: 400 });
    }

    const chosenRule = rule || policy.default_rule;
    if (!THRESHOLD_RULES.includes(chosenRule)) {
      return Response.json({ error: 'Unknown threshold rule', code: 'rule_invalid', correlation_id: auth.correlation_id }, { status: 400 });
    }

    // 3 · One open round at a time. A second dispatch over a live round is not a silent replacement.
    const existingRounds = (await sr.entities.CirculationRound
      .filter({ decision_id }, { sort: '-created_date', limit: 20 }).catch(() => []))
      .filter((r: any) => COLLECTING_STATES.includes(r.state) || r.state === CIRCULATION_STATES.READY);
    if (existingRounds.length > 0) {
      return Response.json({
        error: 'A circulation round is already open for this decision',
        error_ar: 'توجد دورة تمرير مفتوحة على هذا القرار؛ لا تُفتح دورة ثانية فوقها.',
        code: 'round_already_open',
        open_round_id: existingRounds[0].id,
        decided: 'refused_before_write',
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // 4 · The frozen electorate: the same computation a vote uses, so a written resolution cannot
    //    widen who counts. Recused and out-of-term seats are excluded with their reason.
    const seats = (await sr.entities.CommitteeMembership
      .filter({ committee_id, status: 'active', voting_right: true }, { limit: 200 }).catch(() => []));
    const recusals = (await sr.entities.Recusal.filter({ committee_id, status: 'active' }).catch(() => []));
    const electorate = computeElectorate({ seats, recusals });
    if (electorate.size === 0) {
      return Response.json({
        error: CIRCULATION_REFUSALS.no_electorate.en, error_ar: CIRCULATION_REFUSALS.no_electorate.ar,
        code: 'no_electorate', excluded_seats: electorate.excluded,
        decided: 'refused_before_write', correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // 5 · The frozen text. What the recipients answer on is what issuance later verifies.
    const canonical = canonicalProposal(decision);
    const digest = await proposalDigest(canonical);

    const prevRounds = await sr.entities.CirculationRound
      .filter({ decision_id }, { sort: '-round_number', limit: 1 }).catch(() => []);
    const roundNumber = Number(((prevRounds && prevRounds[0]) || {}).round_number || 0) + 1;

    const quorum = quorum_required !== null && quorum_required !== undefined
      ? Number(quorum_required)
      : Number(policy.quorum_participation || 1);

    const round = await sr.entities.CirculationRound.create({
      organization_id: auth.organization_id,
      committee_id,
      decision_id,
      meeting_id,
      round_number: roundNumber,
      state: CIRCULATION_STATES.COLLECTING,
      matter_type,
      policy_config_key: config_key,
      policy_version: policy.policy_version || null,
      policy_source: 'committee_instrument',
      policy_snapshot: JSON.stringify(policy),
      proposal_version: versionLabel(digest),
      proposal_sha256: digest,
      proposal_content: serializeProposal(canonical),
      rule: chosenRule,
      quorum_required: quorum,
      time_zone: time_zone || policy.time_zone || null,
      deadline_at: new Date(deadline).toISOString(),
      extension_count: 0,
      extension_history: [],
      eligible_seat_ids: electorate.eligible_seat_ids,
      eligible_snapshot: electorate.eligible_seats.map((s: any) => `${s.seat_id}|${s.user_id || '—'}|${s.role || '—'}`),
      eligible_count: electorate.size,
      excluded_seats: electorate.excluded_seat_rows,
      invitation_recipients: [],
      dispatch_authorized_by_user_id: auth.user.id,
      dispatch_authorized_by_name: auth.user.full_name || auth.user.email,
      dispatch_capacity: auth.effective_role || null,
      dispatched_at: new Date().toISOString(),
      contract_version: CIRCULATION_CONTRACT_VERSION,
      correlation_id: auth.correlation_id,
    });

    // 6 · One row per eligible recipient. DISPATCH is recorded; nothing else is assumed.
    const rows = electorate.eligible.map((seat: any) => ({
      organization_id: auth.organization_id,
      committee_id,
      decision_id,
      round_id: round.id,
      seat_id: seat.id,
      membership_id: seat.id,
      user_id: seat.user_id,
      person_name: seat.full_name || seat.user_email || null,
      seat_role: seat.role || null,
      dispatch_state: seat.user_id ? 'dispatched' : 'failed',
      dispatched_at: new Date().toISOString(),
      delivery_note: seat.user_id ? null : 'the seat carries no account, so nothing was dispatched to it',
      response: 'pending',
      contract_version: CIRCULATION_CONTRACT_VERSION,
    }));
    const responses = await sr.entities.CirculationResponse.bulkCreate(rows);

    // 7 · An explicit link to the round this one replaces — the previous round keeps its record.
    if (supersedes_round_id) {
      const prev = await sr.entities.CirculationRound.get(supersedes_round_id).catch(() => null);
      if (prev && prev.decision_id === decision_id) {
        await sr.entities.CirculationRound.update(prev.id, {
          state: CIRCULATION_STATES.SUPERSEDED,
          superseded_by_round_id: round.id,
          supersede_reason: 'replaced by a new round (see the new round for the reason)',
        });
      }
    }

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'circulation.dispatch', entity_type: 'CirculationRound', entity_id: round.id,
      entity_title: decision.title_ar || decision.title || 'قرار',
      description: `Written resolution round ${roundNumber} dispatched (${matter_type}, rule ${chosenRule}, ${electorate.size} eligible seat(s), deadline ${new Date(deadline).toISOString()}) — dispatch is not receipt and not approval`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      round,
      recipients: rows.length,
      responses_created: (responses && responses.length) || rows.length,
      electorate: { size: electorate.size, excluded: electorate.excluded },
      ready_is_not_a_decision: true,
      next_step: 'issue_stays_separate',
      contract_version: CIRCULATION_CONTRACT_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}