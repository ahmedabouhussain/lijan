# تقرير إحكام السلطة (P0) — LIJAN™

**الكتابة التجريبية متوقفة. `write_scope` لم يُفتح. لا نشر. لا إشعارات حقيقية. لا تعديل سجلات مؤسسية حقيقية.**

## 0. الحالة المعتمدة الآن

| المحور | الحالة |
|---|---|
| Authorization Architecture | **FAIL** |
| Backend Enforcement | **PARTIAL** |
| Client-Supplied Scope Rejection | **PASS — LIMITED TESTED SCOPE** |
| Delegation Enforcement | **PARTIAL** |
| Recusal Identity Safety | **PARTIAL** |
| Decision Rights Separation | **PARTIAL** |
| Command Migration Coverage | **PARTIAL — 1/50 sites migrated, 50/50 inherit the unified policy** |
| Register Surface Coverage | **NOT ESTABLISHED — no ratio until the atomic inventory is closed** |
| Showcase Write Eligibility | **BLOCKED** |
| Browser Acceptance | **NOT TESTED** |
| Published Acceptance | **NOT TESTED** |

لا يُرفع أي تصنيف من `FAIL` حتى إغلاق الشروط العشرة في §6.

---

## 1. ما نُفِّذ في هذه الجولة (كود، في المعاينة فقط)

| # | التغيير | الأثر |
|---|---|---|
| 1 | **مصدر قرار واحد**: `authorityKernel.ts` أُعيد بناؤه حول مُقيِّم نقي واحد `evaluateActionPolicy` + جدول واحد `capabilitiesForRole`، بإصدار سياسة `authz-1.0.0` يسافر مع كل قرار | ينهي تعارض «مسار العرض vs مسار الأوامر» |
| 2 | **نائب الرئيس لا يرث الرئيس**: خط أساسه 11 صلاحية (مقابل 30 للرئيس)، ويصل إلى 21 فقط عند تفويض فعّال، والتفويض القابل للنقل محصور في `DELEGABLE_CAPABILITIES` (لا يشمل إغلاق اللجنة) | إغلاق F-2/F-3 |
| 3 | **إعادة تقييم السلطة عند كل تنفيذ**: التفويض والتنحّي والمنحة والعضوية تُقرأ من جديد في كل نداء — لا تُعتمد حالة واجهة مخزّنة | إغلاق اختبار «تفويض انتهى أثناء جلسة مفتوحة» |
| 4 | **تجاهل نطاق العميل**: النطاق يُشتق `record → committee → organization`؛ وأي `committee_id` مرسل يخالف نطاق السجل **يُرفض** (`scope_mismatch`) مع حدث تدقيق `authority.scope_mismatch`. `organization_id` مُهمَل كمصدر سلطة | إغلاق البند 2 |
| 5 | **`is_admin` ليست سلطة أعمال**: المسؤول يحصل على سقف قراءة فقط (`read/audit.read/report.export/decision.view`) ويُرفض له أي فعل تشغيلي (`admin_not_operational`) | إغلاق «اعتبار is_admin سلطة أعمال» |
| 6 | **فصل أفعال القرار**: `decision.sign` أُزيل من خط الأساس؛ الأعضاء: view/comment/propose/vote/acknowledge فقط. `decision.approve` ≠ `decision.issue` ≠ `decision.vote`. و`decision.digital_sign` **غير ممنوح لأحد** حتى سياسة معتمدة (هوية + خدمة ثقة + عقد قانوني) | إغلاق F-4 |
| 7 | **التنحّي بالمعرّفات**: المطابقة بـ `user_id/member_user_id/person_id/membership_id/committee_membership_id`؛ مطابقة الاسم القديمة **لا تمنح أبدًا** ويمكنها المنع فقط، وتُوسم `recusal_legacy_name_match` في القرار | جزئي — إغلاق F-5 يحتاج ترحيل البيانات |
| 8 | **عقد `AuthorityGrant` موحّد**: الدور = قالب/سقف، المنحة = إضافة أو تقييد صريح، المنع يتغلب على السماح، ولا منحة تتجاوز السقف المؤسسي، والمنحة خارج صلاحيتها أو المتعارضة تُلغي المقعد | إغلاق البند 6 |
| 9 | **حارس واحد قابل للنداء**: `AuthorizeCommitteeAction` — يجيب بسؤال واحد وقرار واحد، ويشتق النطاق من السجل المستهدف | أساس البند 1 |
| 10 | **مزامنة مساري العرض والأوامر**: `evaluateCommitteeAuthority` (العرض) تُشتق الآن من نفس جدول الصلاحيات | مصدر واحد فعليًا |
| 11 | **أول موضع أوامر مُرحَّل**: `SignRecord` يشتق اللجنة من السجل المستهدف (Document/Decision/MeetingMinutes/Action) ويرفض ما لا يمكن اشتقاقه، وقابليته الآن `decision.sign_image`، وأُزيل فحص التنحّي الاسمي منه | نموذج المُرحَّل للباقي |
| 12 | **اختبار حدود سالب على الخادم**: `TestAuthorizationGuard` — 30 حالة، **30/30 ناجحة** على المنطق النقي (بلا كتابة أي بيانات) | الشاهد الأساسي |
| 13 | **فحص ثابت**: `scripts/authority-guardrails.mjs` يمنع عودة 4 أنماط (سلطة من العميل · `organization_id` في الحارس · مطابقة الهوية بالاسم · **السماح عند فشل الحل**) | وقاية |

