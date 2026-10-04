# الجرد الذري لأسطح القراءة والكتابة — LIJAN™

**لا نسبة تغطية في هذا المستند.** كل «سطح» هو **مسار قراءة واحد**؛ ظهور عدة مسارات في بوابة واحدة لا يجعلها سطحًا واحدًا.
حالة كل سطح: `IMPLEMENTED — NOT BROWSER TESTED` ما لم يُكتب غير ذلك. لا `PASS` بغير اختبار متصفح.

**المصادر المشتركة**:
- `A` = `useCommitteeRegister` → `ListCommitteeRegister` (قراءة سجل محكومة)
- `B` = `useCommitteeRecord` → `GetCommitteeRecord` (قراءة سجل واحد محكومة، والنطاق من السجل)
- `C` = `CommitteeContext` → `GetCommitteeMiniPortal` (مسار مختلف)
- `D` = قراءة مباشرة من العميل (`base44.entities.*`) — تجاوز للبوابة
- `G` = الحارس الموحد `AuthorizeCommitteeAction` / `resolveAuthority` (`authz-1.0.0`)

| # | السطح | المسار | مصدر القراءة | بوابة السلطة | حالة النجاح الفارغ | حالة المنع | حالة الفشل | اللغة | اختبار المتصفح | الدليل |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | سجل الاجتماعات | `…/meetings` | C | `committeeAuth` (بعد التوحيد: نفس جدول الصلاحيات) | غير مميَّزة — يعرض العدد المحمّل | غير مميَّزة | `TableSkeleton` دائم بلا رسالة | AR/EN | NOT TESTED | `grep useCommittee` على `CommitteeMeetings` |
| 2 | تفاصيل الاجتماع | `…/meetings/:id` و`/meetings/:id` | B | `governedReadPolicy` (خادمي) | لا صفر بلا قراءة ناجحة | `NO_AUTHORITY` / `OUT_OF_SCOPE` | `ERROR` / `DEGRADED` + إعادة محاولة | AR/EN | NOT TESTED | `MeetingDetail` يستورد `RegisterStatePanel` |
| 3 | سجل القرارات | `…/decisions` | C | كما 1 | غير مميَّزة | غير مميَّزة | `TableSkeleton` دائم | AR/EN | NOT TESTED | `CommitteeDecisions` |
| 4 | تفاصيل القرار | `…/decisions/:id` | B | `governedReadPolicy` | — | `NO_AUTHORITY` | `ERROR` + إعادة محاولة | AR/EN | NOT TESTED | `DecisionDetail` |
| 5 | سجل المستندات | `…/documents` | A | `ListCommitteeRegister` | `EMPTY` صريح | `NO_AUTHORITY` | `ERROR` + إعادة محاولة | AR/EN | NOT TESTED | `CommitteeDocuments` |
| 6 | تفاصيل المستند | `…/documents/:documentId` | B | `governedReadPolicy` | — | `NO_AUTHORITY` | `ERROR` + إعادة محاولة | AR/EN | NOT TESTED | `DocumentDetail` |
| 7 | سجل الإجراءات | `…/actions` | C | كما 1 | `actions.length === 0` (صفر غير مُثبَت) | غير مميَّزة | `TableSkeleton` دائم | AR/EN | NOT TESTED | `CommitteeActions` |
| 8 | مصفوفة التتبع | داخل سطح التدقيق | A (`products,decisions,actions`) | `ListCommitteeRegister` | `EMPTY` صريح | `NO_AUTHORITY` | `ERROR` + إعادة محاولة | AR/EN | NOT TESTED | `TraceabilityMatrix` |
| 9 | سجل التدقيق | `…/audit` | A (`audit_events`) | `ListCommitteeRegister` | `EMPTY` صريح | `NO_AUTHORITY` مفروضة عند الحجب | `ERROR` + إعادة محاولة | AR/EN | NOT TESTED | `CommitteeAudit` |
| 10 | تقارير اللجنة | `…/reports` | C (بلا قراءة سجل مستقلة) | كما 1 | غير مميَّزة | غير مميَّزة | `TableSkeleton` | AR/EN | NOT TESTED | `CommitteeReports` لا يستورد أي مصدر قراءة A/B |
| 11 | ذاكرة اللجنة | `…/memory` | **D** (`AIOutputLedger.filter`) | **لا بوابة سلطة** | — | **الفشل يتحول إلى صفر** (`catch { setRecords([]) }`) | صفر كاذب | AR/EN | NOT TESTED | `CommitteeMemory` |
| 12 | مهام المراجعة | صندوق العمل | C + `reviewTasks` | `committeeAuth` + مطابقة `reviewer_user_id` | غير مميَّزة | غير مميَّزة | صمت | AR/EN | NOT TESTED | `WorkInbox` |
| 13 | كتالوج المنتجات | `…/products` | لم يُفحص | — | — | — | — | AR/EN | NOT TESTED | **OPEN** |
| 14 | مركز التوثيق | `…/documentation` | `useDocumentationPack` | لم يُفحص | — | — | — | AR/EN | NOT TESTED | **OPEN** |
| 15 | سجل العمل (Work Groups) | `…/workstreams` | لم يُفحص | — | — | — | — | AR/EN | NOT TESTED | **OPEN** |
| 16 | سجل التصويت | داخل تفاصيل الاجتماع/القرار | من حزمة B | `governedReadPolicy` | — | `NO_AUTHORITY` | `ERROR` | AR/EN | NOT TESTED | `LiveVotingWidget` |
| 17 | الحضور والمحاضر | داخل تفاصيل الاجتماع | من حزمة B | `governedReadPolicy` | — | `NO_AUTHORITY` | `ERROR` | AR/EN | NOT TESTED | `AttendancePanel` · `MinutesManager` |

## الأسطح غير المحكومة (يجب إغلاقها قبل أي نسبة)

1. **#11 ذاكرة اللجنة** — قراءة مباشرة من العميل، والفشل يُعرض كصفر (خرق لقاعدة «لا صفر بلا قراءة ناجحة»).
2. **#1 و#3 و#7 و#10** — تعتمد مسار `GetCommitteeMiniPortal` لا البوابة الموحدة، ولا تميّز المنع من الفشل من الصفر.
3. **#12 مهام المراجعة** — تعتمد تكليفًا بلا مستلم (`reviewer_user_id`) — ينتظر إصلاح عقد التكليف.
4. **#13 و#14 و#15** — لم تُفحص بعد، ولا يجوز عدّها مُغطّاة أو غير مُغطّاة قبل الفحص.

## قاعدة الإجراء

لا يُعلن أي رقم تغطية قبل أن يصبح لكل سطر أعلاه: مصدر قراءة مؤكَّد + بوابة سلطة + ثلاث حالات مميَّزة + دليل + اختبار متصفح.