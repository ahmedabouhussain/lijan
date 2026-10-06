import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import { loadRoundContext } from '../../shared/roundContext.ts';
import {
  midRoundChangeReport, MEMBERSHIP_EFFECT_CONTRACT_VERSION, AFFECTED_FACTS,
  authorizedChoicesForRead, readEffectPolicy,
} from '../../shared/membershipEffect.ts';

// GetDecisionEffectState — the governed read behind the effect panel (brief §4A material D).
//
// It answers, for ONE decision the caller may read: which process is affected, what changed in the
// appointment history and at WHICH instant (effective vs recorded), what the institution's own policy
// says about a change inside an open round, and — when the instrument is silent — the choice that
// settles it. It reads; it decides nothing.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { decision_id, committee_id } = body || {};
    if (!decision_id) return Response.json({ error: 'decision_id is required' }, { status: 400 });

    const callerUser = await base44.auth.me().catch(() => null);
    const principal: any = await resolvePrincipal({ sr, body, callerUser });

    const decision: any = await sr.entities.Decision.get(decision_id).catch(() => null);
    if (!decision) return Response.json(refusalBody('not_found'), { status: 404 });

    const allowed: any = await authorizeRead({ base44, sr, principal, record: decision });
    if (!allowed.allowed) return Response.json(refusalBody(allowed.reason), { status: refusalStatus(allowed.reason) });

    const scopeCommittee = decision.committee_id || committee_id || null;
    if (!scopeCommittee) {
      return Response.json({
        status: 'no_scope',
        contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
        message: { ar: 'لا يمكن اشتقاق اللجنة من هذا السجل.', en: 'The committee cannot be derived from this record.' },
      });
    }

    const unread_sources: any[] = [];
    const read = async (source: string, fn: () => Promise<any>) => {
      try { return await fn(); } catch (e) { unread_sources.push({ source, reason: (e as Error).message || 'read_failed' }); return null; }
    };

    const ctx: any = await loadRoundContext(sr, { decision_id, committee_id: scopeCommittee });
    const seats = ctx.memberships || [];

    const eventsResult = await read('SeatAppointmentEvent', () => sr.entities.SeatAppointmentEvent.filter(
      { membership_id: { $in: seats.map((s: any) => s.id) } }, { limit: 500 },
    ));
    const events = eventsResult == null ? null : (Array.isArray(eventsResult) ? eventsResult : eventsResult.items || []);

    const policyResult = await read('MembershipEffectPolicy', () => sr.entities.MembershipEffectPolicy
      .filter({ committee_id: scopeCommittee, status: 'active' }, { sort: '-recorded_at', limit: 1 }));
    const policyRow = policyResult == null ? null : ((Array.isArray(policyResult) ? policyResult : policyResult.items || [])[0] || null);
    const policy = readEffectPolicy(policyRow);

    const report: any = midRoundChangeReport({
      round: ctx.round || null,
      seats,
      events: events || [],
      policy,
      ballots: ctx.ballots || [],
      quorum_required: ctx.round?.quorum_required ?? null,
      unreadable: events == null,
    });

    return Response.json({
      status: 'ok',
      contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
      decision_id,
      committee_id: scopeCommittee,
      decision_status: decision.status || null,
      round: ctx.round ? { id: ctx.round.id, round: ctx.round.round || 1, status: ctx.round_status || null, frozen_on: ctx.round.frozen_on || null, frozen_at: ctx.round.frozen_at || null } : null,
      round_basis: ctx.basis || null,
      frozen_seats: seats.length,
      policy: policy || null,
      policy_recorded: !!policyRow,
      policy_version: policyRow?.policy_version || null,
      // Everything the brief asks a secretary/chair to see, in one payload.
      window: report.window,
      changes: report.changes,
      within_round: report.within_round,
      action: report.action,
      refusal: report.refusal,
      affected_facts: report.affected_facts?.length ? report.affected_facts : AFFECTED_FACTS,
      authorized_choices: report.authorized_choices || authorizedChoicesForRead(),
      next_freeze_must_use_current_register: report.next_freeze_must_use_current_register,
      retest: report.retest,
      ballot_inheritance: report.ballot_inheritance,
      unread_sources,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}