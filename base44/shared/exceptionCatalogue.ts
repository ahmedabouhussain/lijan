import { RETRIEVAL_REFUSALS, AMEEN_RETRIEVAL_GUARD_VERSION } from './ameenRetrievalGuard.ts';
import { AUDIT_CHAIN_REFUSALS, AUDIT_CHAIN_VERSION } from './auditChain.ts';
import { METRIC_EXCEPTION_CODES, METRIC_DEFINITIONS_VERSION } from './metricDefinitions.ts';

// exception-catalogue-1.0.0 — المادة و: سجل الاستثناءات الواحد.
//
// WHY THIS EXISTS (D-098 class). Every governed act in this build can stop, and each stop was written
// inside the contract that raises it: a refusal with a code, a policy not recorded, an integrity failure,
// a scope boundary. Until now there was no ONE place that could answer the two questions a person
// actually asks — «ما الذي مُنع؟ ولماذا؟» and «مَن يحلّه؟» — and no place that could state what must
// NEVER be inferred from a stop (silence is not approval; an empty file is not proof nothing happened;
// an unreadable source is not an empty one). This is that register.
//
// WHAT IT IS NOT. It resolves nothing, it decides nothing, and it writes nothing. It is a declaration:
// for each exception, which contract raises it, what the person sees, what stops, who resolves it, and
// what may never be assumed while it stands. Resolution belongs to the owner, the policy record, or the
// correction path — never to the refusal itself.
//
// HONESTY OF THE REGISTER ITSELF. Each entry declares HOW it was established (`observed_live` when the
// code was seen on a real server response, `read_in_source` when it was read in the contract that emits
// it). One source is DERIVED: the AMEEN retrieval guard's refusal map is imported and compared, so this
// register cannot silently drift from it — and a derived source that yields nothing is reported as
// unreadable, not as completeness. What the register does NOT cover is named in `DECLARED_GAPS`.

export const EXCEPTION_CATALOGUE_VERSION = 'exception-catalogue-1.0.0';

export const EXCEPTION_CLASSES = {
  refusal: { ar: 'رفض محكوم: الفعل لا يقع، والسبب يُسمّى برمزه.', en: 'Governed refusal: the act does not happen and the reason is named by its code.' },
  unresolved: { ar: 'سياسة غير مسجَّلة: لا تُفترض قاعدة — ويتوقف الفعل الرسمي المتأثر وحده.', en: 'Policy not recorded: no rule is assumed — and only the affected official act stops.' },
  integrity: { ar: 'خلل سلامة: السجل أو بصمته لا تطابق ما تحمله؛ يُقرأ «غير متحقق» لا «سليم».', en: 'Integrity failure: the record or its fingerprint does not match what it carries; it reads unverified, never sound.' },
  boundary: { ar: 'حدّ نطاق: فعل أو قراءة خارج ما يملكه الفاعل أو الرابط.', en: 'Scope boundary: an act or a read outside what the actor or the link holds.' },
  degraded: { ar: 'قناة غير متاحة: الحوكمة تعمل بلا مزوّد خارجي، والحالة تُعلن.', en: 'Channel unavailable: governance runs without the external provider, and the state is declared.' },
  // `quarantine` is deliberately NOT declared here: a class with no emitter would be a promise, not a
  // register entry. It is declared the moment a path holds an ambiguous row (see DECLARED_GAPS).
};

export const EXCEPTION_RESOLUTIONS = {
  owner_decision: { ar: 'قرار المالك (سياسة لا تُخترع هنا).', en: 'The owner decides (a policy is never invented here).' },
  seated_actor: { ar: 'فاعل مُقعد مُصادَق يمارس الفعل الصحيح.', en: 'An authorized seated actor performs the right act.' },
  policy_record: { ar: 'تسجيل سياسة المؤسسة في سجلها ثم يُقيَّم الفعل من جديد.', en: 'The institution records its policy, then the act is re-evaluated.' },
  correction_record: { ar: 'سجل تصحيح جديد مرتبط بالأصل (لا تحرير لما صدر).', en: 'A new correction record linked to the original (nothing issued is edited).' },
  new_round: { ar: 'دورة جديدة مرقّمة (لا إعادة استخدام لدورة).', en: 'A new numbered round (a round is never reused).' },
  identity_binding: { ar: 'قيد الهوية على السجل نفسه قبل أي فعل.', en: 'The record is bound to its identity before any act.' },
  external_read: { ar: 'قراءة المصدر الخارجي وإعادته (لا يُفترض ما لم يُقرأ).', en: 'The external source is read and restored (nothing unread is assumed).' },
};

/** The one-line factory, so every entry carries the same declared shape. */
const E = (
  code: string, cls: string, contract: string, emitted_by: string,
  stops: string, resolution: string, basis: string,
  ar: string, en: string, neverAr: string, neverEn: string,
) => ({ code, class: cls, contract, emitted_by, stops, resolution, basis, ar, en, never_assume_ar: neverAr, never_assume_en: neverEn });

