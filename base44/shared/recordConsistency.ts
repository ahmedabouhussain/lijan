// record-consistency-1.0.0 — المادة و: قواعد الاتساق بين السجلات (فحص لا تصحيح).
//
// The rules below hold ACROSS records of different entities — the places where one record can be
// internally sound and still contradict another. They are evaluated by a pure function over records that
// were already read, so the check can be proven without a database, and the governed command that feeds
// it stays a thin, bounded reader.
//
// TWO HONESTY RULES, both enforced in code:
//   1. A rule whose source could not be read is NOT EVALUATED — it is named with the missing source, and
//      it never reports "no violation". A failed read is not an absence.
//   2. This module REPORTS. It never writes, never corrects, and never stops an act: prevention lives in
//      the commands themselves, and the owner reads this to see where the engine and the records diverge.
//
// A rule is deliberately NOT a re-decision: it never recomputes an electorate, never re-judges a vote,
// and never re-evaluates standing — the contracts that own those decisions already do, at the instant.

export const RECORD_CONSISTENCY_VERSION = 'record-consistency-1.0.0';

export const CONSISTENCY_SEVERITIES = {
  blocking: { ar: 'خلل حاكم: سجل رسمي يخالف قاعدته — يُعرض للمالك أولًا، والوقاية في الأمر الذي أنتجه.', en: 'A governing defect: an official record contradicting its own rule — shown to the owner first, and prevention lives in the command that produced it.' },
  advisory: { ar: 'ملاحظة تُقرأ مقابل سياسة المؤسسة لا مقابل حكم آلي.', en: 'A note to be read against the institution\'s policy, not against an automated verdict.' },
};

const R = (id: string, severity: string, reads: string[], ar: string, en: string, run: any) => ({ id, severity, reads, ar, en, run });

const v = (rule: any, record_type: string, record_id: string, detail_ar: string, detail_en: string) =>
  ({ rule_id: rule.id, severity: rule.severity, record_type, record_id, detail_ar, detail_en });

