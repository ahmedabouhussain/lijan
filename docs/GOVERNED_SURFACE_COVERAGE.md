# مصفوفة تغطية حالات الواجهة — LIJAN™

**حالة التنفيذ: `IMPLEMENTED — NOT BROWSER TESTED`**
نجاح البناء لا يُنتج `PASS`. لا يوجد في هذا المستند أي سطر مبني على اختبار متصفح فعلي.

---

## 1. تصحيح الادّعاء السابق

الادّعاء «طُبّق على 9 من 10 أسطح» **مسحوب**. العدد لا يُذكر إلا بعد تسمية كل سطح وإثبات اتصاله بالمصدر المشترك.
النتيجة المدقّقة:

| التصنيف | العدد | الأسطح |
|---|---|---|
| مُطبَّق بالكامل (المصدر المشترك + الحالات) | 6 | تفاصيل الاجتماع · سجل المستندات · تفاصيل المستند · تفاصيل القرار · مصفوفة التتبع · سجل التدقيق |
| غير مُغطّى (قراءة خارج البوابة الموحدة أو حالات محلية) | 4 | سجل الاجتماعات · سجل القرارات · سجل الإجراءات · التقارير/الذاكرة/مهام المراجعة |

الأسطح الستة المذكورة سابقًا في التقرير هي المذكورة أعلاه؛ لم يكن هناك سابع أو ثامن أو تاسع قابل للإثبات.

---

## 2. الأدلة (كيف أُثبت الاتصال)

| الدليل | الأمر |
|---|---|
| مصادر القراءة الموحّدة | `grep -rln "useCommitteeRegister\|useCommitteeRecord\|governedInvoke" src` |
| مستهلكو لوحة الحالات | `grep -rln "RegisterStatePanel" src` |
| مصدر القراءة لكل سطح | `grep -n "entities\.\|useCommittee\|registers\." <surface>` |

المصادر المشتركة:
- **قراءة سجل**: `useCommitteeRegister` → دالة الخادم `ListCommitteeRegister`.
- **قراءة سجل واحد**: `useCommitteeRecord` → دالة الخادم `GetCommitteeRecord`.
- **عرض الحالة**: `RegisterStatePanel` + `resolveSurfaceState` (`src/lib/governedState.js`).
- **سياق اللجنة**: `CommitteeContext` → دالة الخادم `GetCommitteeMiniPortal` (مسار مختلف — وهذا أصل الفجوة).

---

## 3. المصفوفة الصريحة للأسطح العشرة

| السطح | المسار | مصدر القراءة | الحالات المطبقة | العربية | الإنجليزية | إعادة المحاولة | نتيجة الاختبار |
|---|---|---|---|---|---|---|---|
| 1. سجل الاجتماعات | `/o/:orgRef/c/:committeeRef/meetings` (CommitteeMeetings داخل MeetingsHub) | `GetCommitteeMiniPortal` عبر CommitteeContext | `TableSkeleton` فقط؛ لا لوحة حالات | نعم | نعم | لا | **NOT COVERED** — لا يقرأ عبر البوابة الموحدة |
| 2. تفاصيل الاجتماع | `/o/:orgRef/c/:committeeRef/meetings/:id` و `/meetings/:id` | `useCommitteeRecord("Meeting")` → `GetCommitteeRecord` | LOADING · EMPTY · NO_AUTHORITY · OUT_OF_SCOPE · NOT_FOUND · DEGRADED · ERROR · EXPLORATION · SESSION_ENDED | نعم | نعم | نعم (ERROR/DEGRADED فقط) | **IMPLEMENTED — NOT BROWSER TESTED** |
| 3. سجل المستندات | `…/documents` | `useCommitteeRegister("documents")` → `ListCommitteeRegister` | المجموعة الكاملة | نعم | نعم | نعم | **IMPLEMENTED — NOT BROWSER TESTED** |
| 4. تفاصيل المستند | `…/documents/:documentId` | `useCommitteeRecord("Document")` | المجموعة الكاملة | نعم | نعم | نعم | **IMPLEMENTED — NOT BROWSER TESTED** |
| 5. سجل القرارات | `…/decisions` | `GetCommitteeMiniPortal` عبر CommitteeContext | `TableSkeleton` + عدّاد من المصفوفة المحمّلة | نعم | نعم | لا | **NOT COVERED** |
| 6. تفاصيل القرار | `…/decisions/:id` | `useCommitteeRecord("Decision")` | المجموعة الكاملة | نعم | نعم | نعم | **IMPLEMENTED — NOT BROWSER TESTED** |
| 7. سجل الإجراءات | `…/actions` | `GetCommitteeMiniPortal` عبر CommitteeContext | `TableSkeleton` + `actions.length === 0` | نعم | نعم | لا | **NOT COVERED** |
| 8. مصفوفة التتبع | داخل سطح التدقيق (TraceabilityMatrix) | `useCommitteeRegister(["products","decisions","actions"])` | المجموعة الكاملة | نعم | نعم | نعم | **IMPLEMENTED — NOT BROWSER TESTED** |
| 9. سجل التدقيق | `…/audit` | `useCommitteeRegister("audit_events")` + فرض `NO_AUTHORITY` عند حجب العناصر | المجموعة الكاملة | نعم | نعم | نعم | **IMPLEMENTED — NOT BROWSER TESTED** |
| 10. التقارير · الذاكرة · مهام المراجعة | `…/reports` · `…/memory` · صندوق العمل | **ثلاثة مسارات مختلفة**: Reports يعتمد CommitteeContext بلا قراءة سجل مستقلة · Memory يقرأ `AIOutputLedger` مباشرة من العميل · المهام تُبنى في `GetCommitteeMiniPortal` وتُطابق في الخادم عبر `reviewTasks` | Skeletons محلية فقط؛ لا لوحة حالات | نعم | نعم | لا | **NOT COVERED** (ثلاثة أسطح قراءة مستقلة، لا سطح واحد) |

**إجمالي مُغطّى: 6 من 10 · غير مُغطّى: 4 من 10.**

---

## 4. الفجوات المرصودة (بترتيب الخطورة)

1. **خرق قاعدة «لا صفر بلا قراءة ناجحة»** في الأسطح 1 و5 و7 و10: عند فشل قراءة المزوّد يبقى `TableSkeleton` دائمًا (سطح 1 و5 و7)، وفي الذاكرة يُحوَّل الفشل إلى قائمة فارغة (`catch { setRecords([]) }`) فيقرأ المستخدم صفرًا لم تحدثه قراءة ناجحة.
2. **مصدرا قراءة متوازيان**: `GetCommitteeMiniPortal` يقرأ السجلات (اجتماعات/قرارات/إجراءات) دون أن يمرّ بقرار `ListCommitteeRegister`، فتظهر قائمة قد لا يوافقها سطح التفاصيل.
3. **حالات الاستكشاف**: الأسطح الأربعة غير المُغطّاة لا تميّز `EXPLORATION` ولا `SESSION_ENDED`.

## 5. الترتيب التالي للتنفيذ (لم يُنفّذ بعد)

1. تحويل الأسطح 1 و5 و7 إلى `useCommitteeRegister` (الاجتماعات/القرارات/الإجراءات) وإزالة أي `length === 0` محلي.
2. إخضاع الذاكرة لقراءة محكومة بدل `base44.entities.*.filter` من العميل، وإدخال المهام في `RegisterStatePanel`.
3. بعد ذلك فقط يُعاد قياس النسبة، ويبقى التصنيف `IMPLEMENTED — NOT BROWSER TESTED` حتى تُشغَّل الرحلات من المتصفح.