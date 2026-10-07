import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  RETENTION_VERSION, RECORD_CLASSES, DISPOSAL_ROUTES, NO_DELETION, validateRule, classState,
} from '../../shared/retentionSchedule.ts';

// TestRetentionSchedule — أسرة عقد الاحتفاظ. تقيس العقد وحده: لا قراءة سجل ولا كتابة ولا إتلاف.
// Guard-rails this suite enforces:
//   • صنف بلا قاعدة يقرأ «غير محسوم» ولا يُفترض فيه دائم ولا قابل للإتلاف.
//   • انقضاء المدة يعرض الصنف على قرار المؤسسة، ولا يُتلف شيئًا.
//   • حجز قائم — أو حال حجز لم تُقرأ — يمنع الأهلية (fail-closed).
//   • صنف فارغ ≠ «مدة لم تنقضِ» بمعنى واحد: الفراغ يُقال صريحًا.
//   • لا صنف ميت: كل صنف معلن يسمّي سجله وحقله الزمني ونطاق حصره.
export default async function (req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const cases: any[] = [];
  const add = (id: string, desc: string, pass: boolean, detail?: any) => cases.push({ id, desc, pass: !!pass, detail: detail ?? null });

  const rule = (over: any = {}) => ({ record_class: 'minutes', basis: 'years', retention_years: 5, disposal_authority: 'أمانة اللجنة', instrument_basis: 'المادة (١٢) من لائحة الحفظ', ...over });
  const yearsAgo = (n: number) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return d.toISOString();
  };

  // ── Validation ────────────────────────────────────────────────────────────────────────────────
  add('RS-001', 'a rule naming no class is refused', !validateRule(rule({ record_class: null })).ok);
  add('RS-002', 'a rule for an undeclared class is refused', !validateRule(rule({ record_class: 'emails_' })).ok);
  add('RS-003', 'a stated period without a period is refused', !validateRule(rule({ retention_years: 0 })).ok);
  add('RS-004', 'permanence is a lawful decision and needs no number', validateRule(rule({ basis: 'permanent', retention_years: undefined })).ok);
  add('RS-005', 'a rule without the competent authority is refused', !validateRule(rule({ disposal_authority: '' })).ok);
  add('RS-006', 'a rule without the instrument clause is refused', !validateRule(rule({ instrument_basis: '' })).ok);
  add('RS-007', 'an undeclared disposal route is refused', !validateRule(rule({ disposal_route: 'erase' })).ok);
  add('RS-008', 'the only admitted disposal route is an institutional review that keeps the record', Object.keys(DISPOSAL_ROUTES).length === 1 && !!DISPOSAL_ROUTES.institutional_review_only);

  // ── What the rule means today ─────────────────────────────────────────────────────────────────
  add('RS-009', 'NO RULE reads unresolved — never permanent and never disposable', (() => {
    const s = classState({ rule: null, oldest_at: yearsAgo(20) });
    return s.state === 'unresolved_no_rule';
  })());
  add('RS-010', 'permanence never produces an eligible class, whatever its age', classState({ rule: rule({ basis: 'permanent' }), oldest_at: yearsAgo(40) }).state === 'permanent');
  add('RS-011', 'an elapsed period presents the class to the institution decision, with the instant it elapsed', (() => {
    const s = classState({ rule: rule({ retention_years: 3 }), oldest_at: yearsAgo(5) });
    return s.state === 'eligible_for_review' && !!s.eligible_since;
  })());
  add('RS-012', 'a running period stays within_period', classState({ rule: rule({ retention_years: 10 }), oldest_at: yearsAgo(2) }).state === 'within_period');
  add('RS-013', 'an EMPTY class is stated as empty rather than as an elapsed period', (() => {
    const s = classState({ rule: rule({ retention_years: 1 }), oldest_at: null });
    return s.state === 'within_period' && s.empty === true;
  })());
  add('RS-014', 'a standing hold stops the disposition even when the period has run', (() => {
    const s = classState({ rule: rule({ retention_years: 1 }), oldest_at: yearsAgo(9), hold_count: 2 });
    return s.state === 'held' && s.holds === 2;
  })());
  add('RS-015', 'a hold state that cannot be read grants no eligibility (what cannot be read is not absent)', (() => {
    const s = classState({ rule: rule({ retention_years: 1 }), oldest_at: yearsAgo(9), hold_readable: false });
    return s.state === 'held' && s.fail_closed === true;
  })());
  add('RS-016', 'material that could not be read claims neither an elapsed nor a running period', (() => {
    const s = classState({ rule: rule({ retention_years: 1 }), oldest_at: yearsAgo(9), material_readable: false });
    return s.state === 'unresolved_no_rule';
  })());
  add('RS-017', 'an unreadable oldest date is not converted into an elapsed period', (() => {
    const s = classState({ rule: rule({ retention_years: 1 }), oldest_at: 'ليس تاريخًا' });
    return s.state === 'within_period' && !s.eligible_since;
  })());

  // ── No dead class, no erasure, declared limits ────────────────────────────────────────────────
  add('RS-018', 'every declared class names its record, its date field and the scope of its count', Object.keys(RECORD_CLASSES).every((k) => {
    const c = RECORD_CLASSES[k];
    return !!c.entity && !!c.date_field && !!c.count_scope && !!c.ar && !!c.en;
  }));
  add('RS-019', 'the contract erases nothing and declares it in words', /لا يُتلف|never executed automatically/.test(NO_DELETION.ar) && /erases and deletes no record/.test(NO_DELETION.en));
  add('RS-020', 'no declared class is scoped so broadly that it would count private material', RECORD_CLASSES.annotations.query.is_private === false);

  const failures = cases.filter((c) => !c.pass);
  return Response.json({
    suite: 'TestRetentionSchedule',
    contract_version: RETENTION_VERSION,
    total: cases.length,
    passed: cases.length - failures.length,
    failures,
    writes_performed: 0,
    records_read: 0,
    verdict: failures.length === 0 ? 'PASS' : 'FAIL',
    scope_note: 'Proves the retention CONTRACT consumed by SetRetentionRule and GetRetentionState. No handler was exercised, no record was read or written, and no material was disposed of — this build erases nothing (no authorized seated actor — D-064).',
    note_ar: 'الأسرة تقيس العقد وحده، ولا تُتلف ولا تحذف شيئًا: لا قراءة سجل ولا كتابة.',
    note_en: 'This suite measures the contract alone and erases nothing: no record read and no write.',
    results: cases,
  });
}