export const CONSISTENCY_RULES = [
  R('RC-01', 'blocking', ['actions'],
    'إجراء مقفل بلا حكم مقبول يُخالف عقد قبول الأدلة.',
    'A closed action without an accepted verdict contradicts the evidence-acceptance contract.',
    (d: any) => (d.actions || []).filter((a: any) => a.status === 'closed' && a.verification_state !== 'accepted')
      .map((a: any) => v(CONSISTENCY_RULES[0], 'Action', a.id, `مقفل بحالة دليل «${a.verification_state || 'غير محددة'}» بلا حكم مقبول.`, `Closed with evidence state "${a.verification_state || 'unset'}" and no accepted verdict.`))),

  R('RC-02', 'blocking', ['actions'],
    'مقدّم الدليل ظهر مُتحقِّقًا منه: يفصل الفعل عن صفته.',
    'The evidence submitter appears as its verifier: acting and capacity are separated.',
    (d: any) => (d.actions || []).filter((a: any) => a.verification_state === 'accepted' && a.verified_by_user_id
      && a.evidence_submitted_by_user_id && a.verified_by_user_id === a.evidence_submitted_by_user_id)
      .map((a: any) => v(CONSISTENCY_RULES[1], 'Action', a.id, 'المُتحقِّق هو المُقدِّم نفسه.', 'The verifier is the submitter himself.'))),

  R('RC-03', 'blocking', ['actions', 'dispositions'],
    'إجراء مقفل تحت حجز قانوني قائم: الحجز يوقف الإغلاق.',
    'An action closed under a standing legal hold: a hold stops closure.',
    (d: any) => (d.actions || []).filter((a: any) => a.status === 'closed'
      && (d.dispositions || []).some((x: any) => x.source_entity_type === 'Action' && x.source_entity_id === a.id && x.legal_hold === true && !x.hold_released_at))
      .map((a: any) => v(CONSISTENCY_RULES[2], 'Action', a.id, 'أُقفل بينما حجز قانوني قائم عليه.', 'Closed while a legal hold stands on it.'))),

  R('RC-04', 'blocking', ['decisions', 'snapshots'],
    'قرار يُعلن إصدارًا مكتملًا بلا حزمة إصدار محفوظة أو بلا بصمتها.',
    'A decision declaring a complete issuance without a saved package, or without its fingerprint.',
    (d: any) => (d.decisions || []).filter((x: any) => x.issuance_state === 'complete')
      .flatMap((x: any) => {
        const out: any[] = [];
        if (!x.issue_snapshot_id || !x.issue_manifest_sha256) {
          out.push(v(CONSISTENCY_RULES[3], 'Decision', x.id, 'إصدار «مكتمل» بلا معرّف حزمة أو بلا بصمة.', 'A "complete" issuance with no package id or no fingerprint.'));
        } else if (!(d.snapshots || []).some((s: any) => s.id === x.issue_snapshot_id)) {
          out.push(v(CONSISTENCY_RULES[3], 'Decision', x.id, 'معرّف الحزمة لا يقابل سجل حزمة في النطاق المقروء.', 'The package id matches no package record in the read scope.'));
        }
        return out;
      })),

  R('RC-05', 'advisory', ['decisions'],
    'قرار صادر بلا ربط بدورة: يُعلن غير مرتبط ولا يُفترض أنه لدورة اليوم (حزم قديمة).',
    'An issued decision with no bound round: declared unbound and never assumed to belong to today\'s round (legacy packages).',
    (d: any) => (d.decisions || []).filter((x: any) => x.issued_at && !x.round_snapshot_id)
      .map((x: any) => v(CONSISTENCY_RULES[4], 'Decision', x.id, 'حزمة صادرة غير مرتبطة بدورة مجمّدة.', 'An issued package with no bound frozen round.'))),

  R('RC-06', 'blocking', ['snapshots'],
    'حزمة إصدار بلا بصمة بيان، أو بأصوات مقبولة تزيد على حجم الهيئة.',
    'An issuance package with no manifest fingerprint, or with accepted ballots exceeding the electorate size.',
    (d: any) => (d.snapshots || []).flatMap((s: any) => {
      const out: any[] = [];
      if (!s.manifest_sha256) out.push(v(CONSISTENCY_RULES[5], 'IssueSnapshot', s.id, 'بلا بصمة بيان.', 'No manifest fingerprint.'));
      if (typeof s.accepted_ballot_count === 'number' && typeof s.electorate_size === 'number' && s.accepted_ballot_count > s.electorate_size) {
        out.push(v(CONSISTENCY_RULES[5], 'IssueSnapshot', s.id, 'أصوات مقبولة أكثر من حجم الهيئة.', 'Accepted ballots exceed the electorate size.'));
      }
      return out;
    })),

  R('RC-07', 'blocking', ['votes'],
    'صوت بلا دورة مجمّدة أو بلا مقعد أو بلا شخص: صوت لا يُنسب إلى هيئة مثبّتة.',
    'A ballot with no frozen round, no seat or no person: a ballot not attributable to a fixed electorate.',
    (d: any) => (d.votes || []).filter((x: any) => !x.eligible_voter_snapshot_id || !x.voter_membership_id || !x.voter_user_id)
      .map((x: any) => v(CONSISTENCY_RULES[6], 'Vote', x.id, 'ينقصه: ' + [(!x.eligible_voter_snapshot_id ? 'دورة مجمّدة' : null), (!x.voter_membership_id ? 'مقعد' : null), (!x.voter_user_id ? 'شخص' : null)].filter(Boolean).join(' · '), 'Missing: ' + [(!x.eligible_voter_snapshot_id ? 'frozen round' : null), (!x.voter_membership_id ? 'seat' : null), (!x.voter_user_id ? 'person' : null)].filter(Boolean).join(' · ')))),

  R('RC-08', 'blocking', ['attendance'],
    'صف حضور بلا مقعد: الحضور بلا مقعد شاهد لا يُبنى عليه نصاب.',
    'An attendance row with no seat: presence without a seat is evidence no quorum can rest on.',
    (d: any) => (d.attendance || []).filter((x: any) => !x.member_id)
      .map((x: any) => v(CONSISTENCY_RULES[7], 'Attendance', x.id, 'صف بلا معرّف مقعد.', 'A row with no seat identifier.'))),

  R('RC-09', 'blocking', ['electorates'],
    'مقاعد بلا صوت مستقل يجب أن تكون ضمن المقاعد المؤهلة — لا تُنقص الهيئة صامتة.',
    'Seats carrying no separate vote must lie inside the eligible seats — the electorate is never reduced silently.',
    (d: any) => (d.electorates || []).flatMap((x: any) => {
      const eligible = new Set(x.eligible_seat_ids || []);
      const stray = (x.non_voting_seat_ids || []).filter((s: string) => !eligible.has(s));
      return stray.length ? [v(CONSISTENCY_RULES[8], 'EligibleVoterSnapshot', x.id, `مقعد بلا صوت مستقل خارج المؤهلين (${stray.length}).`, `${stray.length} non-voting seat(s) lie outside the eligible set.`)] : [];
    })),

  R('RC-10', 'blocking', ['rounds'],
    'دورة تمرير مُرسلة على هيئة ناخبة فارغة أو بعدد ناخبين صفر.',
    'A dispatched circulation round on an empty electorate, or with a voting count of zero.',
    (d: any) => (d.rounds || []).filter((x: any) => ['dispatched', 'collecting', 'ready', 'approved'].includes(x.state)
      && (!(x.eligible_seat_ids || []).length || !(x.eligible_count >= 1)))
      .map((x: any) => v(CONSISTENCY_RULES[9], 'CirculationRound', x.id, 'دورة بلا مقاعد مؤهلة أو بعدد ناخبين صفر.', 'A round with no eligible seats, or a zero voting count.'))),

  R('RC-11', 'advisory', ['rounds'],
    'دورة معتمدة أنتجت نتيجتها من أرسلها (يُقرأ مقابل سياسة اللجنة: قد تجيزها).',
    'An approved round whose outcome was produced by its own dispatcher (read against the committee\'s policy, which may authorize it).',
    (d: any) => (d.rounds || []).filter((x: any) => x.state === 'approved' && (!x.finalized_by_user_id || x.finalized_by_user_id === x.dispatch_authorized_by_user_id))
      .map((x: any) => v(CONSISTENCY_RULES[10], 'CirculationRound', x.id, 'المُصادِق هو مُرسِل الدورة أو غير مُسمّى.', 'The finalizer is the dispatcher, or is unnamed.'))),

  R('RC-12', 'blocking', ['handovers'],
    'حزمة تسليم مقبولة وبها بنود غير محلولة، أو حسابها لا يجمع.',
    'An accepted handover pack holding unresolved items, or whose arithmetic does not add up.',
    (d: any) => (d.handovers || []).flatMap((x: any) => {
      const out: any[] = [];
      if (x.status === 'accepted' && (x.items_unresolved || 0) > 0) {
        out.push(v(CONSISTENCY_RULES[11], 'HandoverPack', x.id, 'مقبولة وفيها بنود غير محلولة يجب أن تبقى ظاهرة.', 'Accepted with unresolved items that must remain visible.'));
      }
      const sum = (x.items_assigned || 0) + (x.items_unresolved || 0);
      if (typeof x.items_total === 'number' && x.items_total !== sum) {
        out.push(v(CONSISTENCY_RULES[11], 'HandoverPack', x.id, `المجموع ${x.items_total} ولا يساوي ${sum}.`, `Total ${x.items_total} does not equal ${sum}.`));
      }
      return out;
    })),

  R('RC-13', 'blocking', ['memberships'],
    'تكليف مؤقت بلا وقت انتهاء: التكليف المحدود يجب أن ينتهي.',
    'A bounded appointment with no expiry: a bounded appointment must end.',
    (d: any) => (d.memberships || []).filter((x: any) => x.appointment_type === 'acting' && !x.acting_expires_at)
      .map((x: any) => v(CONSISTENCY_RULES[12], 'CommitteeMembership', x.id, 'تكليف مؤقت بلا وقت انتهاء.', 'An acting appointment with no expiry instant.'))),
] as any[];