### نتائج الاختبار السالب (مختارة من 30)

| Test ID | العملية | الدور | التفويض | المتوقع | الفعلي | الحالة |
|---|---|---|---|---|---|---|
| AUTH-003/004/005/006 | بدء اجتماع · إصدار قرار · اعتماد محضر · توقيع | member | لا | رفض | رفض | PASS |
| AUTH-010/011/012 | اعتماد محضر · إصدار قرار · تصويت | secretary | لا | رفض | رفض | PASS |
| AUTH-013/014/015 | بدء اجتماع · إصدار · اعتماد | vice_chair | **لا** | رفض | رفض | PASS |
| AUTH-017/018 | بدء اجتماع · إصدار قرار | vice_chair | **نعم** | سماح داخل التفويض | سماح | PASS |
| AUTH-019 | إغلاق اللجنة | vice_chair | نعم | رفض (خارج التفويض) | رفض | PASS |
| AUTH-021 | توقيع رقمي | chair | لا | رفض (لا سياسة معتمدة) | رفض | PASS |
| AUTH-022/023/024 | إصدار قرار مع منحة مانعة / خارج الصلاحية / متعارضة | chair | لا | رفض | رفض | PASS |
| AUTH-025/026 | تصويت + تنحّي (معرّف / اسم قديم) | chair/member | لا | رفض | رفض | PASS |
| AUTH-028 | أي فعل بلا مقعد | — | لا | رفض (`no_seat`) | رفض | PASS |
| AUTH-029 | إصدار قرار كمسؤول منصة | chair | لا | رفض (`admin_not_operational`) | رفض | PASS |
| AUTH-030 | قراءة تدقيق كمسؤول | — | لا | سماح (سقف قراءة) | سماح | PASS |
| — | حارس بلا نطاق مرسل | — | — | رفض | `400 no_scope` | PASS |

هذا **اختبار منطق على الخادم**، وليس اختبار متصفح، ولا يشمل بعد التحقق من المسار الكامل عبر كل أمر.

---

## 2. عيوب P0 مفتوحة (مكتشفة بالفحص الثابت، لم تُصلح بعد)

