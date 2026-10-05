# سجل الأدلة | EVIDENCE LEDGER

**البناء المُختبَر**: معاينة الإنتاج `https://lijan.base44.app`، ملفات العمل بتاريخ **2026-10-05** (بعد الدفعة الخامسة) · بصمة البناء: `npx vite build` → `status=0` مع إخراج `dist/` كامل، وأُعيد بعد كل تغيير.
**الشخصية**: مُشغِّل الاختبار الإداري · **النطاق**: لا كتابة على بيانات العمل — الاختبارات المنطقية `writes_performed: 0`، والاستدعاءات الحيّة تُرفض في الحارس **قبل** أي كتابة.

## 1. اختبارات نُفِّذت (نتائج فعلية)

| معرّف الدليل | الحالة | ما نُفِّذ | النتيجة |
|---|---|---|---|
| **E-D002-INV-001** | **PASS** | جرد تنفيذي لكل كتابة محكومة صادرة من الواجهة (`grep` على `src/`) | 34 موضعًا مصنّفة: المحاضر والاجتماعات والأجندة أُغلقت؛ المتبقي المستندات · إعدادات اللجنة · مركز التقارير |
| **E-A12-REG-002** | **PASS** | `CertifyAttendance` باجتماع غير موجود | `404 target_not_found` — قدرة `attendance.certify` معتمدة، والحارس يسبق أي كتابة حضور |
| **E-A12-REG-003** | **PASS** | `SignRecord` بسجل مستهدف غير موجود | `403 scope_unresolvable` |
| **E-A12-REG-004** | **PASS** | `ApproveMinutes` بمحضر غير موجود | `404 target_not_found` |
| **E-A12-REG-005** | **PASS** | `SubmitAgendaItem` باجتماع غير موجود | `404 target_not_found` — البند يُقدَّم بأمر محكوم لا بكتابة متصفح |
| **E-A12-REG-006** | **PASS** | `EvaluateAgendaReadiness` ببند غير موجود | `404 target_not_found` — الجاهزية تُحسب بأمر محكوم |
| **E-BUILD-005** | **PASS** | بناء + تحقق ساكن بعد تحصين الاجتماع والأجندة | `status=0` · صفر كتابة محكومة في `MeetingDetail` · `AgendaManager` لا يكتب إلا الحذف الإداري (D-024) · أوامر محكومة مستخدمة: `StartMeeting` · `AdjournMeeting` · `CancelMeeting` · `GenerateMeetingInstances` · `CreateDecisionDraft` · `SubmitAgendaItem` · `EvaluateAgendaReadiness` |
| **E-A07-DI-001…020** | **PASS** | `TestDecisionIntegrity` | **20/20** · `writes_performed: 0` — منها DI-019: صوت من مقعد عُيّن بعد تجميد الدورة لا يُحتسب فيها |
| **E-A06-EL-001…011** | **PASS** | `TestVoteEligibility` | **12/12** · `failures: []` — منها EL-011: كل مقعد مستبعد مسمّى بسببه |
| **E-A06-FREEZE-001** | **PASS (خادمي مُنفَّذ)** | `EligibleVoterSnapshot` + ربط كل صوت بدورته + قراءة الإصدار للمقاعد المجمّدة | الأوامر تمرّ بالحارس والبناء ناجح؛ الدورة الفعلية لم تُفتح |
| **E-A06-REFUSE-002/003 · E-A07-REFUSE-001 · E-A12-REG-001** | **PASS** | رفض بمعرّف غير موجود: `CastVote` · `OpenVote` · `IssueDecision` · `GenerateMeetingMinutes` | `404 target_not_found` ×4 |
| **E-A02-GUARD-037** | **PASS** | `TestAuthorizationGuard` على `authz-1.2.0-rc.1` | 30/30 أدوار · 12/12 إيجابي · 15/15 إغلاق-آمن |
| **E-BUILD-002 · 003 · 004 · 005** | **PASS** | البناء بعد كل دفعة | `status=0` في الأربع |

**مستوى الضمان**: بصمة SHA-256 = بصمة محتوى فقط، **ليست** إثبات صلاحية قانونية أو وقتًا موثوقًا أو مقاومة تعديل مستقلة، وتُعرض بهذا الوصف. وهيئة الإصدار تُسمّى صراحةً: «دورة مجمّدة N» أو «إعادة حساب حيّة — لا دورة مجمّدة».

## 2. تصنيف P0-02 (من المصدر لا من الواجهة)

