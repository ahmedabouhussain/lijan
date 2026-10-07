import {
  PARTICIPATION_MATRIX_VERSION, PARTICIPATION_RIGHTS, PARTICIPATION_RIGHT_KEYS, PARTICIPANT_KINDS,
  RIGHTS_SEPARATIONS, PRESENCE_STATES, PRESENCE_DECLARATIONS, PARTICIPATION_REFUSALS,
  KIND_DECLARATION_REQUIRED, rightsForKind, evaluateParticipant, presenceOf, assertMatrixIntegrity,
} from '../../shared/participationMatrix.ts';

// TestParticipationMatrix — أسرة الاختبار لعقد المشاركة (الموجز §4B): تُثبت القاعدة ولا تُمارس معالجًا.
// Every case is a policy sentence, and the suite reads NO record and writes nothing
// (`writes_performed: 0` · `records_read: 0`). What it does NOT prove is stated in the response:
// no persisted participant, no browser journey, no reconfirmation performed by a real person.
const results: any[] = [];
const check = (id: string, description: string, condition: boolean, detail?: any) => {
  results.push({ id, description, passed: !!condition, detail: detail ?? null });
};

const denied = (evaluation: any, right: string) => evaluation.withheld.some((w: any) => w.right === right);
const allowed = (evaluation: any, right: string) => evaluation.rights[right] === true;
const has = (evaluation: any, code: string) => evaluation.withheld.some((w: any) => w.code === code);