| المعرّف | الموضع | العيب | الأثر |
|---|---|---|---|
| P0-1 | `GenerateProduct` | `.catch(() => ({ allowed: true, ... }))` — **السماح عند فشل حل السلطة** (fail-open) | أخطر نمط في المنصة: خطأ تقني يتحول إلى إذن |
| P0-2 | `UpdateActionProgress` · `CloseAction` · `RecordRecusal` · `DeclareConflict` · `RequestActionExtension` · `ReviewActionExtension` · `RespondToReview` · `RespondToInvitation` · `NotifyAffectedMembers` | **كتابة محكومة بصلاحية `read`** | الكتابة ليست محكومة بحق تشغيلي |
| P0-3 | 8 مواضع تقرأ/تكتب التنحّي بالاسم (`CastVote` · `CertifyAttendance` · `RespondToInvitation` · `DeclareConflict` · `RecordRecusal` · `AcknowledgeCommitteeChange` · `NotifyAffectedMembers` · `GetCommitteeMiniPortal`) | هوية بالاسم | انتحال/تفويض خاطئ |
| P0-4 | 49 موضع أوامر لم يُمرَّر لها السجل المستهدف | النطاق لا يُشتق بعد من السجل في كل موضع | بند 2 مُنفَّذ في الحارس، لكن المواضع لا تفعّله بعد |
| P0-5 | `ReviewRequest` | تكليف بدور بلا مستلم (`reviewer_user_id` فقط) | عقد التكليف غير مُصلح بعد |
| P0-6 | `AuthorityGrant.permitted_actions` | فارغ في السجلات السبعة | المنحة لا تضيّق ولا توسّع فعليًا (`grant_status: unpopulated_no_restriction`) |

---

## 3. جرد مواضع الأوامر (50 موضعًا)

كل موضع يستدعي `resolveAuthority` — أي أنه **يرث السياسة الموحّدة الجديدة كلها فورًا**. المتبقي لكل موضع ثلاث نقاط مراجعة: (أ) تمرير السجل المستهدف، (ب) صحة العملية المطلوبة، (ج) إزالة أي مطابقة بالاسم.

| # | الدالة | العملية | مراجعة مطلوبة | الحالة |
|---|---|---|---|---|
| 1 | ActivateAlternate | committee.manage | تمرير السجل | PENDING |
| 2 | ActivateCommittee | committee.activate | تمرير السجل | PENDING |
| 3 | AdjournMeeting | meeting.start | تمرير السجل | PENDING |
| 4 | ApproveCommitteeAmendment | committee.manage | تمرير السجل | PENDING |
| 5 | ApproveMinutes | minutes.approve | تمرير السجل | PENDING |
| 6 | CancelMeeting | meeting.schedule | تمرير السجل | PENDING |
| 7 | CastVote | vote.cast | تمرير السجل + إزالة الاسم (P0-3) | PENDING |
| 8 | CertifyAttendance | attendance.certify | إزالة الاسم (P0-3) | PENDING |
| 9 | CloseAction | action.admin | العملية (P0-2) + السجل | PENDING |
| 10 | CloseCommittee | committee.close | تمرير السجل | PENDING |
| 11 | CloseVote | vote.call | تمرير السجل | PENDING |
| 12 | CompileCommitteeMemory | committee.view → read | — | DONE (alias) |
| 13 | ConfirmExtractedInstrumentFields | committee.manage | تمرير السجل | PENDING |
| 14 | CreateCommitteeDraftFromInstrument | committee.manage | تمرير السجل | PENDING |
| 15 | CreateDecisionDraft | agenda.propose | تمرير السجل | PENDING |
| 16 | CreateMeeting | meeting.schedule | إنشاء: اللجنة هدف مشروع — يُوثَّق | PARTIAL |
| 17 | DeclareConflict | read → يجب `conflict.declare` | العملية (P0-2) + الاسم (P0-3) | PENDING |
| 18 | DelegateAuthority | committee.manage | تمرير السجل | PENDING |
| 19 | EndCommitteeMembership | committee.manage | تمرير السجل | PENDING |
| 20 | EvaluateAgendaReadiness | read (قراءة) | — | OK |
| 21 | ExtendTerm | committee.manage | تمرير السجل | PENDING |
| 22 | ExtractInstrumentData | read | — | OK |
| 23 | GenerateInstitutionalMemory | committee.close | العملية مشكوك فيها | PENDING |
| 24 | GenerateMeetingInstances | meeting.schedule | تمرير السجل | PENDING |
| 25 | GenerateProduct | committee.manage | **P0-1 fail-open** | BLOCKED |
| 26 | InviteCommitteeMember | committee.manage | تمرير السجل | PENDING |
| 27 | IssueDecision | decision.issue | تمرير السجل | PENDING |
| 28 | NotifyAffectedMembers | read → `notify.dispatch` | العملية (P0-2) + الاسم (P0-3) | PENDING |
| 29 | OpenVote | vote.call | تمرير السجل | PENDING |
| 30 | ProcessEscalation | action.admin | تمرير السجل | PENDING |
| 31 | ProposeCommitteeAmendment | committee.manage | تمرير السجل | PENDING |
| 32 | PublishMeetingPack | agenda.edit | تمرير السجل | PENDING |
| 33 | RecordRecusal | read → `recusal.record` | العملية (P0-2) + الاسم (P0-3) | PENDING |
| 34 | RenewCommittee | committee.manage | تمرير السجل | PENDING |
| 35 | RequestActionExtension | read → `action.request_extension` | العملية (P0-2) | PENDING |
| 36 | RequestReview | minutes.draft | تمرير السجل + عقد التكليف (P0-5) | PENDING |
| 37 | RespondToInvitation | read | تمرير السجل + الاسم | PENDING |
| 38 | RespondToReview | read → `review.comment` | العملية (P0-2) | PENDING |
| 39 | RetryEscalationNotice | action.admin | تمرير السجل | PENDING |
| 40 | ReviewActionExtension | action.admin | العملية (P0-2) | PENDING |
| 41 | ReviewMemoryRecord | (متغيّر) | تثبيت العملية | PENDING |
| 42 | SignRecord | decision.sign_image | **مُرحَّل** | DONE |
| 43 | StartMeeting | meeting.start | تمرير السجل | PENDING |
| 44 | SubmitAgendaItem | agenda.propose | تمرير السجل | PENDING |
| 45 | SuspendCommittee | committee.activate | تمرير السجل | PENDING |
| 46 | TransitionAmendmentStatus | committee.manage | تمرير السجل | PENDING |
| 47 | TransitionCommitteeStatus | committee.activate | تمرير السجل | PENDING |
| 48 | UpdateActionProgress | read → `action.update_progress` | العملية (P0-2) | PENDING |
| 49 | UploadDocumentVersion | agenda.edit | تمرير السجل | PENDING |
| 50 | UploadFoundingInstrument | committee.manage | تمرير السجل | PENDING |