// `stops`: 'act' = the act does not happen · 'affected_only' = only the affected official act stops,
// the committee and its other records continue · 'read' = the read is refused and the source is named.
export const EXCEPTIONS = [
  // ── الإصدار والقرار ─────────────────────────────────────────────────────────────────────────────
  E('no_frozen_round', 'refusal', 'decision-integrity-1.2.0', 'IssueDecision', 'act', 'new_round', 'read_in_source',
    'لا دورة تصويت مجمَّدة لهذا القرار: لا إصدار، ولا بديل معتمد بالسياسة.',
    'No frozen voting round exists for this decision: nothing is issued, and no policy-authorized alternative stands.',
    'الغياب ليس دورة فارغة، ولا يُعاد حساب الهيئة من سجل اليوم.',
    'An absence is not an empty round, and the electorate is never recomputed from today\'s register.'),
  E('multiple_active_rounds', 'refusal', 'round-context-1.1.0', 'roundContext', 'act', 'owner_decision', 'read_in_source',
    'أكثر من دورة نشطة: لا تُختار دورة بالترتيب.',
    'More than one active round: no round is chosen by ordering.',
    'الترتيب ليس قرارًا، والأحدث ليس الأصح.',
    'Order is not a decision, and the newest is not the right one.'),
  E('issuance_package_exists', 'refusal', 'decision-integrity-1.2.0', 'IssueDecision', 'act', 'correction_record', 'read_in_source',
    'توجد حزمة إصدار محفوظة لهذا القرار: لا حزمة ثانية فوقها.',
    'A saved issuance package already exists for this decision: no second package is written over it.',
    'إعادة المحاولة ليست تصحيحًا، والتصحيح سجل جديد مرتبط بالأصل.',
    'A retry is not a correction: a correction is a new record linked to the original.'),
  E('already_issued', 'refusal', 'decision-lifecycle-1.1.0', 'IssueDecision', 'act', 'correction_record', 'read_in_source',
    'القرار صادر بالفعل: الإعادة تحقّق مكرَّر آمن من الحزمة نفسها، لا إصدار ثانٍ.',
    'The decision is already issued: a repeat is an idempotent re-verification of the same package, never a second issuance.',
    'الإصدار لا يتكرّر، والوقت لا يُعاد كتابته.',
    'An issuance never repeats, and its instant is never rewritten.'),
  E('unbound_legacy_package', 'integrity', 'decision-integrity-1.2.0', 'IssueDecision', 'affected_only', 'correction_record', 'read_in_source',
    'حزمة قديمة غير مرتبطة بدورتها: تُعلن غير مرتبطة ولا يُفترض أنها لدورة اليوم.',
    'A legacy package carries no bound round: it is declared unbound and never assumed to belong to today\'s round.',
    'غياب الربط ليس ربطًا بالدورة الحالية.',
    'An absent binding is not a binding to the current round.'),
  // ── النص المُصوَّت عليه ──────────────────────────────────────────────────────────────────────────
  E('no_frozen_content', 'refusal', 'proposal-content-1.0.0', 'CastVote · IssueDecision', 'act', 'new_round', 'read_in_source',
    'دورة سبقت تثبيت النص: لا يُسجَّل صوت ولا يصدر قرار على نص غير معروف.',
    'A round older than content freezing: no ballot is recorded and nothing is issued on an unknown text.',
    'النص المجمَّد هو النص المُصوَّت عليه، ولا يُستنتج من طابع زمني.',
    'The frozen text is the voted text, and it is never inferred from a timestamp.'),
  E('stale_content', 'refusal', 'material-change-1.0.0', 'CastVote · IssueDecision', 'act', 'new_round', 'read_in_source',
    'تغيّر النص بعد التجميد تغيّرًا جوهريًا: لا صوت ولا إصدار، والتغييرات تُسمّى.',
    'The text moved materially after freezing: no ballot and no issuance, and the changes are named.',
    'الصياغة ليست التغيير الوحيد، والمعنى يسبق اللفظ.',
    'Wording is not the only movement, and meaning precedes the words.'),
  E('frozen_content_tampered', 'integrity', 'proposal-content-1.0.0', 'CastVote · IssueDecision', 'act', 'correction_record', 'read_in_source',
    'المحتوى المجمَّد لا يعيد التجزئة إلى بصمته: لا يُعتمد دليلًا.',
    'The frozen content does not re-hash to its fingerprint: it is not sound evidence.',
    'المطابقة لا تُفترض: تُعاد الحساب.',
    'A match is never assumed: it is recomputed.'),
  // ── الهيئة الناخبة والتصويت ───────────────────────────────────────────────────────────────────────
  E('no_electorate', 'refusal', 'vote-eligibility-1.1.0', 'OpenVote', 'act', 'owner_decision', 'read_in_source',
    'لا مقعد مؤهل: لا يُفتح تصويت على هيئة صفرية.',
    'No eligible seat: no vote opens on an empty electorate.',
    'هيئة صفرية ليست تصويتًا بلا مشاركين.',
    'An empty electorate is not a vote without participants.'),
  E('no_frozen_electorate', 'refusal', 'round-context-1.1.0', 'CastVote', 'act', 'new_round', 'read_in_source',
    'دورة بلا سجل هيئة مجمّدة: لا يُنسب صوت إلى هيئة لم تُثبَّت.',
    'A round with no frozen electorate record: no ballot is attributed to an electorate that was never fixed.',
    'القاعدة لا تُستنتج من مَن يحمل مقعدًا اليوم.',
    'The electorate is never inferred from who holds a seat today.'),
  E('already_voted_in_round', 'refusal', 'round-context-1.1.0', 'CastVote', 'act', 'identity_binding', 'read_in_source',
    'صوّت الشخص في هذه الدورة (أصيلًا أو بديلًا): لا صوت ثانٍ.',
    'This person already voted in this round (in person or by alternate): there is no second ballot.',
    'المقعد المتعدد لا يضاعف الصوت.',
    'Holding more than one seat never multiplies a vote.'),
  E('seat_already_voted', 'refusal', 'round-context-1.1.0', 'CastVote', 'act', 'identity_binding', 'read_in_source',
    'صوّت المقعد في هذه الدورة: لا صوت ثانٍ على المقعد نفسه.',
    'This seat already voted in this round: there is no second ballot on the same seat.',
    'المقعد ليس الشخص، والصوت يُنتج مرة واحدة.',
    'A seat is not a person, and one ballot is produced once.'),
  E('quorum_unreachable', 'refusal', 'principal-representation-1.0.0', 'OpenVote · OpenCirculation', 'act', 'owner_decision', 'read_in_source',
    'النصاب لا يمكن بلوغه بالقدرة الحقيقية (الأشخاص لا المقاعد): لا تُفتح دورة على نصاب مستحيل.',
    'Quorum cannot be reached by real capacity (people, not seats): no round opens on an impossible quorum.',
    'العدد الظاهر ليس القدرة، والمقاعد لا تُضاعف الأشخاص.',
    'The visible count is not capacity, and seats never multiply people.'),
  E('principal_basis_unresolved', 'unresolved', 'principal-representation-1.0.0', 'OpenVote · OpenCirculation · RecordCirculationResponse', 'affected_only', 'policy_record', 'read_in_source',
    'أساس التمثيل عند تعدد المقاعد لم تسجّله المؤسسة: يتوقف الفعل المتأثر وحده حتى يُسجَّل.',
    'The institution has not recorded how multiple seats are counted: only the affected act stops until it is recorded.',
    'لا يُفترض أساس، ولا يُختار الأصلح للنتيجة.',
    'No basis is assumed, and none is chosen to suit the result.'),
  // ── القرار بالتمرير ─────────────────────────────────────────────────────────────────────────────
  E('round_already_open', 'refusal', 'circulation-approval-1.0.0', 'OpenCirculation', 'act', 'new_round', 'read_in_source',
    'توجد دورة تمرير مفتوحة: لا دورة ثانية فوقها.',
    'A circulation round is already open: no second round is opened over it.',
    'الدورة لا تُعاد استخدامًا ولا تُفتح مرتين.',
    'A round is never reused and never opened twice.'),
  E('multiple_approved_circulation_rounds', 'refusal', 'circulation-approval-1.0.0', 'IssueDecision', 'act', 'new_round', 'read_in_source',
    'أكثر من دورة تمرير معتمدة: لا يُصدر قرار من أي منهما بالترتيب.',
    'More than one approved circulation round: nothing is issued from either by ordering.',
    'الاعتماد المزدوج لا يُحل بالاختيار.',
    'A double approval is not resolved by picking one.'),
  E('invalidated_responses_present', 'refusal', 'circulation-approval-1.0.0', 'IssueDecision', 'act', 'new_round', 'read_in_source',
    'ردود مُبطَلة بتعديل مادي: لا إصدار عليها.',
    'Responses invalidated by a material amendment: nothing is issued on them.',
    'الإبطال يُحفظ كدليل ولا يُحتسب في نتيجة.',
    'An invalidation is kept as evidence and never counted into a result.'),
  E('silence_based_rule_unsupported', 'refusal', 'circulation-approval-1.0.0', 'SetCirculationPolicy', 'act', 'owner_decision', 'read_in_source',
    'سياسة تُصرّح بأن الصمت موافقة: مرفوضة.',
    'A policy declaring silence to be approval: refused.',
    'الصمت ليس موافقة في أي مسار.',
    'Silence is not approval on any path.'),
  E('invalidator_is_dispatcher', 'refusal', 'circulation-approval-1.0.0', 'FinalizeCirculation', 'act', 'owner_decision', 'read_in_source',
    'من أرسل الدورة يحاول إنتاج نتيجتها: يفصل الفعل عن صفته.',
    'The dispatcher is trying to produce the round\'s outcome: acting and capacity are separated.',
    'من يتصرّف لا يشهد لنفسه.',
    'Whoever acts does not attest to their own act.'),
  E('automatic_cancellation_unsupported', 'refusal', 'membership-effect-1.0.0', 'SetMembershipEffectPolicy', 'act', 'owner_decision', 'read_in_source',
    'سياسة تلغي الدورة تلقائيًا عند خروج عضو: مرفوضة — الإبطال فعل معتمد بسبب مذكور.',
    'A policy cancelling a round automatically when a member leaves: refused — invalidation is an authorized act with a stated reason.',
    'الانتهاء يقع بالواقعة، والإبطال بقرار.',
    'An end happens by the event; an invalidation happens by a decision.'),
  E('effect_policy_unresolved', 'unresolved', 'membership-effect-1.0.0', 'IssueDecision · RecordCirculationResponse', 'affected_only', 'policy_record', 'read_in_source',
    'أثر تغيّر العضوية داخل دورة جارية لم تسجّله المؤسسة: يتوقف الفعل الرسمي المتأثر وحده.',
    'The institution has not recorded what a membership change does inside a running round: only the affected official act stops.',
    'لا قاعدة تُفترض عند السكوت، والخيارات تُعرض للمالك.',
    'No rule is assumed in silence, and the authorized choices are put to the owner.'),
  // ── الأدلة والإغلاق ─────────────────────────────────────────────────────────────────────────────
  E('closure_requires_acceptance', 'refusal', 'evidence-acceptance-1.0.0', 'CloseAction', 'act', 'seated_actor', 'read_in_source',
    'الإغلاق يقتضي حكمًا مقبولًا من مُتحقِّق مستقل، لا وجود دليل.',
    'Closure requires an ACCEPTED verdict from an independent verifier, not the existence of evidence.',
    'التقديم ليس قبولًا، والملف الذي لم يُقرأ ليس ملفًا مقبولًا.',
    'Submission is not acceptance, and a file that was not read is not an accepted file.'),
  E('actor_not_independent', 'refusal', 'evidence-acceptance-1.0.0', 'ReviewActionEvidence · CloseAction', 'act', 'seated_actor', 'read_in_source',
    'من قدّم الدليل لا يحكم عليه ولا يُكمل بسجله.',
    'Whoever submitted the evidence does not judge it, and does not close on their own record.',
    'الشهادة الذاتية ليست تحققًا.',
    'A self-attestation is not a verification.'),
  E('legal_hold_active', 'refusal', 'institutional-change-1.0.0', 'CloseAction', 'act', 'owner_decision', 'read_in_source',
    'حجز قانوني قائم على الالتزام: يوقف الإغلاق والنقل والإسقاط بالانتهاء.',
    'A legal hold standing on the obligation: it stops closure, transfer, and expiry.',
    'الحجز لا يسقط بمرور الوقت ولا صمتًا.',
    'A hold does not lapse by time and never silently.'),
  E('hold_state_unverifiable', 'integrity', 'institutional-change-1.0.0', 'CloseAction', 'act', 'external_read', 'read_in_source',
    'لا يمكن إثبات غياب الحجز: يُرفض الإغلاق (fail-closed) لأن ما لا يُقرأ ليس غيابًا.',
    'The absence of a hold cannot be established: closure is refused (fail-closed), because what is not read is not an absence.',
    'القارئ الذي فشل لا يُنتج «لا حجز».',
    'A reader that failed does not produce "no hold".'),
  E('no_deletion', 'refusal', 'institutional-change-1.0.0', 'RecordChangeDisposition', 'act', 'owner_decision', 'read_in_source',
    'لا حذف في نظام حوكمة: الالتزام يُصرف بحالة لا بحذف.',
    'No deletion in a governance system: an obligation is disposed of by a state, never by a deletion.',
    'التصرف ليس إذنًا بالحذف.',
    'A disposition is not permission to delete.'),
  // ── الهوية والقيام ───────────────────────────────────────────────────────────────────────────────
  E('STANDING_REQUIRED', 'refusal', 'membership-effect-1.0.0', 'commandGuard', 'act', 'seated_actor', 'read_in_source',
    'لا صفة قائمة في اللحظة (مدة انتهت أو تكليف مؤقت انقضى): لا فعل.',
    'No standing at the instant (a term ended, a bounded appointment expired): no act.',
    'حالة السجل ليست قيامًا، والواقعة الزمنية تحكم.',
    'A record state is not standing; the instant governs.'),
  E('ACTOR_IDENTITY_REQUIRED', 'refusal', 'continuity-1.0.0', 'commandGuard', 'act', 'identity_binding', 'read_in_source',
    'فعل شخصي يخصّ غير المُنادي: لا يقع على دور أي كان.',
    'A personal act about someone other than the caller: it happens on no role, however senior.',
    'المنصب لا يمارس فعلًا شخصيًا عن غيره.',
    'An office does not perform a personal act for someone else.'),
  E('CIRCULATION_IDENTITY_BOUND', 'refusal', 'circulation-approval-1.0.0', 'commandGuard', 'act', 'identity_binding', 'read_in_source',
    'الردّ على دورة التمرير فعل صاحبه: لا يُكتب على صف غيره.',
    'Responding to a circulation round belongs to its own person: it is never written onto another row.',
    'الردّ لا يُنسب بالوكالة في هذا البناء.',
    'A response is not attributed by proxy in this build.'),
  E('admin_not_operational', 'boundary', 'authz-1.10.0', 'authorizeCommand', 'read', 'seated_actor', 'observed_live',
    'إدارة المنصة لا تحمل سلطة تشغيلية: تُقرأ الأسطح ولا تُمارس أفعال المقاعد.',
    'Platform administration carries no operational authority: it may read surfaces and never performs a seat\'s acts.',
    'الإدارة ليست مقعدًا، ولا تستعير صفته.',
    'Administration is not a seat and never borrows its capacity.'),
  E('target_not_found', 'boundary', 'authz-1.10.0', 'authorizeCommand', 'act', 'seated_actor', 'observed_live',
    'السجل المستهدف غير موجود أو غير مقروء: الرفض يسبق أي قراءة أو كتابة.',
    'The target record does not exist or is not readable: the refusal precedes any read or write.',
    'غياب الهدف ليس إذنًا بالمرور.',
    'A missing target is not a permission to proceed.'),
  E('showcase_scope', 'boundary', 'showcase-isolation-1.0.0', 'governedReadPolicy', 'read', 'identity_binding', 'observed_live',
    'قراءة من نطاق عرض استكشافي حيث لا يملك المُنادي مقعدًا: تُرفض وتُسمّى.',
    'A read inside an exploration scope where the caller holds no seat: refused and named.',
    'العرض لا يمنح قراءة مؤسسية.',
    'A demonstration grants no institutional read.'),
  E('access_denied', 'boundary', 'ameen-context-1.0.0', 'ResolveAmeenContext', 'read', 'seated_actor', 'observed_live',
    'سياق «أمين» لا يقوم لطالب لا صفة له في هذا النطاق.',
    'The AMEEN context does not stand for a caller with no capacity in this scope.',
    'السياق لا يُمنح بالتخمين، والجهل يمنع.',
    'A context is not granted by guessing, and ignorance refuses.'),
  E('no_seat', 'boundary', 'personal-work-1.0.0', 'GetMyWork', 'affected_only', 'seated_actor', 'observed_live',
    'لا مقعد للمُنادي: صف العمل فارغ **مُعلن** لا صفر مفترض.',
    'The caller holds no seat: the work row is a DECLARED empty, never an assumed zero.',
    'الفراغ يُقال بلفظه، ولا يُفسَّر عملًا غير مطلوب.',
    'An empty is stated in words, and never read as "no work required".'),
  E('token_unknown', 'boundary', 'guest-access-1.0.0 · execution-extract-1.0.0', 'GetGuestItemView · GetActionExtractView', 'read', 'identity_binding', 'observed_live',
    'رمز غير معروف أو منتهٍ أو مُلغى: الرابط هو القدرة الوحيدة، ولا تُوسَّع.',
    'An unknown, expired or revoked token: the link is the only capability and it is never widened.',
    'الرمز لا يُخمَّن، والرابط لا يُنشئ هوية.',
    'A token is not guessed, and a link never creates an identity.'),
  E('scope_unsupported', 'boundary', 'guest-access-1.0.0', 'InviteAgendaItemGuest', 'act', 'owner_decision', 'read_in_source',
    'نطاق غير مدعوم للضيف: البند الواحد هو الحدّ.',
    'An unsupported guest scope: one agenda item is the boundary.',
    'التوسيع ليس خدمة، ولا يُمنح «المادة كاملة» بدل بند.',
    'Widening is not a courtesy, and "the whole material" is never given instead of one item.'),
  E('hard_denied_attachment', 'refusal', 'guest-access-1.0.0', 'InviteAgendaItemGuest', 'act', 'owner_decision', 'read_in_source',
    'مرفق مرفوض بنيويًا للضيف (المحضر أو مادة مقيَّدة) حتى إن أُدرج.',
    'An attachment structurally refused to a guest (minutes, restricted material) even when listed.',
    'الإدراج ليس تفويضًا، والخصوصية ليست خانة.',
    'Being listed is not an authorization, and privacy is not a checkbox.'),
  // ── القنوات ─────────────────────────────────────────────────────────────────────────────────────
  E('channel_unavailable', 'degraded', 'integration-fabric-1.0.0', 'integrationGateway', 'affected_only', 'external_read', 'read_in_source',
    'مزوّد خارجي غير موصول: الحوكمة تعمل، وتُعلن الحالة صراحةً ولا يُدَّعى إرسال.',
    'An external provider is not connected: governance runs, the state is declared, and no send is claimed.',
    'لم يُرسل ليس أُرسل، والحالة تُقرأ لا تُفترض.',
    'Not sent is not sent, and a state is read rather than assumed.'),
  E('file_delivery_blocked', 'degraded', 'guest-access-1.0.0', 'GetGuestItemView', 'affected_only', 'owner_decision', 'read_in_source',
    'تسليم بايتات الملفات لغير المُصادَقين غير معتمد: يُعلن مغلقًا ولا يُحاكى.',
    'Delivering file bytes to unauthenticated parties is not authorized: it is declared blocked and never simulated.',
    'الفهرس ليس الملف، والإعلان ليس تنزيلًا.',
    'An index is not a file, and a declaration is not a download.'),
  // ── سلاسل التدقيق (رموز مُشتقّة من عقدها، لا مقتبسة) ─────────────────────────────────────────────
  E('chain_unknown', 'refusal', 'audit-chain-1.0.0', 'buildChain', 'read', 'identity_binding', 'read_in_source',
    'سلسلة أثر غير معرّفة في العقد: لا يُبنى أثر على سلسلة غير معلنة.',
    'An audit chain not declared in the contract: no trail is built on an undeclared chain.',
    'السلسلة لا تُخترع في الواجهة.',
    'A chain is not invented on the surface.'),
  E('subject_required', 'refusal', 'audit-chain-1.0.0', 'buildChain', 'read', 'identity_binding', 'read_in_source',
    'لم يُسمَّ السجل الذي يُبنى أثره: لا أثر بلا موضوع.',
    'The record whose trail is built was not named: there is no trail without a subject.',
    'الأثر لا يُبنى على «كل السجلات».',
    'A trail is never built over "all records".'),
  E('subject_type_mismatch', 'refusal', 'audit-chain-1.0.0', 'buildChain', 'read', 'identity_binding', 'read_in_source',
    'نوع السجل لا يوافق السلسلة المطلوبة: لا يُفرض أثر سلسلة على نوع آخر.',
    'The record type does not match the requested chain: a chain is never forced onto another record type.',
    'التوافق لا يُفترض لأن العناوين متشابهة.',
    'A match is not assumed because the names look alike.'),
  E('trail_unreadable', 'integrity', 'audit-chain-1.0.0', 'buildChain', 'read', 'external_read', 'read_in_source',
    'أثر السجل غير مقروء: يُعلن **غير متحقق** ولا يُقرأ فارغًا، ولا يُستنتج منه أن شيئًا لم يقع.',
    'The record\'s trail could not be read: it is declared UNVERIFIED and never read as empty, and nothing is inferred from it about what did not happen.',
    'غياب الحدث في أثر غير مقروء ليس دليلًا على عدم وقوعه.',
    'An event absent from an unreadable trail is not proof it did not occur.'),
  // ── المؤشرات (رموز مُشتقّة من عقدها) ────────────────────────────────────────────────────────────
  E('unknown_metric', 'refusal', 'metric-definitions-1.0.0', 'assessMetric', 'read', 'identity_binding', 'read_in_source',
    'مؤشر غير معرّف في العقد: لا يُعرض رقم بلا تعريف.',
    'A metric not defined in the contract: no figure is shown without its definition.',
    'الرقم لا يُخترع في الواجهة، والتعريف يسبق القيمة.',
    'A figure is never invented on the surface, and the definition precedes the value.'),
  E('invalid_counts', 'refusal', 'metric-definitions-1.0.0', 'assessMetric', 'act', 'external_read', 'read_in_source',
    'بسط أو مقام غير صحيح (غير صحيح · سالب · غير رقمي): لا تُعرض نسبة على أساس فاسد.',
    'An invalid numerator or denominator (non-integer, negative, non-numeric): no rate is shown on a corrupt basis.',
    'الأساس الفاسد لا يُقرَّب ولا يُعرض مع تحذير.',
    'A corrupt basis is never rounded off or shown with a caveat.'),
  E('numerator_exceeds_denominator', 'refusal', 'metric-definitions-1.0.0', 'assessMetric', 'act', 'external_read', 'read_in_source',
    'البسط أكبر من المقام: فحص ذاتي يعلو صوته بدل أن يرسم رقمًا مستحيلًا.',
    'The numerator exceeds the denominator: a self-check that fails LOUDLY rather than rendering an impossible figure.',
    'الرقم المستحيل لا يُعرض بصمت.',
    'An impossible figure is never shown silently.'),
  E('small_basis', 'boundary', 'metric-definitions-1.0.0', 'assessMetric', 'affected_only', 'owner_decision', 'read_in_source',
    'الأساس أدنى من حد الإفصاح: تُحجب النسبة ويُسمّى الحدّ.',
    'The basis is below the disclosure floor: the rate is withheld and the floor is named.',
    'الحجب ليس صفرًا، والحدّ يُسمّى ولا يُخفى.',
    'A withhold is not a zero, and the floor is named rather than hidden.'),
  E('small_numerator', 'boundary', 'metric-definitions-1.0.0', 'assessMetric', 'affected_only', 'owner_decision', 'read_in_source',
    'عدد الحالات أدنى من حد الإفصاح: يُحجب الرقم الصغير الذي يمكن نسبته إلى أشخاص.',
    'The count is below the disclosure floor: a small figure attributable to individuals is withheld.',
    'الرقم الصغير قد يكشف شخصًا، والحجب حماية لا نقص.',
    'A small figure may identify a person, and withholding is protection, not a shortfall.'),
  E('unread', 'integrity', 'metric-definitions-1.0.0', 'assessMetric', 'affected_only', 'external_read', 'read_in_source',
    'تعذّرت قراءة مصدر الرقم: يُعلن **غير متحقق** ولا يُعرض صفر مكانه.',
    'The metric\'s source could not be read: it is declared UNVERIFIED and no zero is shown in its place.',
    'الصفر الكاذب أسوأ من رقم غائب.',
    'A false zero is worse than an absent figure.'),
  E('no_records', 'boundary', 'metric-definitions-1.0.0', 'assessMetric', 'affected_only', 'external_read', 'read_in_source',
    'لا سجل في الفترة: تُقرأ «لا سجل» ولا تُقرأ نسبة صفرية.',
    'No records in the period: it reads "no records" and never a zero rate.',
    'الغياب ليس صفرًا، والفراغ يُقال بلفظه.',
    'An absence is not a zero, and an empty is stated in words.'),
  // ── القيام والحالة (الرموز التي يجيب بها حارس «أمين» نفسه) ──────────────────────────────────────
  E('standing_unknown', 'refusal', 'ameen-retrieval-guard-1.0.0', 'assessSeatStanding', 'read', 'external_read', 'observed_live',
    'حال المقعد غير معروفة (قراءة فاشلة أو سجل تعيينات غير مقروء): يُرفض الوصول، لأن الجهل لا يُفسَّر قيامًا.',
    'The seat\'s state is unknown (a failed read, or an unreadable appointment history): access is refused, because ignorance is never read as standing.',
    'الجهل يمنع ولا يقوم مقام القيام.',
    'Ignorance refuses and never stands in for standing.'),
  E('seat_ended', 'refusal', 'membership-effect-1.0.0', 'standingAt · assessSeatStanding', 'act', 'seated_actor', 'read_in_source',
    'انتهت مدة المقعد أو انقضى تكليفه المؤقت في اللحظة: يتوقف كل فعل على المقعد.',
    'The seat\'s term ended, or its bounded appointment expired, at the instant: every act on that seat stops.',
    'حالة السجل «نشط» ليست قيامًا، والواقعة الزمنية تحكم.',
    'A record state of "active" is not standing; the instant governs.'),
  E('seat_not_yet_started', 'refusal', 'membership-effect-1.0.0', 'standingAt · assessSeatStanding', 'act', 'seated_actor', 'read_in_source',
    'التعيين لم يبدأ نفاذه بعد: لا فعل قبل لحظة النفاذ — والحدّ يعمل في الاتجاهين.',
    'The appointment\'s effective instant has not arrived: no act precedes it — the bound works in both directions.',
    'التوقيع بأثر رجعي ليس حقًا، والنفاذ لحظة لا نيّة.',
    'A signature is never back-dated, and effect is an instant, not an intention.'),
  // ── جلسة العرض (سحب · انتهاء · عدم صلاحية · نطاق مغلق) ──────────────────────────────────────────
  E('session_invalid', 'boundary', 'ameen-retrieval-guard-1.0.0', 'assessShowcaseSession', 'read', 'identity_binding', 'read_in_source',
    'جلسة عرض غير صالحة (غير قابلة للتحقق أو غير مطابقة للنطاق): تُرفض القراءة قبل أي سجل.',
    'A showcase session that is not valid (unverifiable, or not matching the scope): the read is refused before any record.',
    'الجلسة لا تُفترض صالحة، وعدم التحقق ليس تحققًا.',
    'A session is not assumed valid, and failing to verify is not verifying.'),
  E('session_expired', 'boundary', 'ameen-retrieval-guard-1.0.0', 'assessShowcaseSession', 'read', 'identity_binding', 'read_in_source',
    'جلسة عرض انقضى وقتها: تنتهي سلطة القراءة بانتهائها، وتُسمّى الحالة.',
    'A showcase session whose time has run out: the authority to read ends with it, and the state is named.',
    'الانتهاء بالوقت لا يُمدّد صامتًا.',
    'A time-bound end is never extended silently.'),
  E('session_revoked', 'boundary', 'ameen-retrieval-guard-1.0.0', 'assessShowcaseSession', 'read', 'identity_binding', 'read_in_source',
    'جلسة عرض مسحوبة: يسقط الوصول فورًا، ولا يعتمد على بقاء متصفح مفتوحًا.',
    'A withdrawn showcase session: access falls immediately and never depends on a browser still being open.',
    'السحب يقع على الخادم، والوصول المفتوح ليس سلطة.',
    'A withdrawal happens server-side, and an open browser is not authority.'),
  E('scope_closed', 'boundary', 'ameen-retrieval-guard-1.0.0', 'assessScopeInForce', 'read', 'owner_decision', 'read_in_source',
    'اللجنة مغلقة أو مؤرشفة: النطاق ليس ساريًا، فلا تُقرأ بياناته ولا تُحتسب في أي مجموع.',
    'The committee is closed or archived: the scope is not in force, so its data is not read and never counted into a total.',
    'النطاق المنتهي ليس نطاقًا فارغًا، ولا يُستنتج من سجل قديم أنه ما زال قائمًا.',
    'A closed scope is not an empty one, and an old record never implies it still stands.'),
  // ── رمز واحد يخدم رابطين: يُعلن في سجلين، فلا يُفترض أن الرمز يعني سياقًا واحدًا ───────────────
  E('token_unknown', 'boundary', 'guest-access-1.0.0', 'GetGuestItemView', 'read', 'identity_binding', 'observed_live',
    'رمز دعوة ضيف غير معروف أو منتهٍ أو مُلغى: الرابط هو القدرة الوحيدة، ولا تُوسَّع.',
    'A guest invite token unknown, expired or revoked: the link is the only capability and it is never widened.',
    'الرمز لا يُخمَّن، والرابط لا يُنشئ هوية.',
    'A token is not guessed, and a link never creates an identity.'),
  E('token_unknown', 'boundary', 'execution-extract-1.0.0', 'GetActionExtractView', 'read', 'identity_binding', 'observed_live',
    'رمز مستخلص تنفيذ غير معروف أو منتهٍ أو مُلغى: نطاق التزام واحد لا أكثر.',
    'An execution-extract token unknown, expired or revoked: one obligation\'s scope and no more.',
    'الرابط لا يمنح قراءة أوسع من التزامه، والإقرار ليس اعتمادًا.',
    'The link grants nothing wider than its obligation, and an acknowledgement is not an approval.'),
] as any[];