export default async function () {
  const integrity = assertMatrixIntegrity();

  check('PM-001', 'فحص السجل الذاتي: كل نوع مصدر سلطة وحقوق معلنة، وكل رفض له جملتان و«ما لا يُفترض»', integrity.ok, integrity.findings);
  check('PM-002', 'تسعة أنواع مشارك معلنة، وستة عشر حقًّا مستقلة', integrity.kinds === 9 && integrity.rights === 16, { kinds: integrity.kinds, rights: integrity.rights });
  check('PM-003', 'الفصل بين إقرار الحضور وإقرار التأليف والتصويت والاعتماد ذو الأثر النظامي مُعلن', RIGHTS_SEPARATIONS.length === 4);
  check('PM-004', 'تسع حالات حضور معلنة، وليس القبول ولا الرابط حضورًا', Object.keys(PRESENCE_STATES).length === 9 && PRESENCE_DECLARATIONS.link_is_not_presence !== undefined);
  check('PM-005', 'إعادة الإدخال لا تُعيد حقًّا منتهيًا — مُعلن في العقد', PRESENCE_DECLARATIONS.reentry_does_not_restore !== undefined);
  check('PM-006', 'سحب الوصول يسري على الواجهات والملفات والتصدير والبحث والذكاء والمحادثة والتسجيلات', PRESENCE_DECLARATIONS.revocation_reach !== undefined);
  check('PM-007', 'كل نوع إضافي يستلزم إعلان أربع وقائع (مصدر سلطة · نطاق · تواريخ · حقوق منفصلة)', KIND_DECLARATION_REQUIRED.length === 4);

  // Label alone
  const label = evaluateParticipant({ kind: 'voting_member', kind_source: 'label_only' });
  check('PM-008', 'مسمّى نصّي حرّ لا يمنح حقًّا واحدًا — ولا حق يُحتجب صامتًا', PARTICIPATION_RIGHT_KEYS.every((r) => label.rights[r] === false) && has(label, 'label_grants_nothing'), label.withheld.length);

  // Guest scope
  const guestOk = evaluateParticipant({ kind: 'invited_guest', guest: { item_id: 'i2', status: 'active' }, item_id: 'i2' });
  check('PM-009', 'ضيف على بند واحد: يقرأ مستندات بنده ويقدّم مادة، ولا يفتح الحزمة الكاملة ولا ينزّل ولا يوقّع', allowed(guestOk, 'view_item_documents') && !allowed(guestOk, 'view_full_pack') && !allowed(guestOk, 'download_export') && !allowed(guestOk, 'sign_minutes') && guestOk.rights.vote === undefined);
  const guestOtherItem = evaluateParticipant({ kind: 'invited_guest', guest: { item_id: 'i2', status: 'active' }, item_id: 'i7' });
  check('PM-010', 'ضيف يبلغ بندًا آخر ⇒ رفض بنطاق محدَّد لا حجب كامل', denied(guestOtherItem, 'view_item_documents') && has(guestOtherItem, 'guest_outside_item'));
  const guestExpired = evaluateParticipant({ kind: 'invited_guest', guest: { item_id: 'i2', status: 'expired' } });
  check('PM-011', 'انتهاء نافذة الرابط ⇒ لا حق يبقى، والرمز يدلّ على الانتهاء لا على الخطأ', PARTICIPATION_RIGHT_KEYS.every((r) => guestExpired.rights[r] === false) && has(guestExpired, 'grant_window_closed'));
  const guestClosed = evaluateParticipant({ kind: 'invited_guest', guest: { item_id: 'i2', status: 'active' }, item_id: 'i2', item: { closed: true } });
  check('PM-012', 'بند مغلق والضيف داخله ⇒ يخرج من نطاق الجلسة المحمية برمزه', has(guestClosed, 'guest_in_closed_item') && denied(guestClosed, 'view_item_documents'));

  // Observer / expert / external representative / secretariat / interpreter
  check('PM-013', 'المراقب: لا تصويت ولا مساهمة في النصاب ولا اعتماد افتراضيًّا', PARTICIPANT_KINDS.observer.vote === 'never' && PARTICIPANT_KINDS.observer.quorum === 'never' && !allowed(evaluateParticipant({ kind: 'observer' }), 'approve_or_ratify'));
  check('PM-014', 'الخبير: لا سلطات لجنة إلا بتعيين منفصل — ولا تصويت ولا نصاب', PARTICIPANT_KINDS.invited_expert.vote === 'never' && PARTICIPANT_KINDS.invited_expert.quorum === 'never');
  check('PM-015', 'ممثل الجهة: التمثيل يُسجَّل والدعوة وحدها لا تمنح سلطة قرار', PARTICIPANT_KINDS.external_representative.vote === 'only_if_formally_seated' && !allowed(evaluateParticipant({ kind: 'external_representative' }), 'approve_or_ratify'));
  check('PM-016', 'السكرتارية: مهام تشغيلية بلا تصويت ولا تصديق', PARTICIPANT_KINDS.secretariat_support.vote === 'never' && !allowed(evaluateParticipant({ kind: 'secretariat_support' }), 'sign_minutes'));
  check('PM-017', 'المترجم/الدعم: وصول محدود بسرية ورضا، وليس حساب قارئ عام', PARTICIPANT_KINDS.interpreter_support.rights.includes('view_full_pack') === false);

  // Non-voting member / quorum separation
  check('PM-018', 'غير المُصوِّت: مشاركة بلا تصويت، واحتسابه في نصاب بعينه تقرّره وثيقة التأسيس', PARTICIPANT_KINDS.non_voting_member.vote === 'never' && PARTICIPANT_KINDS.non_voting_member.quorum === 'instrument_decides');
  check('PM-019', 'النصاب لا يُحتسب من العقد: المحتسب الوحيد هو «حاضر ومؤهّل»، والباقي «الوثيقة تقرّر» أو «لا»', Object.values(PARTICIPANT_KINDS).every((k: any) => ['if_present_and_eligible', 'instrument_decides', 'never'].includes(k.quorum)));

  // Alternate containment
  const altDup = evaluateParticipant({ kind: 'alternate', alternate: { active: true, principal_present: true } });
  check('PM-020', 'الأصل والبديل معًا ⇒ لا صوتان ولا مقعد مرتين، وأفعال البديل تتوقف', has(altDup, 'alternate_duplicate_principal'));
  const altExpired = evaluateParticipant({ kind: 'alternate', alternate: { active: true, window_closed: true } });
  check('PM-021', 'انقضاء نافذة البديل ⇒ تعود الصفة إلى الأصل بالرمز نفسه', has(altExpired, 'grant_window_closed'));

  // Recording consent + amendment
  const noConsent = evaluateParticipant({ kind: 'voting_member', recording_enabled: true, requests: { view_recordings: true } });
  check('PM-022', 'تسجيل قائم بلا إشعار ورضا ⇒ لا عرض تسجيلات ولا محادثة، والحضور ليس رضًا', has(noConsent, 'recording_consent_missing') && denied(noConsent, 'view_recordings'));
  const amended = evaluateParticipant({ kind: 'voting_member', invitation: { material_amendment: true, reconfirmed: false } });
  check('PM-023', 'تعديل جوهري في الدعوة ⇒ الحقوق الموسَّعة معلَّقة حتى إعادة التأكيد', has(amended, 'amendment_requires_reconfirmation') && denied(amended, 'view_full_pack'));
  const reconfirmed = evaluateParticipant({ kind: 'voting_member', invitation: { material_amendment: true, reconfirmed: true } });
  check('PM-024', 'وبعد إعادة التأكيد يعود الحق — التعليق لا الحذف', reconfirmed.rights.view_full_pack === true && reconfirmed.withheld.length === 0);

  // Attestation separation
  const attest = evaluateParticipant({ kind: 'observer' });
  check('PM-025', 'من يقرّ حضوره لا يكتسب بذلك توقيع محضر ولا اعتمادًا — والفصل مُعلن برمزه', RIGHTS_SEPARATIONS.some((s) => s.key === 'attestation_is_not_approval' || s.key === 'legally_meaningful_approval') && !allowed(attest, 'sign_minutes'));

  // Presence states
  check('PM-026', 'القبول ليس حضورًا، والدخول ليس حضورًا، والوقائع الزمنية وحدها تنتج «حاضر»', presenceOf({ presence: { accepted_at: 'x' } }) === 'accepted' && presenceOf({ presence: { admitted_at: 'x' } }) === 'admitted' && presenceOf({ presence: { entry_at: 'x' } }) === 'present');
  check('PM-027', 'الخروج يُقاس بالفواصل الزمنية، وإعادة الإدخال حالة معلنة لا استعادة حق', presenceOf({ presence: { entry_at: 'a', exit_at: 'b' } }) === 'left' && presenceOf({ presence: { entry_at: 'a', exit_at: 'b', re_entry_at: 'c' } }) === 're_admitted');

  // Withheld rights are never silent
  const anyWithheld = [label, guestOtherItem, guestExpired, guestClosed, altDup, noConsent, amended];
  check('PM-028', 'لا حق محتجب بلا رمز وجملتين: كل احتجاب مصحوب بسببه بلسانين', anyWithheld.every((e) => e.withheld.every((w: any) => w.code && w.ar && w.en)));
  check('PM-029', 'كل رفض معلن يحمل صنفه وطريقة حلّه و«ما لا يُفترض»', Object.values(PARTICIPATION_REFUSALS).every((r: any) => r.class && r.resolution && r.never_ar && r.never_en));
  check('PM-030', 'لا نوع يمنح الاعتماد افتراضيًّا في المصفوفة المعلنة', PARTICIPATION_RIGHT_KEYS.includes('approve_or_ratify') && Object.values(PARTICIPANT_KINDS).every((k: any) => k.rights.includes('approve_or_ratify') === false));

  check('PM-031', 'العقد يُعلن نفسه بنسخته، والحقوق الستة عشر مصدرها واحد', PARTICIPATION_MATRIX_VERSION === 'participation-matrix-1.0.0' && Object.keys(PARTICIPATION_RIGHTS).length === 16);

  const failures = results.filter((r) => !r.passed);
  return Response.json({
    suite: 'TestParticipationMatrix',
    contract_version: PARTICIPATION_MATRIX_VERSION,
    passed: results.length - failures.length,
    total: results.length,
    failures,
    results,
    writes_performed: 0,
    records_read: 0,
    not_proven_ar: 'لا تُثبت هذه الأسرة مشاركًا محفوظًا، ولا مسار متصفح، ولا إعادة تأكيد نفّذها شخص حقيقي، ولا قراءة حيّة على لجنة.',
    not_proven_en: 'This suite proves no persisted participant, no browser journey, no reconfirmation performed by a real person, and no live read on a committee.',
  });
}