# سجل المتطلبات — المرحلة 0 | REQUIREMENT-TO-IMPLEMENTATION REGISTER (Phase 0)

الجرد أُجري بمراجعة **المصدر الفعلي** (لا الموقع المنشور): 116 وظيفة خلفية، 100+ كيان، 40+ مسارًا في `src/App.jsx`، 3 سير عمل، 6 وحدات `base44/shared` للسلطة، وسكربتَا تحقق.

حالات «الحالة»: `مرئي` · `منفَّذ غير محقَّق` · `جزئي` · `معطّل بقرار` · `غائب بعد الفحص`.

## أ. عناصر P0/P1 من الموجز

| المُعرِّف | المتطلب | الكيان/الوظيفة/المسار الحالي | الحالة قبل | القرار | الاعتماديات | معرّفات القبول | الأولوية | المالك | الدليل | الإجراء التالي |
|---|---|---|---|---|---|---|---|---|---|---|
| R-P0-01 | إصدار القرار انتقال محروس بتعبئة إلزامية ومطابقة للهيئة الناخبة | `Decision` · `IssueDecision` · `Base44/shared/decisionIntegrity.ts` (جديد) · `IssueSnapshot` (جديد) | جزئي — كان الإصدار يكتب الحالة دون أي حساب للهيئة الناخبة، وبتجزئة غير حتمية | إصلاح + إضافة | مقاعد `CommitteeMembership` · `Vote` · `Attendance` · `Recusal` · `Signature` | A07 · A06 | P0 | غير مُسنَد | E-A07-DI-001…018 | إصلاح بيانات النموذج نفسه (انظر D-001) |
| R-P0-02 | تحديد الأزرار المحكومة المعطّلة: مقصودة للقراءة العامة أم ناقصة التنفيذ | `DecisionWorkflow` · `CommitteeWorkflow` | جزئي | تشخيص مطلوب | قرار مالك بنطاق المعاينة المخوّل | A02 · A08 | P0 | غير مُسنَد | — | **لم يُنفَّذ في هذه الدفعة** |
| R-P1-01 | رابط قرار قديم بلا نطاق يفقد سياق الجهة واللجنة | `/decisions/:id` · `/meetings/:id` · `LegacyRecordRedirect` (جديد) | معطوب | إصلاح | بوابة القراءة المحكومة `GetCommitteeRecord` | A01 | P1 | غير مُسنَد | البناء يمرّ · **اختبار المتصفح غير مُنفَّذ** | اختبار الرابطين في المعاينة |
| R-P1-02 | تاريخ المحضر من سجل الاجتماع + تعقيم المحتوى الغني + إبطال المسودات البائتة | `GenerateMeetingMinutes` · `MinutesManager` | معطوب | إصلاح مطلوب | مكتبة تعقيم | A12 | P1 | غير مُسنَد | — | **لم يُنفَّذ** |
| R-P1-03 | توحيد الأسماء عربي/إنجليزي وترجمة الأنواع وروابط الطوابير الدقيقة | `l10n` · `raqeemUtils` · الطوابير | جزئي | إصلاح مطلوب | قاموس مصطلحات معتمد | A12 · A18 | P1 | غير مُسنَد | — | **لم يُنفَّذ** |
| R-P1-04 | تمييز «المراجع للقراءة» عن «عدسة الدور» وإثبات منع التغيير | `EffectiveActorContext` · `PersonaContextPath` | جزئي | إصلاح + إثبات | سجل عرض تجريبي | A04 · A22 | P1 | غير مُسنَد | — | **لم يُنفَّذ** |
| R-P1-05 | إثبات منشأ البيانات التركيبية وإزالة تفاصيل دوال الإصلاح من العرض | `AuditTrail` · `*Provision*` · `RepairDrHamadDemoExperienceV3` | جزئي | إصلاح مطلوب | — | A10 · A22 | P1 | غير مُسنَد | — | **لم يُنفَّذ** |

## ب. خرائط المفاهيم في الموجز (القسم 4) إلى الكيانات القائمة

`Person/login` → `User` + `UserProfile` · `Employment` → `OrganizationMembership` · `Committee` → `Committee` (+`CommitteeMandate`, `CommitteeFormationVersion`, `FoundingInstrument`, `InstrumentVersion`) · `Seat` → `CommitteeMembership` · `Appointment` → `CommitteeMembership` + `FoundingInstrument` · `Delegation/Alternate` → `Delegation`, `AuthorityDelegation`, `AlternateActivation` · `Topic/Agenda` → `AgendaItem` + `AgendaItemEvidenceRequirement` · `Meeting/Material` → `Meeting`, `MeetingPack`, `DocumentVersion` · `Attendance/Conflict/Recusal` → `Attendance`, `ConflictDeclaration`, `Recusal` · `Proposal/Ballot/Approval/Signature` → `Decision`, `Vote`, `Deliberation`, `Signature`, `MemberAcknowledgement` · `IssueSnapshot` → **أُضيف الآن** · `Execution/Evidence/Verification` → `Action`, `EvidenceSubmissionEntry`, `CrossEntityDependency`, `CommitteeLifecycleEvent` · `Notification/Attempt` → `NotificationOutbox`, `NotificationConfig`, `NotificationPreference` · `AuditEvent` → `AuditEvent`, `AuditLog` · `Classification/Retention/Hold/Publication/Oversight` → `Document`+`DocumentAccessGrant`, `BreakGlassAccess`, `GovernanceConfig`.

**لم يُبنَ مخطط موازٍ**: كل ما أُضيف هو كيان واحد (`IssueSnapshot`) وحقول إضافية على `Decision`.

## ج. قيود منصة مؤكدة (لا تُحاكى)
1. لا معاملة (transaction) حقيقية على مستوى المخزن: تُستخدم مطالبة انتقال فريدة + قارن-وبدّل، ويُعلن مستوى الضمان بدقة ولا يُدّعى الأقوى.
2. سكربتات `scripts/*.mjs` لا تُنفَّذ من بيئة البناء: الفحص الثابت يُدار يدويًا، والجرد اشتُقّ بالتعداد المعلن.
3. لا اختبار تزامن فعلي من بيئة البناء.
4. `auth.me()` لا يستطيع فرض حالة تحقق البريد إداريًا (سابقًا).
5. لا وسيط خطوة-تصعيد (step-up) للمخاطر العالية.

## د. قائمة تحقق النشر والتراجع
- لا إجراء نشر مصرّح به في هذا الموجز. أي نشر = قرار مالك منفصل.
- التراجع: إعادة الملفات المذكورة في `EVIDENCE_LEDGER.md` (قائمة التغييرات) إلى نسختها السابقة.
- **أثر البيانات لهذه الدفعة: لا ترحيل هدّام، ولا كتابة على أي سجل قائم، ولا إعادة بذر.** الكيان الجديد `IssueSnapshot` فارغ.