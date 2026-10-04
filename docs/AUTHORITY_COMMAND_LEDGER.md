# سجل مواضع الأوامر — ليان™ | AUTHORITY COMMAND LEDGER

> مُولَّد من المصدر. الإصدار المجمّد: **`authz-1.2.0-rc.1`** · بصمة النواة `db0bb981…aa17` · البصمة المجمّعة `37adfedc…9113` · البناء `2026-10-04T12:35:37Z`.
> طريقة التوليد هذه الجولة: تعداد ثابت على `base44/functions` (كل ملف يستدعي الحارس أو يكتب) + فحص الاستدعاء المباشر للنواة.
> **ملاحظة تنفيذية**: سكربتات `scripts/*.mjs` لا تُنفَّذ من بيئة البناء الحالية، لذلك أُنتج الجرد بهذا التعداد وأُدرج هنا — لا ادّعاء بتشغيل السكربت.

## الأرقام

| المقياس | القيمة |
|---|---:|
| مواضع أوامر اللجان المكتشفة (تستدعي الحارس) | **54** |
| على المسار المحروس (سجل مستهدف عبر `authorizeCommand`) | **54** |
| تلميح لجنة فقط (بدون سجل مستهدف) | **0** |
| كتابة محكومة بحق قراءة | **0** |
| مطابقة بالهوية بالاسم | **0** |
| مطالبات حصرية (مطالبة قبل الكتابة) | **10 مواضع** |
| قارن-وبدّل على مراجعة الحالة | `ProcessEscalation` (`escalation_revision`) |
| مواضع قراءة/اختبار تستدعي النواة مباشرة ولا تكتب | `AuthorizeCommitteeAction` · `TestAuthorizationGuard` |
| اتحاد مواضع أوامر اللجان التي تحتاج عملًا | **0** |

## مواضع أوامر اللجان (54/54)

### A1 — القرارات والتصويت والتوقيع
`CreateDecisionDraft` (Meeting/Committee) · `OpenVote` → Decision `vote.call` (بوابة: draft/under_review/proposed/pending) · `CastVote` → Decision `vote.cast` + مطالبة `vote.cast:<decision>:<actor>` · `CloseVote` → Decision `vote.certify` (بوابة: voting) + مطالبة `vote.certify:<decision>` · `IssueDecision` → Decision `decision.issue` (approved/draft/proposed/issued/executing) + مطالبة `decision.issue:<decision>` · `SignRecord` → Document/Decision/MeetingMinutes/Action `decision.sign_image` + مطالبة `decision.sign_image:<doc>:<actor>:<intent>` · `AcknowledgeCommitteeChange` → CommitteeAmendment `amendment.acknowledge` (حق ذاتي على المقعد).

### A2 — الاجتماعات والحضور والنصاب والمحاضر
`CreateMeeting` (Committee، إنشاء) · `GenerateMeetingInstances` → Meeting · `StartMeeting` → Meeting `meeting.start` (scheduled) · `AdjournMeeting` → Meeting `meeting.adjourn` (in_progress) · `CancelMeeting` → Meeting `meeting.cancel` (scheduled/in_progress) · `PublishMeetingPack` (Committee، إنشاء) · `SubmitAgendaItem` (Meeting/Committee، إنشاء) · `EvaluateAgendaReadiness` → AgendaItem (pending/deferred) · `RespondToInvitation` → Meeting `attendance.respond` · `CertifyAttendance` → Meeting `attendance.certify` · `DeclareConflict` → Committee · `RecordRecusal` → Committee · `ApproveMinutes` → MeetingMinutes `minutes.approve` (draft/in_review) + مطالبة `minutes.approve:<minutes>` · `RequestReview` → Document `minutes.draft` (إنشاء + احتواء نسخة) · `GenerateMeetingMinutes` → Meeting `minutes.draft`.

### A3 — المستندات والمراجعة والإصدارات
`UploadDocumentVersion` → Document/Committee `agenda.edit` + مطالبة `document.version:<doc>` · `UploadFoundingInstrument` (Committee، إنشاء) · `ExtractInstrumentData` → FoundingInstrument `instrument.extract` · `ConfirmExtractedInstrumentFields` → FoundingInstrument · `CreateCommitteeDraftFromInstrument` → FoundingInstrument · `RespondToReview` → ReviewRequest `review.respond` + مطالبة `review.respond:<request>:<actor>` · `ReviewMemoryRecord` → AIOutputLedger `minutes.review`/`minutes.approve`.

