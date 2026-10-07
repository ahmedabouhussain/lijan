// participation-matrix-1.0.0 — المادة ب: عقد المشاركة والضيوف والحضور (الموجز مراجعة 5 §4B).
//
// WHY THIS EXISTS (D-111). The brief separates FOUR records that this build had been treating loosely:
// the committee appointment, the meeting invitation, the agenda-item participation and the granted
// permissions. An invitation creates no membership, no vote, no quorum eligibility, no ratification
// power and no access to future meetings — and until now nothing in the build could state, per
// participant, which rights a person actually holds and WHY. Guests were item-scoped in practice but
// the taxonomy, the independent rights matrix, the presence states and the reconfirmation rule had no
// single declared home.
//
// WHAT THIS MODULE IS. A declaration plus a pure evaluator: nine participant kinds, sixteen rights that
// are granted INDEPENDENTLY of each other, four acts that are deliberately separated, nine presence
// states, and a refusal for every way the matrix can stop a participant. It reads no record and writes
// nothing — the governed read passes records in, and this returns rights with the reason each withheld
// right was withheld.
//
// WHAT IT DOES NOT CLAIM. It does not create login identities, invitations or persistent permissions
// (the brief forbids that), it does not decide institutional policy, and it does not replace the
// electorate: quorum is computed from the frozen electorate, never from this matrix. Explicit
// per-participant RECORDED configuration is a declared next slice — today every kind is derived from a
// canonical record, and `kind_source` says so on every row.

export const PARTICIPATION_MATRIX_VERSION = 'participation-matrix-1.0.0';

/** The sixteen rights. Each is granted independently — no right implies another. */
export const PARTICIPATION_RIGHTS = {
  attend: { ar: 'الحضور في الاجتماع', en: 'Attend the meeting' },
  speak_present: { ar: 'التحدّث أو العرض', en: 'Speak or present' },
  submit_material: { ar: 'تقديم مادة أو سؤال', en: 'Submit material or a question' },
  view_item_documents: { ar: 'عرض مستندات البند المعني', en: 'View the item’s documents' },
  view_reference_documents: { ar: 'عرض المستندات المرجعية المصرّح بها', en: 'View the permitted reference documents' },
  view_full_pack: { ar: 'عرض حزمة الاجتماع كاملة', en: 'View the full meeting pack' },
  annotate_privately: { ar: 'التعليق الخاص', en: 'Annotate privately' },
  share_comments: { ar: 'مشاركة التعليقات', en: 'Share comments' },
  download_export: { ar: 'التنزيل أو التصدير', en: 'Download or export' },
  receive_notifications: { ar: 'تلقّي الإشعارات', en: 'Receive notifications' },
  access_chat: { ar: 'الوصول إلى المحادثة', en: 'Access chat' },
  view_recordings: { ar: 'عرض التسجيلات', en: 'View recordings' },
  acknowledge_attendance: { ar: 'إقرار الحضور', en: 'Acknowledge attendance' },
  attest_authored_material: { ar: 'إقرار تأليف مادة', en: 'Attest authored material' },
  sign_minutes: { ar: 'توقيع المحضر', en: 'Sign minutes' },
  approve_or_ratify: { ar: 'الاعتماد أو التصديق', en: 'Approve or ratify' },
};

export const PARTICIPATION_RIGHT_KEYS = Object.keys(PARTICIPATION_RIGHTS);

// Four different acts, never one. Declared because the brief names them separately, and because a
// surface that shows one as the other is the exact defect this contract exists to prevent.
export const RIGHTS_SEPARATIONS = [
  { key: 'attendance_acknowledgement', ar: 'إقرار الحضور ليس تصويتًا ولا اعتمادًا.', en: 'Acknowledging attendance is neither a vote nor an approval.' },
  { key: 'minutes_attestation', ar: 'إقرار أو توقيع المحضر ليس تصويتًا على القرار.', en: 'Attesting or signing minutes is not a vote on the decision.' },
  { key: 'vote', ar: 'التصويت يقع على هيئة مجمّدة وبدورة، لا بمجرّد الحضور.', en: 'A vote rests on a frozen electorate and a round, never on presence alone.' },
  { key: 'legally_meaningful_approval', ar: 'الاعتماد ذو الأثر النظامي ليس إقرارًا ولا توقيع صورة.', en: 'A legally meaningful approval is neither an acknowledgement nor an image signature.' },
];

