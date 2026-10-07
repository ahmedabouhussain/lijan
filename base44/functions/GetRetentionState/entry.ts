import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import {
  RETENTION_VERSION, RECORD_CLASSES, RETENTION_STATES, RETENTION_REFUSALS, NO_DELETION, DISPOSAL_ROUTES, classState,
} from '../../shared/retentionSchedule.ts';

// GetRetentionState — ماذا يعني جدول الاحتفاظ اليوم، صنفًا صنفًا: القاعدة المسجَّلة (أو غيابها)،
// وأقدم مادة فعليًا محفوظة، وهل انقضت المدة، وهل يقف حجز قانوني.
//
// Four honest distinctions this read keeps:
//   • صنف بلا قاعدة يقرأ **غير محسوم** — لا دائمًا ولا قابلًا للإتلاف.
//   • صنف فارغ ≠ مدة لم تنقضِ: الفراغ يُقال بلفظه.
//   • مصدر لم يُقرأ يُسمّى (`unread_sources`) ولا يُحسب صفرًا.
//   • حال حجز لم تُثبت ⇒ لا تُثبت أهلية إجراء (fail-closed).
// وهو لا يُتلف شيئًا: لا كتابة ولا حذف في هذا المسار إطلاقًا.
const asArray = (x) => (Array.isArray(x) ? x : (x && x.items) || []);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id } = body || {};
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

    let rules: any[] = [];
    let rules_readable = true;
    try {
      const rows = await sr.entities.RetentionRule.filter({ committee_id, status: 'active' }, { limit: 20 });
      rules = asArray(rows);
    } catch (_e) {
      rules_readable = false;
      unread_sources.push('RetentionRule');
    }
    const byClass = new Map<string, any>();
    for (const r of rules) if (!byClass.has(r.record_class)) byClass.set(r.record_class, r);

    // الحجز القانوني: يُقاس على مواد الإجراءات (الصنف الوحيد المرتبط بالالتزامات مباشرة).
    let holds_count: number | null = null;
    let holds_readable = true;
    try {
      const rows = await sr.entities.ChangeDisposition
        .filter({ committee_id, legal_hold: true, status: { $ne: 'hold_released' } }, { limit: 200 });
      holds_count = asArray(rows).length;
    } catch (_e) {
      holds_readable = false;
      holds_count = null;
      unread_sources.push('ChangeDisposition');
    }

    const classes: any[] = [];
    for (const key of Object.keys(RECORD_CLASSES)) {
      const spec = RECORD_CLASSES[key];
      let count: number | null = null;
      let oldest_at: string | null = null;
      let material_readable = true;
      try {
        const res = await sr.entities[spec.entity].aggregate({
          query: { committee_id, ...spec.query },
          min: [spec.date_field],
        });
        const row = (res && res.rows && res.rows[0]) || null;
        count = row ? (row.count ?? null) : 0;
        oldest_at = row ? (row[`min_${spec.date_field}`] ?? row[spec.date_field] ?? null) : null;
      } catch (_e) {
        material_readable = false;
        unread_sources.push(spec.entity);
      }

      const rule = rules_readable ? (byClass.get(key) || null) : null;
      const verdict = classState({
        rule,
        oldest_at,
        hold_count: key === 'action_evidence' ? (holds_count || 0) : 0,
        hold_readable: key === 'action_evidence' ? holds_readable : true,
        material_readable,
        now: new Date().toISOString(),
      });

      classes.push({
        record_class: key,
        label: { ar: spec.ar, en: spec.en },
        count_scope: spec.count_scope,
        rule: rule ? {
          id: rule.id, basis: rule.basis, retention_years: rule.retention_years,
          disposal_authority: rule.disposal_authority, disposal_route: rule.disposal_route,
          instrument_basis: rule.instrument_basis, recorded_at: rule.recorded_at,
          recorded_by_name: rule.recorded_by_name, policy_version: rule.policy_version,
        } : null,
        materials: { count, oldest_at, read: material_readable },
        state: verdict.state,
        state_note: RETENTION_STATES[verdict.state] || null,
        eligible_since: verdict.eligible_since,
        fail_closed: verdict.fail_closed === true,
        holes: {
          rule_missing: rules_readable && !rule,
          oldest_not_read: material_readable && count !== null && count > 0 && !oldest_at,
          material_not_read: !material_readable,
        },
      });
    }

    return Response.json({
      contract_version: RETENTION_VERSION,
      rule_state: rules_readable ? null : RETENTION_STATES.unresolved_no_rule,
      rules_readable,
      no_deletion: NO_DELETION,
      disposal_route: { key: 'institutional_review_only', ...DISPOSAL_ROUTES.institutional_review_only },
      classes,
      holds: { count: holds_count, readable: holds_readable, applies_to: 'action_evidence' },
      unresolved_classes: classes.filter((c) => c.state === 'unresolved_no_rule').map((c) => c.record_class),
      eligible_classes: classes.filter((c) => c.state === 'eligible_for_review').map((c) => c.record_class),
      held_classes: classes.filter((c) => c.state === 'held').map((c) => c.record_class),
      unread_sources,
      decides_nothing: true,
      note_ar: 'قراءة لا تُنفِّذ إجراءً ولا تُتلف سجلًا: تعرض القاعدة المسجَّلة وما تعنيه اليوم، وكل صنف بلا قاعدة يبقى قرار المؤسسة قائمًا.',
      note_en: 'A read that performs no disposition and erases no record: it shows the recorded rule and what it means today, and every class without a rule stays the institution\'s open decision.',
      read_at: new Date().toISOString(),
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}