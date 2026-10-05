# خط الأساس | BASELINE S0 — LIJAN™

**التاريخ**: 2026-10-05 (مساءً، توقيت الرياض) · **الشريحة**: S0 (المرحلة 0 / G0) · **الكاتب**: فريق التطوير (مالك التسليم غير مُسنَد).
**قاعدة هذا المستند**: كل قيمة فيه **مقيسة** على البناء المسمّى أدناه. وما لم يُقس يُكتب `NOT VERIFIED` ولا يُفترض.

## 1. هوية البناء (E-S0-001 · E-S0-002)

| البند | القيمة |
|---|---|
| المراجعة | `eafdbb4` · `2026-10-05T12:40:49+00:00` |
| حالة الشجرة | **نظيفة** — `git status --porcelain` = 0 ملف |
| بناء الواجهة | `npx vite build` → `status=0` · `dist/` كامل · 108 أصول · 3.5MB |
| بناء بعد أول إصلاح (D-042) | `status=0` |
| المعاينة المنشورة | `https://lijan.base44.app` (قراءة فقط في هذه الدفعة) |

## 2. الأهداف الثلاثة (منفصلة بقصد)

| الهدف | القيمة | الحالة |
|---|---|---|
| **الواجهة** | Vite + React SPA أحادية الصفحة → `dist/` · 74 صفحة · 188 مكوّنًا | مؤكد بالبناء |
| **الخادم** | 119 دالة (`base44/functions/<Name>/entry.ts`) · 40 وحدة مشتركة (`base44/shared/`) · 3 مسارات عمل · وكيلان (`ameen`, `ameen_demo`) · 6 أسر اختبار | مؤكد بالجرد |
| **البيانات** | 87 كيانًا · قاعدتا **الإنتاج** و**الاختبار** قائمتان | **حدّ بيانات القبول: NOT VERIFIED — قرار مطلوب** (انظر §8) |
| **التكاملات** | موصّلان app-user فقط: Google Calendar («Calender»، `6a40f423404d169cb3344836`) وOutlook Calendar (`6abe5970bddfed2e7caa5cda`) · **لا مفتاح بيئة مستخدم في الخادم** | مؤكد بالجرد |

## 3. بصمات السياسة = معرّفات نسخ الأدلة (E-S0-003)

كل دليل يُقيَّد بهذه البصمات: تغيّر أي منها يُبطل الأدلة السابقة عليه بنص السياسة.

| الوحدة | البصمة (sha256[:16]) | النسخة المعلنة |
|---|---|---|
| `authorityKernel` | `34582b1fcd6d98a4` | `authz-1.2.0-rc.2` |
| `commandGuard` | `1495412a0e4c0313` | — |
| `transitionClaim` | `b3c6bbfb9a3328cd` | — |
| `decisionIntegrity` | `a3ce3c7321890a2d` | `decision-integrity-1.2.0` |
| `roundContext` | `af18817174339346` | `round-context-1.1.0` |
| `voteEligibility` | `a181fe9b89dce338` | — |
| `committeeAuth` | `5163c88cd4efee64` | — |
| `governedReadPolicy` | `1e754002a1cea0c3` | — |
| `fileAccessPolicy` | `e3d7127d96bc3307` | — |
| `showcaseSession` | `8f7963e1e0adea5a` | — |
| `capabilityKernel` | `329485194c645170` | — |
| `recordGovernance` | `3fc44d6b1436d060` | — |

## 4. التقاطات خط الأساس للمسارات (A01)

**الإجمالي: 96 مسارًا** — 55 داخل مساحة اللجنة `/o/:orgRef/c/:committeeRef/…` و39 مسار دخول/عام.

المسارات التي يجب التقاطها كما هي في A01 (موجبة): الجذر `/` · مساحة اللجنة (الاجتماعات، تفاصيل الاجتماع، القرارات، تفاصيل القرار، المستندات، المحاضر، التصويت، التنفيذ، التدقيق) · `/meetings/:id` و`/decisions/:id` (تحويل نطاقي) · `/committees-registry` (السجل العام — **فارغ بقصد**) · `/explore` و`/explore/:personaSlug` · `/verify/:type/:id` · `/governance-policies` · مسارات المصادقة الأربعة.
**المسارات المحفوظة بالاسم**: الراوتر (39 مسار دخول/عام)، الهوية البصرية، معرّفات اللجان/الاجتماعات/القرارات القائمة، وعدّ **إجراءَي QDB المُصالح عليه (2 في التنفيذ و2 في التتبّع)**.
**السالبة في A01**: معرّف قديم غير محلول أو غير مخوّل ⇒ لا كشف محتوى ولا منح نطاق.

