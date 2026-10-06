import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { validateEffectPolicy, MEMBERSHIP_EFFECT_CONTRACT_VERSION } from '../../shared/membershipEffect.ts';

// SetMembershipEffectPolicy — the institution states what a membership change does to a process that
// is already running (brief §4A material D).
//
// Written under the committee-management right, by the committee itself, and never inline in a round:
// a rule the person who opened the round wrote for themselves would be the same defect as a performer
// certifying their own evidence. Where no policy is recorded, the affected official action STOPS and
// shows the choice — no rule is assumed on the institution's behalf.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, policy } = body || {};
    if (!committee_id || !policy || typeof policy !== 'object') {
      return Response.json({ error: 'committee_id and policy are required' }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const check: any = validateEffectPolicy(policy);
    if (!check.ok) {
      return Response.json({
        error: check.message.en,
        error_ar: check.message.ar,
        code: check.code,
        recognised: check.recognised || null,
        missing_fields: check.missing || null,
        unknown: check.unknown || null,
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const payload = {
      ...policy,
      policy_version: typeof policy.policy_version === 'string' && policy.policy_version ? policy.policy_version : String(Date.now()),
      contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
      policy_source: 'committee_instrument',
      delegation_expiry_handling: policy.delegation_expiry_handling === 'acts_until_close_if_policy_authorized'
        ? 'acts_until_close_if_policy_authorized' : 'act_stops_immediately',
      recorded_by_user_id: auth.user.id,
      recorded_by_name: auth.user.full_name || auth.user.email,
      recorded_at: new Date().toISOString(),
      status: 'active',
    };

    // A previous policy is SUPERSEDED, never rewritten: the policy in force at the time of a round is
    // what a round's effect is judged against.
    const previous = await sr.entities.MembershipEffectPolicy
      .filter({ committee_id, status: 'active' }, { limit: 20 }).catch(() => []);
    for (const row of (previous && previous.items) || (Array.isArray(previous) ? previous : [])) {
      await sr.entities.MembershipEffectPolicy.update(row.id, { status: 'superseded' }).catch(() => null);
    }

    const saved = await sr.entities.MembershipEffectPolicy.create({
      organization_id: auth.organization_id,
      committee_id,
      ...payload,
    });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'membership_effect.policy_recorded', entity_type: 'MembershipEffectPolicy', entity_id: saved.id,
      entity_title: 'سياسة وقت النفاذ',
      description: `Membership effect policy recorded (mid-round change: ${payload.mid_round_change}; resolution route: ${payload.resolution_route}; choices: ${(payload.authorized_choices || []).join(', ')})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      policy_id: saved.id,
      policy_version: payload.policy_version,
      contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
      superseded: ((previous && previous.items) || (Array.isArray(previous) ? previous : [])).length,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}