# سجل المتطلبات — المرحلة 0 | REQUIREMENT-TO-IMPLEMENTATION REGISTER (Phase 0)

الجرد أُجري بمراجعة **المصدر الفعلي** (لا الموقع المنشور): 116 وظيفة خلفية، 100+ كيان، 40+ مسارًا في `src/App.jsx`، 3 سير عمل، 6 وحدات `base44/shared` للسلطة، وسكربتَا تحقق.

حالات «الحالة»: `مرئي` · `منفَّذ غير محقَّق` · `جزئي` · `معطّل بقرار` · `غائب بعد الفحص`.

## أ. عناصر P0/P1 من الموجز

| المُعرِّف | المتطلب | الكيان/الوظيفة/المسار الحالي | الحالة قبل | القرار | الاعتماديات | معرّفات القبول | الأولوية | المالك | الدليل | الإجراء التالي |
|---|---|---|---|---|---|---|---|---|---|---|
| R-P0-01 | إصدار القرار انتقال محروس بتعبئة إلزامية ومطابقة للهيئة الناخبة | `Decision` · `IssueDecision` · `base44/shared/decisionIntegrity.ts` (جديد) · `IssueSnapshot` (جديد) · `EligibleVoterSnapshot` (جديد) | جزئي — كان الإصدار يكتب الحالة دون أي حساب للهيئة الناخبة، وبتجزئة غير حتمية | إصلاح + إضافة | مقاعد `CommitteeMembership` · `Vote` · `Attendance` · `Recusal` · `Signature` | A07 · A06 | P0 | غير مُسنَد | E-A07-DI-001…020 | إصلاح بيانات النموذج نفسه (انظر D-001) |
| R-P0-02 | تحديد الأزرار المحكومة المعطّلة: مقصودة للقراءة العامة أم ناقصة التنفيذ | `DecisionWorkflow` · `OpenVote` · `CastVote` · `IssueDecision` · `GetCommitteeCapabilities` | جزئي → **تشخيص مُنفَّذ** | إصلاح + تصنيف | صلاحيات اللجنة عبر `GetCommitteeCapabilities` | A02 · A08 | P0 | غير مُسنَد | تصنيف P0-02 في `EVIDENCE_LEDGER.md` §2 · لوحة القرار لا تكتب شيئًا · البناء يمرّ | تصنيف بقية الأسطح (الاجتماعات، المحاضر، المستندات) بالنمط نفسه |
| R-P1-01 | رابط قرار قديم بلا نطاق يفقد سياق الجهة واللجنة | `/decisions/:id` · `/meetings/:id` · `LegacyRecordRedirect` (جديد) | معطوب | إصلاح | بوابة القراءة المحكومة `GetCommitteeRecord` | A01 | P1 | غير مُسنَد | البناء يمرّ · **اختبار المتصفح غير مُنفَّذ** | اختبار الرابطين في المعاينة |
| R-P1-02 | تاريخ المحضر من سجل الاجتماع + تعقيم المحتوى الغني + إبطال المسودات البائتة | `GenerateMeetingMinutes` · `MinutesManager` · `src/lib/richText.js` (جديد) | معطوب → **مُصلَح** | إصلاح | مكتبة تعقيم | A12 | P1 | غير مُسنَد | إصلاح مُبرمَج · البناء يمرّ · **العرض البصري غير مُختبر** | اختبار المتصفح لاجتماع 29 أكتوبر |
| R-P1-03 | توحيد الأسماء عربي/إنجليزي وترجمة الأنواع وروابط الطوابير الدقيقة | `l10n` · `raqeemUtils` · الطوابير | جزئي | إصلاح مطلوب | قاموس مصطلحات معتمد | A12 · A18 | P1 | غير مُسنَد | — | **لم يُنفَّذ** |
| R-P1-04 | تمييز «المراجع للقراءة» عن «عدسة الدور» وإثبات منع التغيير | `EffectiveActorContext` · `PersonaContextPath` | جزئي | إصلاح + إثبات | سجل عرض تجريبي | A04 · A22 | P1 | غير مُسنَد | — | **لم يُنفَّذ** |
| R-P1-05 | إثبات منشأ البيانات التركيبية وإزالة تفاصيل دوال الإصلاح من العرض | `AuditTrail` · `*Provision*` · `RepairDrHamadDemoExperienceV3` | جزئي | إصلاح مطلوب | — | A10 · A22 | P1 | غير مُسنَد | — | **لم يُنفَّذ** |

## ب. خرائط المفاهيم في الموجز (القسم 4) إلى الكيانات القائمة

`Person/login` → `User` + `UserProfile` · `Employment` → `OrganizationMembership` · `Committee` → `Committee` (+`CommitteeMandate`, `CommitteeFormationVersion`, `FoundingInstrument`, `InstrumentVersion`) · `Seat` → `CommitteeMembership` · `Appointment` → `CommitteeMembership` + `FoundingInstrument` · `Delegation/Alternate` → `Delegation`, `AuthorityDelegation`, `AlternateActivation` · `Topic/Agenda` → `AgendaItem` + `AgendaItemEvidenceRequirement` · `Meeting/Material` → `Meeting`, `MeetingPack`, `DocumentVersion` · `Attendance/Conflict/Recusal` → `Attendance`, `ConflictDeclaration`, `Recusal` · `Proposal/Ballot/Approval/Signature` → `Decision`, `Vote`, `Deliberation`, `Signature`, `MemberAcknowledgement` · `IssueSnapshot` → **أُضيف الآن** · `Execution/Evidence/Verification` → `Action`, `EvidenceSubmissionEntry`, `CrossEntityDependency`, `CommitteeLifecycleEvent` · `Notification/Attempt` → `NotificationOutbox`, `NotificationConfig`, `NotificationPreference` · `AuditEvent` → `AuditEvent`, `AuditLog` · `Classification/Retention/Hold/Publication/Oversight` → `Document`+`DocumentAccessGrant`, `BreakGlassAccess`, `GovernanceConfig`.

