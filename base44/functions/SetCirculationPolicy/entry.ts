import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  REQUIRED_POLICY_FIELDS, PERMITTED_MATTER_TYPES, THRESHOLD_RULES, CIRCULATION_REFUSALS,
  CIRCULATION_CONTRACT_VERSION,
} from '../../shared/circulationApproval.ts';

// SetCirculationPolicy — the institution states whether (and how) it decides by written resolution.
//
// This is the policy record the whole circulation route rests on, and it is written under the
// committee-management right — NOT by the seat that opens a round, and never inline in a round. A
// round dispatched on a policy the opener wrote for itself would be the same defect as a performer
// certifying its own evidence (D-046).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, policy } = body;

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

    const missing = REQUIRED_POLICY_FIELDS.filter((f) => policy[f] === undefined || policy[f] === null || policy[f] === '');
    if (missing.length > 0) {
      return Response.json({
        error: CIRCULATION_REFUSALS.policy_incomplete.en,
        error_ar: CIRCULATION_REFUSALS.policy_incomplete.ar,
        code: 'policy_incomplete',
        missing_fields: missing,
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }
    if (policy.enabled !== true) {
      return Response.json({
        error: 'The circulation route can only be recorded as enabled through this command; disabling is a separate institutional decision',
        error_ar: 'يُسجَّل تمكين القرار بالتمرير من هذا الأمر وحده؛ والتعطيل قرار مؤسسي مستقل.',
        code: 'enable_only',
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }
    // Silence is never approval: a policy that declares it is refused rather than honoured.
    if (policy.silence_is_approval === true || policy.silence_counts_as_approval === true) {
      return Response.json({
        error: CIRCULATION_REFUSALS.silence_based_rule_unsupported.en,
        error_ar: CIRCULATION_REFUSALS.silence_based_rule_unsupported.ar,
        code: 'silence_based_rule_unsupported',
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }
    const matters = Array.isArray(policy.permitted_matter_types) ? policy.permitted_matter_types : [];
    const unknown = matters.filter((m) => !PERMITTED_MATTER_TYPES.includes(m));
    if (matters.length === 0 || unknown.length > 0) {
      return Response.json({
        error: 'permitted_matter_types must name matter types the contract recognises',
        error_ar: 'يجب أن تسمّي أنواع الموضوعات المسموح بها أنواعًا يعرفها العقد.',
        code: 'matter_types_invalid',
        recognised: PERMITTED_MATTER_TYPES,
        unknown,
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }
    if (!THRESHOLD_RULES.includes(policy.default_rule)) {
      return Response.json({
        error: 'default_rule must be one of the contract threshold rules',
        error_ar: 'قاعدة العتبة الافتراضية يجب أن تكون إحدى قواعد العقد.',
        code: 'rule_invalid',
        recognised: THRESHOLD_RULES,
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }

    const config_key = `circulation_policy:${committee_id}`;
    const payload = {
      ...policy,
      policy_version: typeof policy.policy_version === 'string' && policy.policy_version ? policy.policy_version : String(Date.now()),
      contract_version: CIRCULATION_CONTRACT_VERSION,
      recorded_by_user_id: auth.user.id,
      recorded_by_name: auth.user.full_name || auth.user.email,
      recorded_at: new Date().toISOString(),
    };

    const existing = (await base44.asServiceRole.entities.GovernanceConfig
      .filter({ config_key }, { limit: 1 }).catch(() => []));
    const row = (existing && existing[0]) || null;
    const saved = row
      ? await base44.asServiceRole.entities.GovernanceConfig.update(row.id, { payload })
      : await base44.asServiceRole.entities.GovernanceConfig.create({ config_key, payload });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'circulation.policy_recorded', entity_type: 'GovernanceConfig', entity_id: saved.id,
      entity_title: 'سياسة القرار بالتمرير',
      description: `Circulation policy recorded (finalizer role: ${policy.finalizer_role}; default rule: ${policy.default_rule}; matters: ${matters.join(', ')})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      config_key,
      policy_version: payload.policy_version,
      contract_version: CIRCULATION_CONTRACT_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}