## 5. جرد الكتابات المباشرة من العميل (E-S0-006) — مدخلات S1/S4/S6/S9

**الإجمالي: 38 موضعًا في 23 ملفًا.** أُدرجت مصنَّفة، لأن «كتابة مباشرة» ليست عيبًا واحدًا:

**(أ) كتابات على سجلات محكومة تستوجب أمرًا محكومًا — 20 موضعًا**

| الملف:السطر | الكتابة | ملاحظة |
|---|---|---|
| `CommitteeSettings.jsx:44` | `Committee.update` | إعدادات اللجنة (D-002) |
| `CommitteeMandate.jsx:56` | `Committee.update` | نص التكليف |
| `CommitteeGovernanceRules.jsx:63` | `Committee.update` | قواعد الحكم |
| `WorkGroupDocumentCenter.jsx:91` / `:126` | `Document.create` / `Document.update` | مستند مجموعة العمل |
| `DecisionDocuments.jsx:61` / `:70` | `Document.update` | (D-002) |
| `AgendaManager.jsx:84` | `AgendaItem.delete` | (D-024) |
| `MinutesManager.jsx:64` | `MeetingMinutes.update` | محتوى المحضر (D-020) |
| `documentEngine.js:192` | `ProductInstance.update` | محرّك المستندات |
| `ReportCenter.jsx:48` | `ProductInstance.update` | (D-002) |
| `CommitteeAI.jsx:67` | `AIOutputLedger.update` | سجل مخرجات الذكاء |
| `NotificationCenter.jsx:84` / `:94` | `NotificationOutbox.update` | حالة التسليم — تحتاج تمييز «قراءة المستخدم» من «حالة تسليم» |
| `OrgNotifications.jsx:57` / `:65` | `NotificationOutbox.update` | كذلك |
| `AuthContext.jsx:106` · `EffectiveActorContext.jsx:144` · `OrganizationAssetsAdmin.jsx:88` | `AuditEvent.create` | **الفاعل يكتب تدقيقه بنفسه** — النمط الذي أُصلح في D-018 |

**(ب) كتابات مقبولة مباشرة (حالة المستخدم/سجل المنهج نفسه) — 12 موضعًا**: `NotificationPreference` (×4) · `TranslationGap.upsert` (سجل منهج القيم الناقصة) · `DemoPersonaProfile.upsert` (هوية العرض التجريبية) · `FounderVaultEntry.create` · `Deliberation.create` · `Institution.create` · `Organization*` في `OrganizationAssetsAdmin` · `NotificationTemplate` (×3 داخل نفس الصفحة).

**(ج) 6 موضعًا أخرى**: `OrganizationAssetsAdmin` (سجل الهوية المؤسسية المركزي) — تحتاج تصنيفًا صريحًا في S6: هل هي إدارة منصة (مقبولة) أم قرار مؤسسي (يستوجب أمرًا محكومًا)؟ **لم يُحسم في هذه الدفعة.**
**قراءة الأسطح**: الجرد الذري لأسطح القراءة والكتابة في `REGISTER_SURFACE_INVENTORY.md` (17 سطحًا، منها 4 غير محكومة معلنة).

## 6. الأتمتة والتكامل (E-S0-007)

| النوع | العناصر |
|---|---|
| مسارات عمل مجدولة | `Ameen Execution Reminders` (`0 7 * * *` يوميًا) · `Scheduled Amendment Effectivation` (`0 9 * * *` يوميًا) |
| مسار عمل بمُشغّل | `Auto Meeting Minutes` |
| دوال تشغيلية دورية | `RunExecutionReminders` · `RunAmeenExecutionFollowUp` · `ProcessEscalation` · `RetryEscalationNotice` · `ApplyScheduledAmendments` |
| تكاملات | `SyncMeetingToCalendar`/`GetCalendarConnection` (Google) · `SyncMeetingToOutlook`/`GetOutlookCalendarConnection` · `DispatchNotification` + `NotificationOutbox` |
| أسرار بيئة | **لا شيء** — لا `process.env` في الخادم؛ أي مفاتيح مستقبلية تمرّ عبر `set_secrets` وحده |

## 7. بيان التركيب وحالة العزل (fixture manifest)