**لم يُبنَ مخطط موازٍ**: كل ما أُضيف هو كيان واحد (`IssueSnapshot`) وحقول إضافية على `Decision`.

## هـ. شرائح التنفيذ المصرّح بها (تسلسل العمل)

| الشريحة | المحتوى | الحالة | الدليل |
|---|---|---|---|
| 1 | سلامة الإصدار (P0-01) + تصنيف P0-02 + إصلاح لوحة القرار | مُنفَّذة · 20/20 + 12/12 على الخادم | E-A07-DI · E-A06-EL · E-BUILD-002 |
| 2 | إغلاق D-013: الهيئة الناخبة كسجل مجمّد يُقنَّن به الصوت والإصدار | **مُنفَّذة هذه الدفعة** | E-A06-FREEZE-001 · E-A06-EL-011 · E-A07-DI-019/020 · E-A06-REFUSE-002/003 · E-BUILD-003 |
| 3 | تصنيف بقية الأزرار المحكومة (الاجتماعات · المحاضر · المستندات) بالنمط نفسه | **جزئية هذه الدفعة**: المحاضر · الاجتماعات · الأجندة (D-018…D-024) · المتبقي: المستندات · إعدادات اللجنة · مركز التقارير | E-D002-INV-001 · E-A12-REG-002…006 · E-BUILD-004/005 |
| 4 | P1-03 (الأسماء والأنواع والطوابير) · P1-04 (عدسة المراجع) · P1-05 (منشأ البيانات) | تالية | — |

### جرد الكتابات المحكومة من الواجهة (E-D002-INV-001 — من المصدر لا من الواجهة)
| السطح | ما كان يُكتب من المتصفح | الأمر المحكوم المتاح | الحالة |
|---|---|---|---|
| `MinutesManager` | حالة المحضر · الاعتماد · التوقيع · الحضور · سجل تدقيق · نص المحضر | `CertifyAttendance` · `SignRecord` · `ApproveMinutes` | **مُحوَّل** (المحتوى فقط بلا أمر مقعدي) |
| `MeetingDetail` | — (صفر كتابة محكومة من المتصفح بعد الدفعة) | `StartMeeting` · `AdjournMeeting` · `CancelMeeting` · `CreateDecisionDraft` · `GenerateMeetingInstances` | **مُحوَّل** (D-021) |
| `AgendaManager` | `AgendaItem.delete` فقط — إداري بقاعدة السجل | `SubmitAgendaItem` · `EvaluateAgendaReadiness` | **مُحوَّل** (D-022 · D-024) |
| `DecisionDocuments` | `Document.update` | `SubmitCommitteeRecord` · `PublishCommitteeRecord` | متبقٍّ |
| `CommitteeSettings` · `CommitteeMandate` · `CommitteeGovernanceRules` | `Committee.update` | `TransitionCommitteeStatus` · `RenewCommittee` · `UpdateCommitteeFormation` | متبقٍّ |
| `ReportCenter` · `lib/documentEngine` | `ProductInstance.update` | `GenerateProduct` · `VerifyProductInstance` | متبقٍّ |
| إشعارات وتكوين (`NotificationOutbox` · `NotificationTemplate` · `NotificationPreference` · `OrganizationAsset` · `OrganizationMembership`) | إدارة تكوين ومطالعة | لا أوامر لجنة لهذه الأسطح | خارج نواة اللجنة — تُصنَّف كتابة تكوين لا حكم |

**أثر بيانات الشريحة 2**: كيان جديد واحد (`EligibleVoterSnapshot`) يُكتب **فقط** عند فتح تصويت — لا كتابة على أي سجل قائم، ولا إعادة بذر، ولا حذف. `CastVote` صار يرفض بصوت بلا دورة مجمّدة (D-017)، و`IssueDecision` يسمّي أساس هيئته صريحًا.

## و. قيود منصة مؤكدة (لا تُحاكى)
1. لا معاملة (transaction) حقيقية على مستوى المخزن: تُستخدم مطالبة انتقال فريدة + قارن-وبدّل، ويُعلن مستوى الضمان بدقة ولا يُدّعى الأقوى.
2. سكربتات `scripts/*.mjs` لا تُنفَّذ من بيئة البناء: الفحص الثابت يُدار يدويًا، والجرد اشتُقّ بالتعداد المعلن.
3. لا اختبار تزامن فعلي من بيئة البناء.
4. `auth.me()` لا يستطيع فرض حالة تحقق البريد إداريًا (سابقًا).
5. لا وسيط خطوة-تصعيد (step-up) للمخاطر العالية.

## د. قائمة تحقق النشر والتراجع
- لا إجراء نشر مصرّح به في هذا الموجز. أي نشر = قرار مالك منفصل.
- التراجع: إعادة الملفات المذكورة في `EVIDENCE_LEDGER.md` (قائمة التغييرات) إلى نسختها السابقة.
- **أثر البيانات لهذه الدفعة: لا ترحيل هدّام، ولا كتابة على أي سجل قائم، ولا إعادة بذر.** الكيان الجديد `IssueSnapshot` فارغ.