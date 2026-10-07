import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  RATIFICATION_ROUTE_VERSION, OUTPUT_CLASSES, OUTCOMES, RATIFICATION_REFUSALS,
  authorityForActor, windowState,
} from '../../shared/ratificationRoute.ts';

// RecordRatification — واقعة التصديق: يُنفَّذ بمَن سمّته المؤسسة في مسارها المسجَّل، ويُكتب باسمه
// وصفته ومقعده، ويُقيَّد بحالة الناتج، ولا يُعاد كتابة وقته.
//
// The right exercised is the CLASS's own approval right (decision.approve · minutes.approve ·
// committee.manage) — لا حق جديد. ولذلك لا يرتفع خط الأساس ولا تُبطل أدلة النسخة.
//
// بوابة الحالة تقرأها هذه الوحدة من العقد نفسه (OUTPUT_CLASSES.ratifiable_states) لأن الفعل يُنشئ
// سجلًا على الناتج ولا يعدّله، وحارس الأوامر يطبّق بوابات الحالة على الأفعال المعدِّلة وحدها.
// ولا يوجد في البناء أي مسار آخر يكتب تصديقًا، فلا مصدر ثانٍ للحقيقة.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, output_type, output_id, outcome, instrument_basis, notes } = body || {};

    const klass = OUTPUT_CLASSES[output_type];
    if (!klass || !output_id || !OUTCOMES[outcome]) {
      return Response.json({
        error: 'output_type (decision|minutes|committee_relationship), output_id and outcome (ratified|refused|returned) are required',
        recognised_classes: Object.keys(OUTPUT_CLASSES),
        correlation_id: null,
      }, { status: 400 });
    }
    if (!instrument_basis || String(instrument_basis).trim().length < 5) {
      return Response.json({
        error: 'The instrument clause the disposition rests on is required',
        error_ar: 'يلزم نصّ السند النظامي الذي يستند إليه التصديق.',
        code: 'rule_incomplete',
      }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: klass.capability,
      target_type: klass.target_type,
      target_id: output_id,
      mode: 'create',
      claimed_committee_id: committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const derivedCommittee = auth.trusted_target?.derived_committee_id || auth.organization_id;
    const sr = base44.asServiceRole;

    // المسار النافذ وقته. ما لا يُقرأ ليس «لا مسار»: يُعلن تعذّر القراءة ولا يُفترض غياب القاعدة.
    let routeRows;
    try {
      routeRows = await sr.entities.RatificationRoute
        .filter({ committee_id: derivedCommittee, status: 'active' }, { sort: '-recorded_at', limit: 5 });
    } catch (_e) {
      return Response.json({
        error: RATIFICATION_REFUSALS.route_not_readable.en, error_ar: RATIFICATION_REFUSALS.route_not_readable.ar,
        code: 'route_not_readable', policy_version: auth.policy_version, correlation_id: auth.correlation_id,
      }, { status: 503 });
    }
    const route = (Array.isArray(routeRows) ? routeRows : (routeRows && routeRows.items) || [])[0] || null;

    if (!route) {
      return Response.json({
        error: RATIFICATION_REFUSALS.no_route_recorded.en, error_ar: RATIFICATION_REFUSALS.no_route_recorded.ar,
        code: 'no_route_recorded', remedy: { route: 'set_ratification_route' },
        contract_version: RATIFICATION_ROUTE_VERSION, correlation_id: auth.correlation_id,
      }, { status: 409 });
    }
    const requiredFor = Array.isArray(route.required_for) ? route.required_for : [];
    if (!requiredFor.includes(output_type)) {
      return Response.json({
        error: RATIFICATION_REFUSALS.class_not_required.en, error_ar: RATIFICATION_REFUSALS.class_not_required.ar,
        code: 'class_not_required', required_for: requiredFor,
        contract_version: RATIFICATION_ROUTE_VERSION, correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // جهة التصديق تُحلّ بالمعرّف أو بصفة المقعد — لا بالاسم.
    let seatsRows;
    try {
      seatsRows = await sr.entities.CommitteeMembership.filter({ committee_id: derivedCommittee, status: 'active' }, { limit: 200 });
    } catch (_e) {
      return Response.json({
        error: 'The committee seats could not be read, so the named authority cannot be established',
        error_ar: 'تعذّرت قراءة مقاعد اللجنة، فلا يمكن إثبات جهة التصديق المسمّاة.',
        code: 'authority_unavailable', correlation_id: auth.correlation_id,
      }, { status: 503 });
    }
    const seats = Array.isArray(seatsRows) ? seatsRows : (seatsRows && seatsRows.items) || [];
    const authority: any = authorityForActor(route, seats, auth.user.id);
    if (!authority.ok) {
      const text = RATIFICATION_REFUSALS[authority.code] || RATIFICATION_REFUSALS.not_the_named_authority;
      return Response.json({
        error: text.en, error_ar: text.ar, code: authority.code,
        named_authority: authority.named || null,
        contract_version: RATIFICATION_ROUTE_VERSION, correlation_id: auth.correlation_id,
      }, { status: authority.code === 'authority_outside_platform' ? 409 : 403 });
    }

    // حالة الناتج: لا يقع تصديق على مسودة.
    const outputState = auth.target ? auth.target[klass.state_field] : null;
    if (!klass.ratifiable_states.includes(outputState)) {
      return Response.json({
        error: RATIFICATION_REFUSALS.output_state_not_ratifiable.en, error_ar: RATIFICATION_REFUSALS.output_state_not_ratifiable.ar,
        code: 'output_state_not_ratifiable', actual: outputState || null, ratifiable_states: klass.ratifiable_states,
        contract_version: RATIFICATION_ROUTE_VERSION, correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    // المدة تُقاس من لحظة تسجيل المسار، والوقوع خارجها يُكتب كما هو ولا يُعاد كتابته.
    const win = windowState({ route, recorded_at: route.recorded_at, now: new Date().toISOString() });

    const saved = await sr.entities.RatificationRecord.create({
      organization_id: auth.organization_id, committee_id: derivedCommittee,
      output_type, output_id,
      output_state_at_record: outputState,
      route_id: route.id, route_version: route.policy_version || null,
      outcome,
      authority_seat_id: authority.seat?.id || null,
      authority_user_id: auth.user.id,
      authority_name: auth.user.full_name || auth.user.email,
      authority_capacity: authority.seat?.role || auth.effective_role || null,
      within_window: win.within,
      window_lapsed_at: win.lapsed_at,
      instrument_basis: String(instrument_basis).trim(),
      decided_at: new Date().toISOString(),
      notes: notes || null,
      contract_version: RATIFICATION_ROUTE_VERSION,
      correlation_id: auth.correlation_id,
    });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: derivedCommittee,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: `ratification.${outcome}`, entity_type: 'RatificationRecord', entity_id: saved.id,
      entity_title: `${output_type}: ${OUTCOMES[outcome].ar}`,
      description: `Ratification disposition recorded (${output_type} ${output_id}; outcome: ${outcome}; within window: ${win.within === null ? 'no window stated' : win.within}; route ${route.id})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      record_id: saved.id,
      outcome,
      within_window: win.within,
      window_lapsed_at: win.lapsed_at,
      late: win.within === false,
      contract_version: RATIFICATION_ROUTE_VERSION,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}