/**
 * Evaluates the rules over records that were ALREADY read. Pure: no reads, no writes, no clock.
 * A rule whose source is unreadable is reported as NOT EVALUATED with the source named.
 */
export function evaluateConsistency(input: any) {
  const data = {
    actions: input?.actions || [], decisions: input?.decisions || [], snapshots: input?.snapshots || [],
    votes: input?.votes || [], attendance: input?.attendance || [], rounds: input?.rounds || [],
    electorates: input?.electorates || [], handovers: input?.handovers || [], dispositions: input?.dispositions || [],
    memberships: input?.memberships || [],
  };
  const unreadable = input?.unreadable || [];
  const unreadableSources = new Set(unreadable.map((u: any) => u.source));

  const violations: any[] = [];
  const evaluated: string[] = [];
  const not_evaluated: any[] = [];

  for (const rule of CONSISTENCY_RULES) {
    const missing = rule.reads.filter((s: string) => unreadableSources.has(s));
    if (missing.length) {
      not_evaluated.push({ rule_id: rule.id, severity: rule.severity, ar: rule.ar, en: rule.en, missing_sources: missing });
      continue;
    }
    evaluated.push(rule.id);
    violations.push(...(rule.run(data) || []));
  }

  const blocking = violations.filter((x) => x.severity === 'blocking');
  return {
    contract_version: RECORD_CONSISTENCY_VERSION,
    rules_declared: CONSISTENCY_RULES.length,
    rules_evaluated: evaluated,
    not_evaluated,
    violations,
    blocking_count: blocking.length,
    advisory_count: violations.length - blocking.length,
    verdict: not_evaluated.length ? 'partial' : (violations.length ? 'divergent' : 'consistent'),
    note_ar: 'فحص لا تصحيح: هذا التقرير لا يكتب ولا يصحّح ولا يوقف فعلًا — الوقاية في الأوامر المحكومة، والانحراف يُعرض للمالك ليقيسه مقابل سياسة المؤسسة.',
    note_en: 'A check, not a correction: this report writes nothing, corrects nothing and stops no act — prevention lives in the governed commands, and a divergence is shown to the owner to be measured against the institution\'s own policy.',
  };
}

/** The contract's own check: unique ids, declared severity, at least one source per rule, both languages. */
export function auditConsistencyContract() {
  const findings: any[] = [];
  const seen = new Set<string>();
  for (const rule of CONSISTENCY_RULES) {
    if (seen.has(rule.id)) findings.push({ code: 'duplicate_rule', rule: rule.id });
    seen.add(rule.id);
    if (!CONSISTENCY_SEVERITIES[rule.severity]) findings.push({ code: 'severity_undeclared', rule: rule.id, value: rule.severity });
    if (!(rule.reads || []).length) findings.push({ code: 'source_unnamed', rule: rule.id });
    if (!rule.ar || !rule.en) findings.push({ code: 'sentence_missing', rule: rule.id });
    if (typeof rule.run !== 'function') findings.push({ code: 'rule_not_executable', rule: rule.id });
    if (rule.write || rule.correct || rule.stop) findings.push({ code: 'checker_claims_a_write', rule: rule.id });
  }
  return { ok: findings.length === 0, findings, rules: CONSISTENCY_RULES.length, severities: Object.keys(CONSISTENCY_SEVERITIES) };
}