/** Nine participant kinds. `source_authority` is mandatory: a free-text label grants nothing. */
export const PARTICIPANT_KINDS = {
  voting_member: {
    ar: 'عضو مُصوِّت', en: 'Appointed voting member',
    source_authority: 'CommitteeMembership (seat with voting_right = true, status active)',
    vote: 'under_effective_seat_and_policy', quorum: 'if_present_and_eligible',
    rights: ['attend', 'speak_present', 'submit_material', 'view_item_documents', 'view_reference_documents', 'view_full_pack', 'annotate_privately', 'share_comments', 'download_export', 'receive_notifications', 'access_chat', 'view_recordings', 'acknowledge_attendance', 'attest_authored_material', 'sign_minutes'],
    note_ar: 'القاعدة التي يسمّيها الموجز: الأهلية بموجب التعيين الساري والمقعد والموضوع والتضارب وسياسة التصويت — ويُحتسب النصاب منفصلًا عن أهلية التصويت.',
    note_en: 'The brief’s default: eligibility follows the effective appointment, seat, topic, conflict and voting policy — and quorum is calculated separately from vote eligibility.',
  },
  non_voting_member: {
    ar: 'عضو غير مُصوِّت', en: 'Appointed non-voting member',
    source_authority: 'CommitteeMembership (seat with voting_right = false, status active)',
    vote: 'never', quorum: 'instrument_decides',
    rights: ['attend', 'speak_present', 'submit_material', 'view_item_documents', 'view_reference_documents', 'view_full_pack', 'annotate_privately', 'share_comments', 'download_export', 'receive_notifications', 'access_chat', 'view_recordings', 'acknowledge_attendance', 'attest_authored_material'],
    note_ar: 'المشاركة مسموحة والتصويت ممنوع؛ وهل يُحتسب لحضوره في نصاب بعينه تقرّره وثيقة التأسيس نفسها لا هذا العقد.',
    note_en: 'Participation is permitted and the vote is not; whether this participant counts toward a given quorum is determined by the constituting instrument, not by this contract.',
  },
  alternate: {
    ar: 'بديل أو مُعوَّض مُفعَّل', en: 'Activated alternate / substitute',
    source_authority: 'AlternateActivation (active) bound to the principal seat and its window',
    vote: 'while_window_is_open', quorum: 'instrument_decides',
    rights: ['attend', 'speak_present', 'submit_material', 'view_item_documents', 'view_reference_documents', 'view_full_pack', 'annotate_privately', 'share_comments', 'download_export', 'receive_notifications', 'access_chat', 'view_recordings', 'acknowledge_attendance', 'attest_authored_material', 'sign_minutes'],
    note_ar: 'المقعد والمدة والنطاق وحدها؛ ولا يُحسب الأصل والبديل معًا، وبانقضاء النافذة تعود الصفة إلى الأصل.',
    note_en: 'Only the valid principal, seat, scope and time window; principal and alternate are never counted together, and on expiry the capacity returns to the principal.',
  },
  observer: {
    ar: 'مراقب', en: 'Observer',
    source_authority: 'CommitteeMembership (role observer, status active)',
    vote: 'never', quorum: 'never',
    rights: ['attend', 'view_item_documents', 'receive_notifications'],
    note_ar: 'المراقبة داخل البنود المحددة؛ ولا تصويت ولا مساهمة في النصاب ولا اعتماد رسمي افتراضيًا.',
    note_en: 'Observation within the specified items; no default vote, quorum contribution or official approval.',
  },
  invited_expert: {
    ar: 'خبير أو مستشار مدعوّ', en: 'Invited expert / adviser',
    source_authority: 'CommitteeMembership (role advisor) or a recorded item-scoped invitation',
    vote: 'never', quorum: 'never',
    rights: ['attend', 'speak_present', 'submit_material', 'view_item_documents', 'view_reference_documents', 'annotate_privately', 'receive_notifications'],
    note_ar: 'القراءة والمساهمة في السؤال والمواد المُسندة فقط؛ ولا سلطات لجنة إلا بتعيين منفصل ومصرَّح به.',
    note_en: 'Read and contribute only to the assigned question and materials; no committee powers unless separately appointed and authorized.',
  },
  invited_guest: {
    ar: 'ضيف أو مُقدِّم مدعوّ', en: 'Invited guest / presenter',
    source_authority: 'AgendaItemGuest (token, scope item_only, expiry)',
    vote: 'never', quorum: 'never',
    rights: ['attend', 'speak_present', 'submit_material', 'view_item_documents', 'view_reference_documents', 'receive_notifications', 'acknowledge_attendance'],
    note_ar: 'بند وزمن محددان؛ وحضور أي موضع آخر يستلزم إذنًا خاصًّا به، ولا يُفتح المحضر الكامل ولا التنزيل.',
    note_en: 'A specified item and time slot; attendance elsewhere requires its own permission, and the full minutes and download stay closed.',
  },
  external_representative: {
    ar: 'ممثل جهة خارجية', en: 'External agency representative',
    source_authority: 'CommitteeMembership (membership_type represented/external) or a recorded invitation',
    vote: 'only_if_formally_seated', quorum: 'instrument_decides',
    rights: ['attend', 'speak_present', 'view_item_documents', 'view_reference_documents', 'receive_notifications'],
    note_ar: 'التمثيل يُسجَّل، والدعوة وحدها لا تمنح سلطة قرار: يُفرَّق بين مقعد ممثل معيَّن رسميًّا وضيف يقدّم مدخلات جهته.',
    note_en: 'Representation is recorded but an invitation alone grants no decision authority: a formally appointed representative seat is distinguished from a guest giving an agency’s input.',
  },
  secretariat_support: {
    ar: 'سكرتارية أو دعم', en: 'Secretariat / support',
    source_authority: 'CommitteeMembership (role secretary / committee_administrator) or an assigned duty',
    vote: 'never', quorum: 'never',
    rights: ['attend', 'submit_material', 'view_item_documents', 'view_reference_documents', 'view_full_pack', 'annotate_privately', 'share_comments', 'download_export', 'receive_notifications', 'access_chat', 'acknowledge_attendance'],
    note_ar: 'مهام الجدولة والتحضير والحضور والتدوين فقط؛ والمساعدة التشغيلية لا تعني تصويتًا ولا تصديقًا.',
    note_en: 'Only assigned scheduling, preparation, attendance or recording duties; operational assistance implies neither voting nor ratification.',
  },
  interpreter_support: {
    ar: 'مترجم أو دعم وصولي/تقني', en: 'Interpreter / accessibility or technical support',
    source_authority: 'a recorded bounded service assignment (scope, dates, confidentiality and consent)',
    vote: 'never', quorum: 'never',
    rights: ['attend', 'speak_present', 'view_item_documents', 'acknowledge_attendance'],
    note_ar: 'وصول محدود لازم للخدمة، بشروط سرية ورضا صريحين، وبلا سلطات حوكمة؛ ولا يُعامل كحساب قارئ عام للمستندات.',
    note_en: 'Necessary bounded access for the service, with explicit confidentiality and consent requirements, and no governance powers; it is never treated as a general document-reader account.',
  },
};

