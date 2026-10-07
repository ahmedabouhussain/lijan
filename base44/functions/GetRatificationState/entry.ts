import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  RATIFICATION_ROUTE_VERSION, OUTPUT_CLASSES, RATIFICATION_STATES, LAPSE_OUTCOMES, ratificationVerdict,
} from '../../shared/ratificationRoute.ts';

// GetRatificationState — قراءة محكومة تجيب عن سؤال واحد: هل الناتج مصدَّق، أم ينتظر، أم أن المؤسسة
// لم تسجّل مسارها بعد (غير محسوم)، أم انقضت المدة قبل التصديق.
//
// Three facts it never conflates:
//   • «لا مسار مسجَّل» ≠ «لا يقتضي تصديقًا» — الأولى غير محسومة، والثانية قرار مؤسسة مكتوب.
//   • انقضاء المدة واقعة تمنع النفاذ، ولا تُقرأ اعتمادًا.
//   • مصدر لم يُقرأ يُعلن (`unread_sources`) ولا يُفسَّر صفرًا.
const asArray = (x) => (Array.isArray(x) ? x : (x && x.items) || []);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, output_type, output_id } = body || {};
    if (!committee_id) return Response.json({ error: 'committee_id is required' }, { status: 400 });

    const auth = await authorizeCommand(base44, {
      capability: 'read',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const sr = base44.asServiceRole;
    const unread_sources: string[] = [];
    const now = new Date().toISOString();

    let route = null;
    let route_readable = true;
    try {
      const rows = await sr.entities.RatificationRoute
        .filter({ committee_id, status: 'active' }, { sort: '-recorded_at', limit: 5 });
      const items = asArray(rows);
      route = items[0] || null;
      if (items.length > 1) unread_sources.push('more_than_one_active_route');
    } catch (_e) {
      route_readable = false;
      unread_sources.push('RatificationRoute');
    }

    // ما تقوله البنية حين لا تقول المؤسسة شيئًا: علاقة هيكلية تنص على تصديق ولا مسار مسجَّل.
    let structural_requirements: any = { read: true, count: 0, names: [] };
    if (route_readable && !route) {
      try {
        const rows = await sr.entities.CommitteeRelationship.filter({ committee_id, ratification_required: true }, { limit: 20 });
        const items = asArray(rows);
        structural_requirements = {
          read: true, count: items.length,
          names: items.map((r) => r.counterparty_name_ar || r.counterparty_name_en || r.counterparty_committee_id),
        };
      } catch (_e) {
        structural_requirements = { read: false, count: null, names: [] };
        unread_sources.push('CommitteeRelationship');
      }
    }

    const requiredFor = route ? (Array.isArray(route.required_for) ? route.required_for : []) : [];
    const routeView = route ? {
      id: route.id,
      required_for: requiredFor,
      authority: {
        seat_id: route.authority_seat_id || null,
        role: route.authority_role || null,
        external: route.authority_external || null,
        name: route.authority_name || null,
      },
      window_days: route.window_days || 0,
      on_lapse: route.on_lapse,
      on_lapse_note: route.on_lapse ? LAPSE_OUTCOMES[route.on_lapse] : null,
      instrument_basis: route.instrument_basis,
      recorded_at: route.recorded_at || null,
      recorded_by_name: route.recorded_by_name || null,
      policy_version: route.policy_version || null,
    } : null;

    const base = {
      contract_version: RATIFICATION_ROUTE_VERSION,
      route_state: route_readable ? (route ? 'recorded' : 'not_recorded') : 'unreadable',
      route_state_note: route_readable
        ? (route ? null : RATIFICATION_STATES.no_route_recorded)
        : RATIFICATION_STATES.route_unreadable,
      route: routeView,
      structural_requirements,
      unread_sources,
      decides_nothing: true,
      note_ar: 'قراءة لا تمنح سلطة ولا تقرّر تصديقًا: الفعل الوحيد الممكن هو `RecordRatification`، ويُعاد التحقق من صلاحيته في أمره.',
      note_en: 'A read that grants no authority and decides no ratification: the only act available is `RecordRatification`, re-authorized in its own command.',
      read_at: now,
    };

    // ── مسار ناتج واحد ────────────────────────────────────────────────────────────────────────────
    if (output_type || output_id) {
      const klass = OUTPUT_CLASSES[output_type];
      if (!klass || !output_id) {
        return Response.json({ error: 'output_type and output_id must both be given', recognised_classes: Object.keys(OUTPUT_CLASSES) }, { status: 400 });
      }

      let output = null;
      let output_readable = true;
      try {
        output = await sr.entities[klass.target_type].get(output_id);
      } catch (_e) {
        output_readable = false;
        unread_sources.push(klass.target_type);
      }
      if (!output) output_readable = false;

      let records: any[] = [];
      let records_readable = true;
      try {
        const rows = await sr.entities.RatificationRecord
          .filter({ committee_id, output_type, output_id }, { sort: '-decided_at', limit: 50 });
        records = asArray(rows);
      } catch (_e) {
        records_readable = false;
        unread_sources.push('RatificationRecord');
      }

      const verdict = !output_readable
        ? { state: 'output_not_readable', refusal: 'output_not_readable' }
        : !records_readable
          ? { state: 'route_unreadable', refusal: 'route_not_readable' }
          : ratificationVerdict({
            route,
            route_readable,
            required_classes: output_type,
            records,
            output_state: output ? output[klass.state_field] : null,
            now,
          });

      const state = RATIFICATION_STATES[verdict.state] || null;
      return Response.json({
        ...base,
        output: output ? {
          type: output_type, id: output_id,
          label: output.title_ar || output.title || output.title_en || output.id,
          state_field: klass.state_field,
          state: output[klass.state_field] || null,
        } : { type: output_type, id: output_id, read: false },
        verdict,
        verdict_note: state,
        disposition_history: records.map((r) => ({
          outcome: r.outcome, decided_at: r.decided_at,
          authority_name: r.authority_name, authority_capacity: r.authority_capacity,
          within_window: r.within_window === undefined ? null : r.within_window,
          output_state_at_record: r.output_state_at_record || null,
        })),
      });
    }

    // ── النواتج المنتظرة على مستوى اللجنة ─────────────────────────────────────────────────────────
    const awaiting: any[] = [];
    let counts: any = { awaiting: 0, decided: 0 };
    if (route_readable && requiredFor.length > 0) {
      let dispositions: any[] = [];
      let dispositions_readable = true;
      try {
        const rows = await sr.entities.RatificationRecord
          .filter({ committee_id }, { sort: '-decided_at', limit: 200 });
        dispositions = asArray(rows);
      } catch (_e) {
        dispositions_readable = false;
        unread_sources.push('RatificationRecord');
      }
      const latestByOutput = new Map<string, any>();
      for (const r of dispositions) {
        const key = `${r.output_type}:${r.output_id}`;
        if (!latestByOutput.has(key)) latestByOutput.set(key, r);
      }

      let listing: any[] = [];
      let listing_readable = true;
      try {
        const rows = await sr.entities.Decision
          .filter({ committee_id, status: { $in: ['issued', 'executing'] } }, { sort: '-created_date', limit: 100 });
        listing = asArray(rows);
      } catch (_e) {
        listing_readable = false;
        unread_sources.push('Decision');
      }

      if (requiredFor.includes('decision') && listing_readable) {
        for (const d of listing) {
          const rec = latestByOutput.get(`decision:${d.id}`) || null;
          const verdict = ratificationVerdict({ route, route_readable, required_classes: 'decision', records: rec ? [rec] : [], output_state: d.status, now });
          awaiting.push({
            output_type: 'decision', output_id: d.id,
            label: d.title_ar || d.title || d.title_en || d.id,
            number: d.decision_number || null,
            output_state: d.status,
            verdict_state: verdict.state,
            verdict_note: RATIFICATION_STATES[verdict.state] || null,
            window: verdict.window || null,
          });
        }
      }
      counts = {
        awaiting: awaiting.filter((a) => a.verdict_state === 'required_awaiting' || a.verdict_state === 'window_lapsed').length,
        decided: awaiting.filter((a) => a.verdict_state === 'ratified' || a.verdict_state === 'refused' || a.verdict_state === 'returned').length,
        listed: awaiting.length,
        listing_readable,
      };
    }

    return Response.json({ ...base, awaiting, counts });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}