### دفعات التنفيذ (بعد مراجعة معنى كل عملية)

| الدفعة | العائلة | المواضع |
|---|---|---|
| B1 | الاجتماعات والمحاضر | Adjourn · Cancel · Start · CreateMeeting · GenerateMeetingInstances · ApproveMinutes · CertifyAttendance · PublishMeetingPack |
| B2 | القرارات والتصويت | IssueDecision · CreateDecisionDraft · OpenVote · CloseVote · CastVote · SignRecord (تم) · GenerateProduct (إصلاح fail-open) |
| B3 | التنحّي والتفويض والنزاهة | RecordRecusal · DeclareConflict · DelegateAuthority · ActivateAlternate · ReviewMemoryRecord |
| B4 | الإجراءات والتصعيد | CloseAction · UpdateActionProgress · RequestActionExtension · ReviewActionExtension · ProcessEscalation · RetryEscalationNotice |
| B5 | المراجعة والوثائق | RequestReview · RespondToReview · UploadDocumentVersion · UploadFoundingInstrument · ExtractInstrumentData |
| B6 | حياة اللجنة والعضوية والإشعارات | Activate · Suspend · Close · Renew · Transition · EndCommitteeMembership · InviteCommitteeMember · ExtendTerm · NotifyAffectedMembers · RespondToInvitation · EvaluateAgendaReadiness |

---

## 4. اختبارات الأدوار الخمسة (مصفوفة الأدلة)