/** An additional role type must declare all four; a free-text label cannot grant access. */
export const KIND_DECLARATION_REQUIRED = ['source_authority', 'scope', 'dates', 'separate_rights'];

/** Nine presence states. A link, a connection attempt or an acceptance is NOT proof of presence. */
export const PRESENCE_STATES = {
  invited: { ar: 'مُدعى', en: 'Invited' },
  accepted: { ar: 'قبل الدعوة', en: 'Accepted' },
  waiting_lobby: { ar: 'منتظر (ردهة)', en: 'Waiting / lobby' },
  admitted: { ar: 'أُدخل', en: 'Admitted' },
  present: { ar: 'حاضر', en: 'Present' },
  temporarily_absent: { ar: 'غائب مؤقتًا', en: 'Temporarily absent' },
  recused: { ar: 'متنحٍّ عن البند', en: 'Recused from the item' },
  left: { ar: 'غادر', en: 'Left' },
  re_admitted: { ar: 'أُعيد إدخاله', en: 'Re-admitted' },
};

export const PRESENCE_DECLARATIONS = {
  link_is_not_presence: { ar: 'رابط اجتماع أو محاولة اتصال أو قبول دعوة ليس دليل حضور.', en: 'A meeting link, a connection attempt or an invitation acceptance is not proof of presence.' },
  reentry_does_not_restore: { ar: 'إعادة الإدخال لا تُعيد حقًّا منتهيًا أو مسحوبًا.', en: 'Re-entry does not restore an expired or revoked grant.' },
  closed_item_excludes: { ar: 'البند المغلق يقتضي خروج الضيوف وأصحاب التضارب من نطاق الجلسة المحمية.', en: 'A closed item requires guests and conflicted participants to leave the protected session scope.' },
  recording_requires_consent: { ar: 'إشعار التسجيل والرضا مطلوبان قبل تشغيل المعالجة؛ والحضور ليس رضًا شاملًا.', en: 'Recording notice and consent are required before the affected processing is enabled; attendance is not blanket consent.' },
  amendment_requires_reconfirmation: { ar: 'تعديل جوهري في الدعوة (بنود أو تسجيل أو مستندات أو مدة وصول) يقتضي تفويضًا جديدًا وإعادة تأكيد.', en: 'A material invitation amendment (added items, recording, documents or access duration) requires fresh authorization and reconfirmation.' },
  revocation_reach: { ar: 'الانتهاء والسحب يسريان على الواجهات المباشرة وروابط الملفات وتصدير الحزمة والبحث والذكاء والاستشهادات والتذكيرات والمحادثة والتسجيلات — لا على زر مخفي.', en: 'Expiry and revocation apply to direct APIs, file links, full-pack exports, search, AI/citations, reminders, chat and recordings — not to a hidden button.' },
  preview_scope: { ar: 'المعاينة كـ«المستلم» تمتد إلى المرفقات ومقتطف المحضر واستشهادات البحث والذكاء وحمولة الإشعار وإجراءات التنزيل.', en: 'The preview as recipient extends to attachments, the minutes extract, search/AI citations, the notification payload and the download actions.' },
};