| الإجراء | القرار | الدليل من المصدر |
|---|---|---|
| بدء الاجتماع · تأجيله · إلغاؤه · توليد نسخ السلسلة | **متاح عبر أوامر محكومة** | `StartMeeting` (بوابة: مجدول فقط) · `AdjournMeeting` (قيد التنفيذ فقط) · `CancelMeeting` (مجدول/قيد التنفيذ) · `GenerateMeetingInstances` |
| إنشاء مشروع قرار داخل الاجتماع | **متاح عبر أمر محكوم** — لمن يملك `agenda.propose` فقط | `CreateDecisionDraft` |
| تقديم بند أجندة · تقييم جاهزيته | **متاح عبر أوامر محكومة** — والجاهزية **محسوبة** لا مُختارة | `SubmitAgendaItem` · `EvaluateAgendaReadiness` |
| تثبيت الحضور · التوقيع · اعتماد المحضر | **متاح عبر أوامر محكومة** | `CertifyAttendance` · `SignRecord` · `ApproveMinutes` |
| إنهاء الاجتماع (`completed`) · استئناف مؤجّل | **ناقص التنفيذ** — لا أمر، وبوابة الحالة تسمح بـ«مجدول» فقط عند البدء | لا مسار محروس بعد (D-019 · D-021) |
| مراحل بند الأجندة · إرسال المحضر للمراجعة وإصداره · تصعيد القرار | **ناقص التنفيذ** — والسبب معلن مكانه | لا مسار محروس بعد (D-019 · D-022) |
| إنشاء مشروع قرار من مقعد **رئيس اللجنة** | **غير متاح** — تعارض قدرات معلن: الرئيس يملك `decision.propose` والامر يطلب `agenda.propose` | D-023 — قرار مالك مطلوب |
| أي إجراء في قراءة عامة غير مُصدَّقة | **غير متاح** — لعدم إثبات الصلاحية لا «للصيانة» | `GetCommitteeCapabilities` 401 ⇒ لا قدرات |

## 3. غير مُختبر / محجوب (معلن، لا يُحسب ناجحًا)

| المعرّف | الحالة | السبب |
|---|---|---|
| بدء/تأجيل/إلغاء اجتماع فعلي · تقديم بند أجندة · تقييم جاهزية حيّة · اعتماد محضر وتثبيت حضور | **NOT TESTED** | يلزم فاعل مُقعد في المعاينة |
| حزمة إصدار ناجحة على سجل حقيقي · دورة تصويت حيّة | **NOT TESTED** | يلزم بيانات مستوفية وفاعل مُقعد |
| الأسطح المتبقية في E-D002-INV-001 (المستندات · إعدادات اللجنة · مركز التقارير) | **NOT TESTED** | متبقية في الشريحة التالية |
| A01 · A12 بصريًا · A15–A18 | **NOT TESTED** | يلزم تحقق بصري/جلسة مخوّلة |
| دورات التصويت القديمة (D-017) · محتوى المحضر (D-020) | **BLOCKED / فجوة معلنة** | إجراء بياني · أمر مقعدي غير موجود |
| A02–A05 · A08–A11 · A13–A24 | **NOT TESTED** | خارج الدفعات المنفَّذة |
| اختبار التزامن (D-009) · نشر عام · بيانات حقيقية | **NOT ESTABLISHED / NOT AUTHORIZED** | قيد منصة · قرار مالك منفصل |

## 4. قائمة التغييرات (للتراجع)

**أُضيف**: `base44/entities/IssueSnapshot.jsonc` · `base44/entities/EligibleVoterSnapshot.jsonc` · `base44/shared/decisionIntegrity.ts` · `base44/shared/voteEligibility.ts` · `base44/functions/TestDecisionIntegrity/entry.ts` · `base44/functions/TestVoteEligibility/entry.ts` · `src/components/raqeem/IssuanceIntegrityPanel.jsx` · `src/components/routing/LegacyRecordRedirect.jsx` · `src/lib/richText.js`
**عُدِّل**: `base44/entities/Decision.jsonc` · `base44/functions/IssueDecision` · `OpenVote` · `CastVote` · `ProcessEscalation` · `GenerateMeetingMinutes` · `GetCommitteeRecord` · `DecisionWorkflow.jsx` · `MinutesManager.jsx` · **`MeetingDetail.jsx` (لا كتابة محكومة من المتصفح · كل زر بصلاحيته)** · **`AgendaManager.jsx` (بند الأجندة والجاهزية بأوامر محكومة)** · `ProofChainSnapshot.jsx` · `src/pages/DecisionDetail.jsx` · `src/App.jsx` (مساران)
**أثر البيانات**: لا كتابة على أي سجل قائم · لا إعادة بذر · لا حذف.
**التراجع**: إعادة ملفات القائمة أعلاه إلى نسختها السابقة؛ لا حاجة لتراجع بيانات.