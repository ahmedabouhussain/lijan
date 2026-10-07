import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  RATIFICATION_ROUTE_VERSION, OUTPUT_CLASSES, validateRoute, authorityForActor, windowState, ratificationVerdict,
} from '../../shared/ratificationRoute.ts';

// TestRatificationRoute — أسرة عقد مسار التصديق. تقيس العقد وحده: لا قراءة سجل ولا كتابة.
// The suite's own guard-rails:
//   • «لا مسار» لا يُقرأ «لا يقتضي» (unresolved ≠ not required).
//   • جهة التصديق تُحلّ بالمعرّف أو بالصفة — ولا توجد في العقد أي مقارنة بالاسم.
//   • انقضاء المدة لا يُنتج اعتمادًا، والتصديق المتأخر يبقى متأخرًا.
//   • كل صنف معلن يجب أن يُستهلك (لا صنف ميت) ويجب أن يكون حالات تصديقه معلنة.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases: any[] = [];
  const add = (id: string, desc: string, pass: boolean, detail?: any) => cases.push({ id, desc, pass: !!pass, detail: detail ?? null });

  const route = (over: any = {}) => ({
    id: 'rt1', required_for: ['decision'], authority_seat_id: 'seat-1', authority_name: null,
    window_days: 30, on_lapse: 'not_effective', instrument_basis: 'المادة (٧) من لائحة اللجنة',
    recorded_at: '2026-09-01T00:00:00.000Z', policy_version: 'v1', ...over,
  });
  const seats = [
    { id: 'seat-1', user_id: 'u-authority', status: 'active', role: 'chair' },
    { id: 'seat-2', user_id: 'u-other', status: 'active', role: 'member' },
  ];

  // ── Validation ────────────────────────────────────────────────────────────────────────────────
  add('RR-001', 'route with no required_for is refused', !validateRoute({ on_lapse: 'not_effective', instrument_basis: 'نصّ السند النظامي' }).ok);
  add('RR-002', 'route covering an undeclared class is refused', !validateRoute({
    required_for: ['policy'], authority_seat_id: 'seat-1', on_lapse: 'not_effective', instrument_basis: 'نصّ السند النظامي',
  }).ok);
  add('RR-003', 'route naming no authority is refused (no ratification by anyone)', !validateRoute({
    required_for: ['decision'], on_lapse: 'not_effective', instrument_basis: 'نصّ السند النظامي',
  }).ok);
  add('RR-004', 'an empty required_for list is a LAWFUL institutional decision', validateRoute({
    required_for: [], authority_role: 'chair', on_lapse: 'not_effective', instrument_basis: 'نصّ السند النظامي',
  }).ok);
  const external = validateRoute({
    required_for: ['decision'], authority_external: 'مجلس الوزراء', on_lapse: 'not_effective', instrument_basis: 'نصّ السند النظامي',
  });
  add('RR-005', 'an external ratifier is recorded, not refused', external.ok && external.external === true, external);
  add('RR-006', 'a lapse outcome is required and must be one of the declared two', ['not_effective', 'returned_for_reconsideration']
    .every((x) => validateRoute({ required_for: ['decision'], authority_seat_id: 'seat-1', on_lapse: x, instrument_basis: 'نصّ السند النظامي' }).ok)
    && !validateRoute({ required_for: ['decision'], authority_seat_id: 'seat-1', on_lapse: 'auto_approve', instrument_basis: 'نصّ السند النظامي' }).ok);
  add('RR-007', 'a one-word instrument basis is refused (the clause is what makes it reviewable)', !validateRoute({
    required_for: ['decision'], authority_seat_id: 'seat-1', on_lapse: 'not_effective', instrument_basis: 'قرار',
  }).ok);

  // ── Authority resolution — by identifier or by recorded role, never by name ───────────────────
  add('RR-008', 'the named seat ratifies by its own identifier', authorityForActor(route(), seats, 'u-authority').ok);
  add('RR-009', 'a seat that was not named cannot ratify', (() => {
    const r = authorityForActor(route(), seats, 'u-other');
    return !r.ok && r.code === 'not_the_named_authority';
  })());
  add('RR-010', 'a name alone NEVER establishes the authority', (() => {
    const r = authorityForActor({ required_for: ['decision'], authority_name: 'فلان بن فلان', on_lapse: 'not_effective' }, seats, 'u-other');
    return !r.ok && r.code === 'authority_not_named';
  })());
  add('RR-011', 'a recorded role resolves against the actor own seat', (() => {
    const ok = authorityForActor(route({ authority_seat_id: null, authority_role: 'chair' }), seats, 'u-authority');
    const no = authorityForActor(route({ authority_seat_id: null, authority_role: 'chair' }), seats, 'u-other');
    return ok.ok && !no.ok;
  })());
  add('RR-012', 'an external ratifier is never impersonated from inside', (() => {
    const r = authorityForActor({ required_for: ['decision'], authority_external: 'مجلس الوزراء' }, seats, 'u-authority');
    return !r.ok && r.code === 'authority_outside_platform';
  })());

  // ── The window ────────────────────────────────────────────────────────────────────────────────
  add('RR-013', 'no window stated means no window (never an invented deadline)', windowState({ route: route({ window_days: 0 }), recorded_at: route().recorded_at, now: '2026-10-07T00:00:00.000Z' }).state === 'none');
  add('RR-014', 'a window is measured from the route own recorded instant', (() => {
    const w = windowState({ route: route(), recorded_at: '2026-09-01T00:00:00.000Z', now: '2026-09-10T00:00:00.000Z' });
    return w.state === 'open' && w.within === true && w.lapsed_at === '2026-10-01T00:00:00.000Z';
  })());
  add('RR-015', 'a lapsed window is stated with its instant', (() => {
    const w = windowState({ route: route(), recorded_at: '2026-09-01T00:00:00.000Z', now: '2026-10-07T00:00:00.000Z' });
    return w.state === 'lapsed' && w.within === false;
  })());

  // ── Verdicts ──────────────────────────────────────────────────────────────────────────────────
  add('RR-016', 'NO RECORDED ROUTE reads unresolved — never "not required"', ratificationVerdict({ route: null, required_classes: 'decision' }).state === 'no_route_recorded');
  add('RR-017', 'an unreadable route reads unresolved and never clean', ratificationVerdict({ route: route(), route_readable: false, required_classes: 'decision' }).state === 'route_unreadable');
  add('RR-018', 'a class outside the recorded route reads not_required (a written decision)', ratificationVerdict({ route: route({ required_for: ['minutes'] }), required_classes: 'decision' }).state === 'not_required');
  add('RR-019', 'a draft (unratifiable state) cannot be ratified', ratificationVerdict({ route: route(), required_classes: 'decision', output_state: 'draft' }).state === 'output_state_not_ratifiable');
  add('RR-020', 'no disposition inside an open window reads required_awaiting', (() => {
    const v = ratificationVerdict({ route: route(), required_classes: 'decision', output_state: 'issued', records: [], now: '2026-09-10T00:00:00.000Z' });
    return v.state === 'required_awaiting' && v.window.state === 'open';
  })());
  add('RR-021', 'a lapse before any act reads window_lapsed (never approved by silence)', (() => {
    const v = ratificationVerdict({ route: route(), required_classes: 'decision', output_state: 'issued', records: [], now: '2026-10-07T00:00:00.000Z' });
    return v.state === 'window_lapsed' && v.on_lapse === 'not_effective';
  })());
  add('RR-022', 'the latest disposition governs, and a refusal is a disposition like any other', (() => {
    const v = ratificationVerdict({
      route: route(), required_classes: 'decision', output_state: 'issued',
      records: [
        { id: 'r1', outcome: 'ratified', decided_at: '2026-09-05T00:00:00.000Z', within_window: true },
        { id: 'r2', outcome: 'refused', decided_at: '2026-09-20T00:00:00.000Z', within_window: true },
      ],
    });
    return v.state === 'refused' && v.record_id === 'r2';
  })());
  add('RR-023', 'a late ratification is reported LATE and is never backdated into the window', (() => {
    const v = ratificationVerdict({
      route: route(), required_classes: 'decision', output_state: 'issued',
      records: [{ id: 'r9', outcome: 'ratified', decided_at: '2026-10-07T00:00:00.000Z', within_window: false }],
    });
    return v.state === 'ratified' && v.within_window === false;
  })());
  add('RR-024', 'every disposition carries its authority, capacity and instant', (() => {
    const v = ratificationVerdict({
      route: route(), required_classes: 'decision', output_state: 'issued',
      records: [{ id: 'r1', outcome: 'ratified', decided_at: '2026-09-05T00:00:00.000Z', within_window: true, authority_name: 'أ. سارة', authority_capacity: 'chair' }],
    });
    return v.authority_name === 'أ. سارة' && v.authority_capacity === 'chair' && !!v.recorded_at;
  })());

  // ── No dead class, no invented right ──────────────────────────────────────────────────────────
  add('RR-025', 'every declared class names its right, its record and its ratifiable states', Object.keys(OUTPUT_CLASSES).every((k) => {
    const c = OUTPUT_CLASSES[k];
    return !!c.capability && !!c.target_type && !!c.state_field && Array.isArray(c.ratifiable_states) && c.ratifiable_states.length > 0 && !!c.ar && !!c.en;
  }));
  add('RR-026', 'the contract names no new right: each class uses a right the catalogue already had', new Set(Object.keys(OUTPUT_CLASSES).map((k) => OUTPUT_CLASSES[k].capability)).size >= 2
    && Object.keys(OUTPUT_CLASSES).every((k) => !/ratif/.test(OUTPUT_CLASSES[k].capability)));

  const failures = cases.filter((c) => !c.pass);
  return Response.json({
    suite: 'TestRatificationRoute',
    contract_version: RATIFICATION_ROUTE_VERSION,
    total: cases.length,
    passed: cases.length - failures.length,
    failures,
    writes_performed: 0,
    records_read: 0,
    verdict: failures.length === 0 ? 'PASS' : 'FAIL',
    scope_note: 'Proves the ratification-route CONTRACT consumed by SetRatificationRoute, RecordRatification and GetRatificationState. No handler was exercised, no record was read or written, and no persisted ratification exists (no authorized seated actor — D-064).',
    note_ar: 'الأسرة تقيس العقد وحده: لا قراءة سجل ولا كتابة ولا مسار محفوظ.',
    note_en: 'This suite measures the contract alone: no record read, no write and no persisted path.',
    results: cases,
  });
}