/** Sixteen rights, nine kinds, four separations — every stop has a code, a sentence and a never-assume. */
// Every entry carries its `code` field so the register's own accounting tool sees these stops the same
// way it sees every other emitted code — a stop the harvest cannot see would be a stop the register
// could not account for.
export const PARTICIPATION_REFUSALS = {
  label_grants_nothing: {
    code: 'label_grants_nothing',
    class: 'boundary', resolution: 'policy_record',
    ar: 'مسمّى نصّي حرّ لا يمنح وصولًا: لا حقوق لأي مشارك بلا مصدر سلطة مسجَّل.',
    en: 'A free-text label grants no access: no participant holds rights without a recorded source authority.',
    never_ar: 'المسمّى ليس صفة، والصفة ليست إذنًا.', never_en: 'A label is not a capacity, and a capacity is not a permission.',
  },
  participant_kind_incomplete: {
    code: 'participant_kind_incomplete',
    class: 'boundary', resolution: 'policy_record',
    ar: 'نوع مشارك إضافي بلا إعلان مصدر سلطته ونطاقه وتواريخه وحقوقه المنفصلة.',
    en: 'An additional participant kind without its declared source authority, scope, dates and separate rights.',
    never_ar: 'النوع الجديد لا يُستنتج من نوع قائم.', never_en: 'A new kind is never inferred from an existing one.',
  },
  guest_outside_item: {
    code: 'guest_outside_item',
    class: 'boundary', resolution: 'seated_actor',
    ar: 'ضيف بنطاق بند واحد حاول بلوغ بند آخر أو المحضر الكامل أو ملفات غير مرخّصة.',
    en: 'An item-scoped guest reached another item, the full minutes or an unrelated file.',
    never_ar: 'الرمز ليس دورًا أوسع، والبند ليس الاجتماع.', never_en: 'The token is not a wider role, and an item is not the meeting.',
  },
  guest_in_closed_item: {
    code: 'guest_in_closed_item',
    class: 'boundary', resolution: 'seated_actor',
    ar: 'البند مغلق وفيه ضيف أو صاحب تضارب: نطاق الجلسة المحمية لا يشملهم.',
    en: 'The item is closed and a guest or conflicted participant is inside it: the protected session scope does not include them.',
    never_ar: 'الإدخال السابق لا يُبقي حقًّا في بند مغلق.', never_en: 'An earlier admission keeps no right inside a closed item.',
  },
  alternate_duplicate_principal: {
    code: 'alternate_duplicate_principal',
    class: 'integrity', resolution: 'policy_record',
    ar: 'الأصل والبديل حاضران معًا: لا يُحسب المقعد مرتين ولا يُحتسب صوتان لشخص واحد.',
    en: 'Principal and alternate are both present: the seat is never counted twice and one person never casts two votes.',
    never_ar: 'التفعيل لا يضيف صوتًا.', never_en: 'Activation never adds a vote.',
  },
  attestation_is_not_approval: {
    code: 'attestation_is_not_approval',
    class: 'integrity', resolution: 'policy_record',
    ar: 'إقرار الحضور أو إقرار التأليف أو توقيع المحضر عُومل كتصويت أو اعتماد أو تصديق.',
    en: 'An attendance acknowledgement, an authorship attestation or a minutes signature was treated as a vote, an approval or a ratification.',
    never_ar: 'الأربعة أفعال مختلفة لا فعل واحد.', never_en: 'These are four different acts, never one.',
  },
  recording_consent_missing: {
    code: 'recording_consent_missing',
    class: 'refusal', resolution: 'policy_record',
    ar: 'تسجيل أو تفريغ بلا إشعار ورضا مطابقين للسياسة السارية.',
    en: 'Recording or transcription without the notice and consent the applicable policy requires.',
    never_ar: 'الحضور ليس رضًا بالتسجيل.', never_en: 'Attendance is not consent to recording.',
  },
  grant_window_closed: {
    code: 'grant_window_closed',
    class: 'boundary', resolution: 'seated_actor',
    ar: 'نافذة الوصول منتهية أو مسحوبة: الرابط القديم لا يُعيد الوصول.',
    en: 'The access window has expired or been revoked: an old link does not restore access.',
    never_ar: 'الانتهاء لا يعيد تأريخ ما وقع، ولا يمسح ما سُجِّل.', never_en: 'Expiry neither backdates what happened nor erases what was recorded.',
  },
  amendment_requires_reconfirmation: {
    code: 'amendment_requires_reconfirmation',
    class: 'refusal', resolution: 'policy_record',
    ar: 'الدعوة عُدِّلت جوهريًّا: الحقوق الموسَّعة تُعلَّق حتى إعادة تأكيد المشارك.',
    en: 'The invitation was materially amended: expanded rights are held until the participant reconfirms.',
    never_ar: 'الدعوة القديمة لا تُجيز نطاقًا موسَّعًا بصمت.', never_en: 'An old invitation never silently authorizes expanded scope.',
  },
};

