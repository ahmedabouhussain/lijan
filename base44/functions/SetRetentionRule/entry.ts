import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { validateRule, RETENTION_VERSION, RECORD_CLASSES, RETENTION_REFUSALS } from '../../shared/retentionSchedule.ts';

// SetRetentionRule — جدول الاحتفاظ قرار المؤسسة، يُسجَّل لكل صنف مواد، ويستلزم: المدة أو الدوام،
// والجهة المختصة بالإجراء، ونصّ السند النظامي. ولا يُنشئ البناء قاعدة بالنيابة عنها: الصنف بلا
// قاعدة يبقى **غير محسوم** في القراءة، ولا يُفترض أن الاحتفاظ دائم ولا أن الإتلاف جائز.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, rule } = body || {};
    if (!committee_id || !rule || typeof rule !== 'object') {
      return Response.json({ error: 'committee_id and rule are required' }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const check: any = validateRule(rule);
    if (!check.ok) {
      return Response.json({
        error: RETENTION_REFUSALS.rule_incomplete.en, error_ar: RETENTION_REFUSALS.rule_incomplete.ar,
        code: check.code, missing_fields: check.missing || null, unknown: check.unknown || null,
        recognised_classes: Object.keys(RECORD_CLASSES),
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const payload = {
      record_class: rule.record_class,
      basis: rule.basis,
      retention_years: rule.basis === 'years' ? Number(rule.retention_years) : null,
      disposal_authority: String(rule.disposal_authority).trim(),
      disposal_route: 'institutional_review_only',
      instrument_basis: String(rule.instrument_basis).trim(),
      policy_version: typeof rule.policy_version === 'string' && rule.policy_version ? rule.policy_version : String(Date.now()),
      contract_version: RETENTION_VERSION,
      recorded_by_user_id: auth.user.id,
      recorded_by_name: auth.user.full_name || auth.user.email,
      recorded_at: new Date().toISOString(),
      status: 'active',
    };

    // قاعدة الصنف السابقة تُستبدل ولا تُعاد كتابتها: ما كان نافذًا يبقى مقروءًا في سجله.
    const previous = await sr.entities.RetentionRule
      .filter({ committee_id, record_class: rule.record_class, status: 'active' }, { limit: 20 }).catch(() => []);
    const prevItems = Array.isArray(previous) ? previous : (previous && previous.items) || [];
    for (const row of prevItems) {
      await sr.entities.RetentionRule.update(row.id, { status: 'superseded' }).catch(() => null);
    }

    const saved = await sr.entities.RetentionRule.create({ organization_id: auth.organization_id, committee_id, ...payload });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'retention.rule_recorded', entity_type: 'RetentionRule', entity_id: saved.id,
      entity_title: `جدول الاحتفاظ — ${RECORD_CLASSES[payload.record_class].ar}`,
      description: `Retention rule recorded (${payload.record_class}: ${payload.basis === 'permanent' ? 'permanent' : `${payload.retention_years} years`}; disposition authority: ${payload.disposal_authority}; route: institutional review only, nothing is ever erased)`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      rule_id: saved.id,
      record_class: payload.record_class,
      basis: payload.basis,
      retention_years: payload.retention_years,
      disposal_route: payload.disposal_route,
      superseded: prevItems.length,
      contract_version: RETENTION_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}