| الأصل | المفتاح/المصدر | حالة العزل |
|---|---|---|
| مجموعة تجربة حمد | `DEMO_DATASET` · برامج `ProvisionDrHamadDemoData` · `RepairDrHamadDemoExperienceV3` | عزل على مستوى المصدر (`showcaseSession.ts` يقيّد `c.demo_dataset === persona.dataset`) — **اختبار تنفيذ فعلي NOT VERIFIED** |
| مجموعة مشهد FAHAD | `FAHAD_QATAR_GOVERNMENT_DEMO_V2` | كذلك |
| مشاهدات NSDC | `SeedNSDCShowcase` | كذلك |
| جلسة العرض | `ShowcaseSession` (رمز قصير العمر + `RevokeShowcaseSession` على الخروج) | **مصمَّمة** معزولة؛ **NOT VERIFIED** تنفيذيًا |
| **مشهد د. محمد** (المطلوب في J01–J14) | — | **غير موجود** — يُنشأ في S3 موسومًا ومعزولًا عن حمد وعن كل هوية حقيقية |
| فيكست سلبي | قرار «الميثاق الوطني 2026/09» المتناقض (D-001) | **يُحفظ موسومًا خارج المسار المهني السعيد** — لا يُصلَح ولا يُحذف بلا قرار مالك |

**قاعدة البذر**: أي إعداد تركيبي متكرر يجب أن يكون **نطاقيًا، مُكرَّرًا بلا أثر (idempotent)، وغير ضار بالسجلات غير المعنية**. ولا تُلفَّق أصوات أو توقيعات أو تعيينات تاريخية.

## 8. الاسترجاع والتراجع، والتصريح المطلوب

**أثر بيانات هذه الدفعة**: صفر كتابة · صفر حذف · صفر بذر · لا ترحيل · لا لمس لبيانات إنتاج.
**التراجع**: إعادة `MeetingDetail.jsx` (الملف الوحيد المتغيّر وظيفيًا) إلى `eafdbb4`؛ ودفعات المصدر السابقة تُلغى بتراجع ملفاتها المسماة في `EVIDENCE_LEDGER.md` §6. **لا حاجة لتراجع بيانات** لعدم وجود كتابة.
**الحاجزان الحقيقيان** (يحتاجان تصريحًا لا تنفيذًا مني):
1. **هوية اختبار واحدة مُقعدة**: تُدعى من لوحة «App Users» لبريد نطاق تركيبي، ثم تُعيَّن مقعدًا في لجنة تركيبية معزولة بأمر محكوم. لا يمكنني إنشاء هويات دخول، والموجز يمنعني من ذلك.
2. **قرار حدّ البيانات**: قاعدة الاختبار (**موصى به**) أم الإنتاج بسجلات موسومة.
3. **قرار سياسة يحجب D-041**: توسيع بوابة `OpenVote` لتقبل `draft` من صاحب `decision.propose` (**موصى به**) أو إضافة أمر `decision.submit` ينتج `proposed`.

## 9. ما ينتظر التنفيذ في S0 (غير محجوب بالتصريح)

- رفع كاتالوج القبول A01–A24 / J01–J14 إلى المستودع (منسوخ الآن في الموجز).
- تثبيت مصفوفة الفاعل/القدرة (actor-role matrix) من `capabilityKernel` + `ROLE_BASELINE` كمُدخَل لاختبارات S2.
- تجهيز حاضنة اختبار محلية معزولة (harness) لدورة قرار كاملة على سجلات تركيبية داخل قاعدة الاختبار — بلا حاجة إلى هوية دخول، وبلا كتابة إنتاج.
- سكربت المقارنة B-01…B-06 (البروتوكول مثبّت في `COMPETITIVE_REGISTER.md` §4، والتنفيذ ينتظر منتجًا قابلًا للتشغيل الموجب).

## 10. الحكم على S0

**مخرج S0**: خط أساس مسمّى وقابل للاسترجاع + خريطة تسليم كاملة + سجل منافسة بأرضية تكافؤ وبلا نتائج مُختلقة + أول إصلاح آمن.
**حالة البوابة G0**: **جزئية كما هي** — شرطها الأصلي (النموذج المخزَّن المتناقض D-001) ما زال بقرار مالك.
**ولا حالة قبول واحدة تُنسب لهذه الدفعة**: A01 وA22 `NOT TESTED`، وكلاهما يحتاج التقاطات متصفح وفاعلًا مُصادَقًا.