/** The sources this register DERIVES from at runtime instead of restating — each one is compared, not copied. */
export const DERIVED_SOURCES = [
  { module: 'ameenRetrievalGuard.ts', version: AMEEN_RETRIEVAL_GUARD_VERSION, map: 'RETRIEVAL_REFUSALS', codes: Object.keys(RETRIEVAL_REFUSALS || {}) },
  { module: 'auditChain.ts', version: AUDIT_CHAIN_VERSION, map: 'AUDIT_CHAIN_REFUSALS', codes: Object.keys(AUDIT_CHAIN_REFUSALS || {}) },
  { module: 'metricDefinitions.ts', version: METRIC_DEFINITIONS_VERSION, map: 'METRIC_EXCEPTION_CODES', codes: METRIC_EXCEPTION_CODES || [] },
];

/** What this register does NOT cover, named so the register never implies a completeness it lacks. */
export const DECLARED_GAPS = [
  {
    ar: 'استيراد السجلات صفًّا صفًّا (كشف أعضاء أو قوائم) غير موجود كمسار في هذا البناء: الاستيراد القائم يقبل ملفات هوية ببصمة (تُقبل أو تُرفض بالبايت) واستخراج الأدوات بمراجعة بشرية حقولًا. فحجر الالتباس مُصمَّم ومُعلن هنا، ولم يُنشأ مسار كتابة يستدعيه — لأن إنشاء مسار استيراد لم تقرّره المؤسسة اختراع لا استكمال.',
    en: 'Row-by-row record import (a roster or list) does not exist as a path in this build: the existing intake accepts identity files by fingerprint (accepted or refused on the bytes), and instruments by extraction with human confirmation. Ambiguity quarantine is designed and declared here, and no write path was invented to call it — building an import path the institution never decided would be invention, not completion.',
  },
  {
    ar: 'الرموز التي تُبنى داخل حارس أو حكم نصًّا حرًّا (بلا خريطة مُصدَّرة) تُدرج عند ربطها؛ والسجل يعلن ثلاثة مصادر مُشتقّة مقارَنة، ولا يدّعي غيرها.',
    en: 'Codes built inline inside a guard or a verdict with no exported map are transcribed when they are wired; the register declares three DERIVED, compared sources and claims no others.',
  },
];

