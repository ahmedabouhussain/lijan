import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { validateRoute, RATIFICATION_ROUTE_VERSION, OUTPUT_CLASS_KEYS } from '../../shared/ratificationRoute.ts';

// SetRatificationRoute — المؤسسة تُسجّل مسار التصديق: أي ناتج يقتضيه، ومَن يُصدِّق، وفي أي مدة،
// وما يفعله انقضاء المدة. تُكتب بحق إدارة اللجنة، ولا تُكتب داخل القرار نفسه: قاعدة يكتبها صاحب
// الناتج لنفسه هي عين العيب الذي مُنع في سجل التنفيذ (من قدّم الدليل لا يحكم عليه).
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, policy } = body || {};
    const route = policy && typeof policy === 'object' ? policy : body?.route;
    if (!committee_id || !route || typeof route !== 'object') {
      return Response.json({ error: 'committee_id and policy are required' }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const check: any = validateRoute(route);
    if (!check.ok) {
      return Response.json({
        error: check.message.en, error_ar: check.message.ar, code: check.code,
        missing_fields: check.missing || null, unknown: check.unknown || null,
        recognised_classes: OUTPUT_CLASS_KEYS,
        correlation_id: auth.correlation_id,
      }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const payload = {
      required_for: route.required_for,
      authority_seat_id: route.authority_seat_id || null,
      authority_role: route.authority_role || null,
      authority_name: route.authority_name || null,
      authority_external: route.authority_external || null,
      window_days: Number.isFinite(Number(route.window_days)) ? Number(route.window_days) : 0,
      on_lapse: route.on_lapse,
      instrument_basis: String(route.instrument_basis).trim(),
      policy_version: typeof route.policy_version === 'string' && route.policy_version ? route.policy_version : String(Date.now()),
      contract_version: RATIFICATION_ROUTE_VERSION,
      recorded_by_user_id: auth.user.id,
      recorded_by_name: auth.user.full_name || auth.user.email,
      recorded_at: new Date().toISOString(),
      status: 'active',
    };

    // المسار السابق يُستبدل ولا يُعاد كتابته: نصاب التصديق يُحكم عليه بالمسار الذي كان نافذًا وقته.
    const previous = await sr.entities.RatificationRoute.filter({ committee_id, status: 'active' }, { limit: 20 }).catch(() => []);
    const prevItems = Array.isArray(previous) ? previous : (previous && previous.items) || [];
    for (const row of prevItems) {
      await sr.entities.RatificationRoute.update(row.id, { status: 'superseded' }).catch(() => null);
    }

    const saved = await sr.entities.RatificationRoute.create({ organization_id: auth.organization_id, committee_id, ...payload });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'ratification.route_recorded', entity_type: 'RatificationRoute', entity_id: saved.id,
      entity_title: 'مسار التصديق',
      description: `Ratification route recorded (covers: ${payload.required_for.join(', ') || 'none'}; authority: ${payload.authority_seat_id || payload.authority_role || payload.authority_external}; window: ${payload.window_days || 'none'} days; lapse: ${payload.on_lapse})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      route_id: saved.id,
      contract_version: RATIFICATION_ROUTE_VERSION,
      required_for: payload.required_for,
      authority: { seat_id: payload.authority_seat_id, role: payload.authority_role, external: payload.authority_external },
      window_days: payload.window_days,
      on_lapse: payload.on_lapse,
      superseded: prevItems.length,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}