export function rightsForKind(kind: string): { rights: Record<string, boolean>; unknown: boolean } {
  const spec = (PARTICIPANT_KINDS as any)[kind];
  if (!spec) {
    const none: Record<string, boolean> = {};
    PARTICIPATION_RIGHT_KEYS.forEach((r) => { none[r] = false; });
    return { rights: none, unknown: true };
  }
  const rights: Record<string, boolean> = {};
  PARTICIPATION_RIGHT_KEYS.forEach((r) => { rights[r] = spec.rights.includes(r); });
  return { rights, unknown: false };
}

const deny = (rights: Record<string, boolean>, withheld: any[], right: string, code: string) => {
  rights[right] = false;
  withheld.push({ right, code, ar: (PARTICIPATION_REFUSALS as any)[code].ar, en: (PARTICIPATION_REFUSALS as any)[code].en });
};

/**
 * evaluateParticipant — pure. Rights for one participant, with the reason each withheld right was
 * withheld. A withheld right is NEVER silent: every one carries its code and its sentence.
 */
export function evaluateParticipant(input: any = {}) {
  const kind = input.kind;
  const kindSource = input.kind_source || 'derived_from_record';
  const withheld: any[] = [];
  const findings: any[] = [];

  if (kindSource === 'label_only') {
    const { rights } = rightsForKind(null as any);
    PARTICIPATION_RIGHT_KEYS.forEach((r) => deny(rights, withheld, r, 'label_grants_nothing'));
    return { kind, kind_source: kindSource, rights, withheld, findings: ['label_grants_nothing'], presence_state: null };
  }

  const { rights, unknown } = rightsForKind(kind);
  if (unknown) {
    PARTICIPATION_RIGHT_KEYS.forEach((r) => deny(rights, withheld, r, 'participant_kind_incomplete'));
    return { kind, kind_source: kindSource, rights, withheld, findings: ['participant_kind_incomplete'], presence_state: presenceOf(input) };
  }

  // Guest scope: one item, one window. Anything else the kind holds is left as declared.
  if (kind === 'invited_guest') {
    const guest = input.guest || {};
    const closed = input.item && input.item.closed === true;
    if (guest.status === 'expired' || guest.status === 'revoked' || guest.window_closed === true) {
      PARTICIPATION_RIGHT_KEYS.forEach((r) => deny(rights, withheld, r, 'grant_window_closed'));
      findings.push('grant_window_closed');
    } else if (input.item_id && guest.item_id && input.item_id !== guest.item_id) {
      deny(rights, withheld, 'view_item_documents', 'guest_outside_item');
      deny(rights, withheld, 'view_reference_documents', 'guest_outside_item');
      deny(rights, withheld, 'submit_material', 'guest_outside_item');
      findings.push('guest_outside_item');
    } else if (closed) {
      deny(rights, withheld, 'view_item_documents', 'guest_in_closed_item');
      deny(rights, withheld, 'view_reference_documents', 'guest_in_closed_item');
      deny(rights, withheld, 'attend', 'guest_in_closed_item');
      findings.push('guest_in_closed_item');
    }
  }

  // A recused participant inside a closed protected item.
  if (input.item && input.item.closed === true && input.recusal && input.recusal.active === true && kind !== 'invited_guest') {
    deny(rights, withheld, 'view_item_documents', 'guest_in_closed_item');
    deny(rights, withheld, 'view_full_pack', 'guest_in_closed_item');
    deny(rights, withheld, 'download_export', 'guest_in_closed_item');
    findings.push('guest_in_closed_item');
  }

  // Alternate containment: principal present ⇒ neither is counted twice, the alternate's acts stop.
  if (kind === 'alternate') {
    const alt = input.alternate || {};
    if (alt.principal_present === true) {
      // Two capacities for one seat at once: the seat is never counted twice, so the alternate's
      // personal acts stop under their OWN code — never blurred into the expiry code.
      ['sign_minutes', 'attest_authored_material', 'view_full_pack'].forEach((r) => deny(rights, withheld, r, 'alternate_duplicate_principal'));
      findings.push('alternate_duplicate_principal');
    } else if (alt.window_closed === true || alt.active === false) {
      ['sign_minutes', 'attest_authored_material'].forEach((r) => deny(rights, withheld, r, 'grant_window_closed'));
      findings.push('grant_window_closed');
    }
  }

  // Recording / transcription requires notice and consent before the processing is enabled.
  const wantsRecording = input.requests && (input.requests.access_chat || input.requests.view_recordings);
  if (input.recording_enabled === true && wantsRecording) {
    const consent = input.consent || {};
    if (consent.recording_notice !== true || consent.consented !== true) {
      deny(rights, withheld, 'view_recordings', 'recording_consent_missing');
      deny(rights, withheld, 'access_chat', 'recording_consent_missing');
      findings.push('recording_consent_missing');
    }
  }

  // A material amendment holds expanded rights until the participant reconfirms.
  if (input.invitation && input.invitation.material_amendment === true && input.invitation.reconfirmed !== true) {
    ['view_full_pack', 'download_export', 'view_recordings', 'access_chat'].forEach((r) => {
      if (rights[r]) deny(rights, withheld, r, 'amendment_requires_reconfirmation');
    });
    findings.push('amendment_requires_reconfirmation');
  }

  return { kind, kind_source: kindSource, rights, withheld, findings, presence_state: presenceOf(input) };
}