/** A lookup that never invents: an unknown code returns null and says it is unknown. */
export function findException(code: string) {
  const hits = EXCEPTIONS.filter((e) => e.code === code);
  if (!hits.length) return null;
  return hits;
}

export function catalogueSummary() {
  const byClass: Record<string, number> = {};
  const byBasis: Record<string, number> = {};
  for (const e of EXCEPTIONS) {
    byClass[e.class] = (byClass[e.class] || 0) + 1;
    byBasis[e.basis] = (byBasis[e.basis] || 0) + 1;
  }
  return { total: EXCEPTIONS.length, by_class: byClass, by_basis: byBasis, contracts: [...new Set(EXCEPTIONS.map((e) => e.contract))].length };
}

/**
 * The register's own check. It refuses: a duplicate, an undeclared class or resolution, a missing
 * sentence or a missing "never assume", a stop that silently proceeds, an entry that resolves itself,
 * and a DERIVED source that yielded nothing (an unread source is not a covered one).
 */
export function auditCatalogue() {
  const findings: any[] = [];
  const seen = new Set<string>();
  for (const e of EXCEPTIONS) {
    const key = `${e.code}@${e.contract}`;
    if (seen.has(key)) findings.push({ code: 'duplicate_entry', entry: key });
    seen.add(key);
    if (!EXCEPTION_CLASSES[e.class]) findings.push({ code: 'class_undeclared', entry: e.code, value: e.class });
    if (!EXCEPTION_RESOLUTIONS[e.resolution]) findings.push({ code: 'resolution_undeclared', entry: e.code, value: e.resolution });
    if (!['act', 'affected_only', 'read'].includes(e.stops)) findings.push({ code: 'stop_semantics_missing', entry: e.code, value: e.stops });
    if (!['observed_live', 'read_in_source'].includes(e.basis)) findings.push({ code: 'basis_missing', entry: e.code, value: e.basis });
    if (!e.ar || !e.en) findings.push({ code: 'sentence_missing', entry: e.code });
    if (!e.never_assume_ar || !e.never_assume_en) findings.push({ code: 'never_assume_missing', entry: e.code });
    if (!e.contract || !e.emitted_by) findings.push({ code: 'source_unnamed', entry: e.code });
    if (e.resolution === 'self') findings.push({ code: 'exception_resolves_itself', entry: e.code });
  }
  const derived = DERIVED_SOURCES.map((s) => ({
    module: s.module, version: s.version, codes_read: (s.codes || []).length,
    // A source that yielded nothing is reported as UNREAD, never as complete.
    unreadable: (s.codes || []).length === 0,
  }));
  const derivedCodes = DERIVED_SOURCES.flatMap((s) => s.codes || []);
  const missingFromCatalogue = derivedCodes.filter((c) => !EXCEPTIONS.some((e) => e.code === c));
  if (missingFromCatalogue.length) findings.push({ code: 'derived_code_absent', codes: missingFromCatalogue });
  if (derived.some((d) => d.unreadable)) findings.push({ code: 'derived_source_unreadable', sources: derived.filter((d) => d.unreadable).map((d) => d.module) });
  const blocking = findings.filter((f) => f.code !== 'derived_code_absent' || true).length;
  return {
    contract_version: EXCEPTION_CATALOGUE_VERSION,
    ok: findings.length === 0,
    blocking,
    findings,
    summary: catalogueSummary(),
    derived,
    derived_missing_from_catalogue: missingFromCatalogue,
    shared_codes: [...new Set(EXCEPTIONS.map((e) => e.code))].filter((c) => EXCEPTIONS.filter((e) => e.code === c).length > 1),
    declared_gaps: DECLARED_GAPS,
    note_ar: 'سجل الاستثناءات يُعلن ولا يُقرِّر: لا يحلّ استثناءً، ولا يوقف فعلًا بنفسه — الوقاية في الأوامر، والسجل يجيب «ما الذي مُنع ولماذا ومَن يحلّه».',
    note_en: 'The catalogue declares and never decides: it resolves no exception and stops no act by itself — prevention lives in the commands, and the register answers what was refused, why, and who resolves it.',
  };
}