| Test ID | العملية | اللجنة | الدور | التفويض | المدخل المزوّر | المتوقع | الفعلي | أثر البيانات | التدقيق | الحالة |
|---|---|---|---|---|---|---|---|---|---|---|
| AUTH-M-NAT-01 | قراءة السجل | الوطنية | member | لا | — | سماح | سماح (منطق) | لا قراءة نفذت بعد من المتصفح | — | PENDING (browser) |
| AUTH-M-NAT-02 | بدء اجتماع | الوطنية | member | لا | `committee_id` آخر | رفض | رفض | لا كتابة | — | PASS (evaluator) |
| AUTH-M-NAT-03 | إصدار قرار | الوطنية | member | لا | `role: chair` | رفض | رفض | لا كتابة | — | PASS (evaluator) |
| AUTH-M-NAT-04 | اعتماد محضر | الوطنية | member | لا | `is_admin: true` | رفض | رفض | لا كتابة | — | PASS (evaluator) |
| AUTH-S-INN-01 | تحرير جدول الأعمال + مسودة محضر | الابتكار | secretary | لا | — | سماح | سماح | لا كتابة | — | PASS (evaluator) |
| AUTH-S-INN-02 | إصدار/اعتماد قرار | الابتكار | secretary | لا | `role: chair` | رفض | رفض | لا كتابة | — | PASS (evaluator) |
| AUTH-V-FIN-01 | بدء اجتماع/اعتماد | التمويل | vice_chair | **لا** | — | رفض | رفض | لا كتابة | — | PASS (evaluator) |
| AUTH-V-FIN-02 | بدء اجتماع | التمويل | vice_chair | نعم (فعّال) | — | سماح | سماح | لا كتابة | — | PASS (evaluator) |
| AUTH-V-FIN-03 | إغلاق اللجنة | التمويل | vice_chair | نعم | — | رفض | رفض | لا كتابة | — | PASS (evaluator) |
| AUTH-C-DIG-01 | وظائف الرئيس | التحول الرقمي | chair | لا | — | سماح وفق الحالة | سماح | لا كتابة | — | PASS (evaluator) |
| AUTH-C-DIG-02 | وظائف الرئيس بعد انتهاء العضوية | التحول الرقمي | chair | لا | تواريخ منتهية | رفض | رفض (`no_seat`) | لا كتابة | — | PASS (evaluator) |
| AUTH-SCP-01 | تبديل اللجنة في الحمولة | أي لجنة | أي | — | `committee_id` مخالف للسجل | رفض + تدقيق | رفض `scope_mismatch` | لا كتابة | `authority.scope_mismatch` | PASS (logic) |
| AUTH-REC-01 | تصويت أثناء تنحّي | أي لجنة | member | لا | تنحّي بمعرّف | رفض | رفض | لا كتابة | — | PASS (evaluator) |
| AUTH-REC-02 | تصويت + تنحّي باسم قديم | أي لجنة | member | لا | تنحّي بالاسم | رفض + وسم | رفض + وسم | لا كتابة | — | PASS (evaluator) |
| AUTH-DBL-01 | نقر مزدوج | — | — | — | — | كتابة واحدة | لم يُختبر | — | — | PENDING |

**ما لم يُختبر بعد:** الاستدعاء المباشر من المتصفح لكل اختبار، التزامن، تحديث الصفحة، وسجل التدقيق الفعلي لكل انتقال.

---

## 5. الجرد الذري لأسطح السجلات

**لا نسبة تغطية.** المقام الحقيقي يبقى مفتوحًا حتى يُثبَّت كل مسار قراءة على حدة — انظر مستند جرد الأسطح.

## 6. شروط إعادة فتح الكتابة التجريبية (`showcase_only`)

| # | الشرط | الحالة |
|---|---|---|
| 1 | توحيد حارس السلطة | **مُحقَّق هيكليًا** (`authz-1.0.0`) — ينتظر الترحيل |
| 2 | إزالة وراثة نائب الرئيس غير المشروطة | **مُحقَّق** (11 مقابل 30، والتفويض محصور) |
| 3 | فصل أفعال القرار والتوقيع | **مُحقَّق للمنطق** — ينتظر إصلاح 8 مواضع اسمية و9 مواضع كتابة بقراءة |
| 4 | تجاهل نطاق العميل | **مُحقَّق في الحارس** — ينتظر تمرير السجل في 49 موضعًا |
| 5 | التنحّي بمعرّفات ثابتة | **جزئي** — الحارس آمن (منع فقط بالاسم) والبيانات تحتاج ترحيلًا |
| 6 | ربط عائلات الأوامر بالحارس | PENDING (B1–B6) |
| 7 | نجاح اختبارات الأدوار الخمسة | منطق السلطة PASS · **متصفح PENDING** |
| 8 | إغلاق مسارات القراءة غير المحكومة | PENDING (4+ أسطح) |
| 9 | إثبات عدم وجود كتابة على سجل حقيقي | PENDING |
| 10 | تجميد مرشح أمني وإعادة الاختبار | PENDING |

**الكتابة التجريبية تبقى `BLOCKED` حتى تُغلق العشرة.**