### A4 — الإجراءات والتنفيذ والتصعيد
`UpdateActionProgress` → Action `action.progress` (مقيّد بالفاعل) · `RequestActionExtension` → Action · `ReviewActionExtension` → Action `action.admin` · `CloseAction` → Action `action.close` (بوابة الحالة) + مطالبة `action.close:<action>` · `ProcessEscalation` → Action `action.admin` + قارن-وبدّل · `RetryEscalationNotice` → Action · `NotifyAffectedMembers` → CommitteeAmendment `amendment.notify`.

### A5 — المنتجات والتقارير والذاكرة
`GenerateProduct` (Committee، إنشاء) + مطالبة `product.generate:<committee>:<type>:<source>` · `CompileCommitteeMemory` → Committee `memory.compile` · `GenerateInstitutionalMemory` → Committee `memory.compile` · `GeneratePolicyScenarioAI` → Committee `agenda.propose`.

### A6 — الإدارة والعمليات
`ActivateCommittee` (draft/pending_activation) · `SuspendCommittee` `committee.manage` · `TransitionCommitteeStatus` `committee.manage` · `CloseCommittee` (active/closing/suspended/expiring) · `RenewCommittee` · `ExtendTerm` · `DelegateAuthority` (إنشاء) · `ActivateAlternate` → Seat · `EndCommitteeMembership` → Seat · `InviteCommitteeMember` (إنشاء) · `ProposeCommitteeAmendment` (إنشاء) · `ApproveCommitteeAmendment` → Amendment · `TransitionAmendmentStatus` → Amendment.

## كتابات خارج نطاق اللجنة (24) — كل واحدة بوابتها الخاصة، لا نواة اللجنة

هذه ملفات تكتب ولا تستدعي حارس اللجنة. لا شيء منها يأخذ دورًا أو صلاحية من العميل؛ وهي ليست مواضع أوامر لجان، لكنها **مفتوحة كديون تصنيف** حتى تُغلق كل واحدة ببوابتها الصحيحة.

| الحدود | الوظائف | الحالة |
|---|---|---|
| نظام/مجدول (بلا فاعل تفاعلي) | `ApplyScheduledAmendments` · `RunExecutionReminders` · `RunAmeenExecutionFollowUp` | تُستدعى من سير عمل — تحتاج بوابة منشأ التشغيل |
| خدمة ذاتية على سجلات المتصل نفسه | `JoinOrganization` · `RequestOrganizationAccess` · `RequestFileAccess` · `EnterExploration` · `LogFileAccess` · `LogAmeenAction` · `LogDocumentationDownload` · `GetMyOrganizations` · `ResolveAmeenContext` | تحتاج تقييدًا صريحًا بالفاعل (actor-bound) |
| إدارة المنصة (إعداد الصفحات والنشر) | `SavePageConfigurationDraft` · `PublishPageConfiguration` · `RestorePageConfigurationVersion` · `ResetPageConfigurationToOrganization` · `PublishDocumentationRelease` | نطاق منصة، لا نطاق لجنة |
| تكامل خارجي (مزامنة تقويم) | `SyncMeetingToCalendar` · `SyncMeetingToOutlook` | بوابة تكامل + منشأ |
| جلسة عرض تجريبية | `IssueShowcaseSession` · `RevokeShowcaseSession` | `write_scope` مغلق |
| تأسيس على مستوى المؤسسة | `CreateCommittee` | **أقرب فجوة**: يتحقق من ملكية المؤسسة على الخادم (عضوية owner/admin) لكنه لا يمر بالنواة بعد — نطاق مؤسسة لا نطاق لجنة |
| مساعدات صياغة (لا تُنتج سجلًا مؤسسيًّا) | `ExtractCommitteeCharter` · `GenerateCommitteeGovernance` | مخرجات صياغة + قيد سجل الذكاء الاصطناعي |

## غير مغلق
- **اختبار التزامن الفعلي**: لم تُقَس طلبات متزامنة حقيقية من بيئة البناء. الآلية مُنفَّذة (10 مطالبات + قارن-وبدّل)، لكنها **NOT ESTABLISHED** حتى تُقاس.
- **الكتابة التجريبية**: مغلقة — بوابة المرحلة D تشترط بند التزامن.
- **قبول المتصفح**: غير مُختبر من بيئة البناء.
- **الديون أعلاه (24)**: تصنيف بوابات خارج نطاق اللجنة.