/** Presence is read from recorded intervals, never inferred from a link or an acceptance. */
export function presenceOf(input: any = {}) {
  const p = input.presence || {};
  if (input.recusal && input.recusal.active === true) return 'recused';
  if (p.exit_at && !p.re_entry_at) return 'left';
  if (p.re_entry_at) return 're_admitted';
  if (p.entry_at) return 'present';
  if (p.admitted_at) return 'admitted';
  if (p.waiting_since) return 'waiting_lobby';
  if (p.accepted_at) return 'accepted';
  return 'invited';
}

/** The register's own self-check: a kind without a source authority or a right is a defect, not a style. */
export function assertMatrixIntegrity() {
  const findings: string[] = [];
  Object.entries(PARTICIPANT_KINDS).forEach(([key, spec]: [string, any]) => {
    if (!spec.source_authority || !spec.source_authority.trim()) findings.push(`kind_without_source:${key}`);
    if (!Array.isArray(spec.rights) || spec.rights.length === 0) findings.push(`kind_without_rights:${key}`);
    (spec.rights || []).forEach((r: string) => { if (!PARTICIPATION_RIGHT_KEYS.includes(r)) findings.push(`right_undeclared:${key}:${r}`); });
    if (!spec.ar || !spec.en) findings.push(`kind_sentence_missing:${key}`);
    if (!spec.vote || !spec.quorum) findings.push(`kind_quorum_or_vote_undeclared:${key}`);
  });
  Object.values(PARTICIPATION_REFUSALS).forEach((r: any) => {
    if (!r.ar || !r.en || !r.never_ar || !r.never_en) findings.push('refusal_sentence_missing');
    if (!r.class || !r.resolution) findings.push('refusal_class_or_resolution_missing');
  });
  if (RIGHTS_SEPARATIONS.length !== 4) findings.push('separations_not_declared');
  if (Object.keys(PRESENCE_STATES).length !== 9) findings.push('presence_states_incomplete');
  if (KIND_DECLARATION_REQUIRED.length !== 4) findings.push('kind_declaration_incomplete');
  return { ok: findings.length === 0, findings, kinds: Object.keys(PARTICIPANT_KINDS).length, rights: PARTICIPATION_RIGHT_KEYS.length, refusals: Object.keys(PARTICIPATION_REFUSALS).length };
}