# سجل مواضع الأوامر — ليان™ | AUTHORITY COMMAND LEDGER

> ملف مُولَّد آليًا — لا يُحرَّر يدويًا. المصدر: `scripts/authority-guardrails.mjs`.
> يُعاد توليده عند كل تشغيل للفحص الثابت، ويطابق النسخة `authz-1.1.0`.

- مواضع الأوامر المكتشفة: **126**
- على المسار المحروس (`authorizeCommand` + سجل مستهدف): **81**
- تلميح لجنة فقط (بدون سجل مستهدف): **42**
-كتابة محكومة بحق قراءة: **0**
- مطابقة بالاسم: **0**
- أفعال برمز قدرة (خارج مسار الأوامر بالتصميم: الرمز هو السلطة، والفعل محدود بصفّه): **3**

### التداخل (لا تُجمع القوائم كأنها مواضع فريدة)

- اتحاد المواضع التي تحتاج عملًا: **42** موضعًا فريدًا
- «تلميح فقط» ∩ «محكوم بقراءة»: 0 — —
- «تلميح فقط» ∩ «مطابقة بالاسم»: 0 — —
- «محكوم بقراءة» ∩ «مطابقة بالاسم»: 0 — —
- الثلاثة معًا: 0

### الجرد

| ID | الوظيفة | العملية | يكتب؟ | الأصل الموثوق | الفعل المطلوب | الحارس | تطابق بالاسم؟ | محكوم بقراءة؟ | الحالة |
|---|---|---|---|---|---|---|---|---|---|
| CMD-01 | `CastVote` | vote.cast | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-02 | `CloseVote` | vote.certify | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-03 | `CreateDecisionDraft` | decision.propose | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-04 | `IssueDecision` | decision.issue | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-05 | `IssueShowcaseSession` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-06 | `OpenVote` | vote.call | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-07 | `SignRecord` | decision.sign_image | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-08 | `TransitionDecision` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-09 | `AdjournMeeting` | meeting.adjourn | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-10 | `ApproveCommitteeAmendment` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-11 | `ApproveMinutes` | minutes.approve | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-12 | `CancelMeeting` | meeting.cancel | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-13 | `CertifyAttendance` | attendance.certify | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-14 | `CreateMeeting` | meeting.schedule | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-15 | `GenerateMeetingInstances` | meeting.schedule | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-16 | `GenerateMeetingMinutes` | minutes.draft | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-17 | `PrepareMinutes` | minutes.draft | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-18 | `PublishMeetingPack` | agenda.edit | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-19 | `StartMeeting` | meeting.start | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-20 | `SyncMeetingToCalendar` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-21 | `SyncMeetingToOutlook` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-22 | `TransitionMinutes` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-23 | `AnnotateDocument` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-24 | `ConfirmExtractedInstrumentFields` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-25 | `CreateCommitteeDraftFromInstrument` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-26 | `ExtractInstrumentData` | instrument.extract | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-27 | `LogDocumentationDownload` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-28 | `PublishDocumentationRelease` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-29 | `RequestReview` | minutes.draft | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-30 | `RespondToReview` | review.respond | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-31 | `ReviewActionEvidence` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-32 | `ReviewActionExtension` | action.admin | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-33 | `ReviewMemoryRecord` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-34 | `UploadDocumentVersion` | agenda.edit | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-35 | `UploadFoundingInstrument` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-36 | `ActivateAlternate` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-37 | `AnswerActionClarification` | action.admin | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-38 | `CloseAction` | action.close | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-39 | `DeclareConflict` | conflict.declare | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-40 | `DelegateAuthority` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-41 | `ExtendTerm` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-42 | `GetActionExtractView` | read (تلميح فقط) | نعم | تلميح لجنة | — | — | لا | لا | رمز قدرة |
| CMD-43 | `ListActionExtracts` | action.admin | لا | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-44 | `LogAmeenAction` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-45 | `ProcessEscalation` | action.admin | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-46 | `RecordRecusal` | recusal.record | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-47 | `RequestActionExtension` | action.progress | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-48 | `RespondToActionExtract` | read (تلميح فقط) | نعم | تلميح لجنة | — | — | لا | لا | رمز قدرة |
| CMD-49 | `RetryEscalationNotice` | action.admin | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-50 | `ShareActionExtract` | action.admin | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-51 | `SubmitActionEvidence` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-52 | `UpdateActionProgress` | action.progress | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-53 | `CompileCommitteeMemory` | memory.compile | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-54 | `GenerateCommitteeGovernance` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-55 | `GenerateInstitutionalMemory` | memory.compile | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-56 | `GeneratePolicyScenarioAI` | agenda.propose | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-57 | `GenerateProduct` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-58 | `AcknowledgeCommitteeChange` | amendment.acknowledge | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-59 | `ActivateCommittee` | committee.activate | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-60 | `CloseCommittee` | committee.close | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-61 | `CreateCommittee` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-62 | `CreateCommitteeRelationship` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-63 | `EndCommitteeMembership` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-64 | `ExtractCommitteeCharter` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-65 | `GetMyOrganizations` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-66 | `ImportOrganizationAsset` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-67 | `ImportOrganizationAssetPack` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-68 | `InviteCommitteeMember` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-69 | `JoinOrganization` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-70 | `LogFileAccess` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-71 | `MergeDuplicateOrganizations` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-72 | `PreviewGuestAccess` | read | لا | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-73 | `ProposeCommitteeAmendment` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-74 | `ProvisionCommitteeOperationalData` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-75 | `ProvisionOrganizationPortal` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-76 | `PublishPageConfiguration` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-77 | `RenewCommittee` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-78 | `RequestFileAccess` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-79 | `RequestOrganizationAccess` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-80 | `ResetPageConfigurationToOrganization` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-81 | `RestorePageConfigurationVersion` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-82 | `SavePageConfigurationDraft` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-83 | `SuspendCommittee` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-84 | `TransitionCommitteeStatus` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-85 | `AcceptHandover` | seat.handover_accept | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-86 | `ApplyScheduledAmendments` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-87 | `ArchiveAgendaItem` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-88 | `CompileChangeInventory` | committee.manage | لا | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-89 | `EnterExploration` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-90 | `EvaluateAgendaReadiness` | agenda.evaluate | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-91 | `FinalizeCirculation` | circulation.finalize | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-92 | `GetGovernanceSurfaces` | read | لا | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-93 | `GetGuestItemView` | read (تلميح فقط) | نعم | تلميح لجنة | — | — | لا | لا | رمز قدرة |
| CMD-94 | `GetRecordAuditTrail` | read | لا | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-95 | `GetSeatedActorReadiness` | read | لا | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-96 | `InitiateHandover` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-97 | `InviteAgendaItemGuest` | agenda.edit | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-98 | `NotifyAffectedMembers` | amendment.notify | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-99 | `OpenCirculation` | circulation.open | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-100 | `ProvisionDrHamadDemoData` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-101 | `ProvisionFahadDemoData` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-102 | `RecordAppointmentEvent` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-103 | `RecordChangeDisposition` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-104 | `RecordCirculationResponse` | circulation.respond | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-105 | `RepairDrHamadDemoExperienceV3` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-106 | `ResolveAmeenContext` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-107 | `RespondToInvitation` | attendance.respond | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-108 | `RevokeShowcaseSession` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-109 | `RunAmeenExecutionFollowUp` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-110 | `RunExecutionReminders` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-111 | `SeedNSDCShowcase` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-112 | `SetCirculationPolicy` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-113 | `SetMembershipEffectPolicy` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-114 | `shared/amendmentApplier.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-115 | `shared/emailEngine.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-116 | `shared/formationVersioner.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-117 | `shared/notificationEngine.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-118 | `shared/recordGovernance.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-119 | `shared/showcaseSession.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-120 | `shared/signatureEngine.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-121 | `shared/transitionClaim.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-122 | `SubmitAgendaItem` | agenda.propose | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-123 | `TestAuthorizationGuard` | read | لا | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-124 | `TestShowcaseIsolation` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-125 | `TransitionAgendaItem` | — | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-126 | `TransitionAmendmentStatus` | committee.manage | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
