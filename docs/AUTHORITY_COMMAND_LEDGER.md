# سجل مواضع الأوامر — ليان™ | AUTHORITY COMMAND LEDGER

> ملف مُولَّد — لا يُحرَّر يدويًا. المصدر: `scripts/authority-guardrails.mjs` · الإصدار `authz-1.1.0`

- مواضع الأوامر المكتشفة: **51**
- على المسار المحروس: **16**
- تلميح لجنة فقط (بدون سجل مستهدف): **35**
- كتابة محكومة بحق قراءة: **0**
- مطابقة بالاسم: **0**

### التداخل

- اتحاد المواضع التي تحتاج عملًا: **35** موضعًا فريدًا
- تلميح ∩ محكوم بقراءة: 0 — —
- تلميح ∩ مطابقة بالاسم: 0 — —
- محكوم بقراءة ∩ مطابقة بالاسم: 0 — —

### الجرد

| ID | الوظيفة | العملية | يكتب؟ | الأصل الموثوق | الفعل المطلوب | الحارس | تطابق بالاسم؟ | محكوم بقراءة؟ | الحالة |
|---|---|---|---|---|---|---|---|---|---|
| CMD-01 | `CastVote` | vote.cast | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-02 | `CloseVote` | vote.call (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-03 | `CreateDecisionDraft` | agenda.propose (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-04 | `IssueDecision` | decision.issue (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-05 | `OpenVote` | vote.call (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-06 | `AdjournMeeting` | meeting.start (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-07 | `ApproveCommitteeAmendment` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-08 | `ApproveMinutes` | minutes.approve | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-09 | `CancelMeeting` | meeting.schedule (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-10 | `CertifyAttendance` | attendance.certify | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-11 | `CreateMeeting` | meeting.schedule (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-12 | `GenerateMeetingInstances` | meeting.schedule (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-13 | `PublishMeetingPack` | agenda.edit (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-14 | `StartMeeting` | meeting.start | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-15 | `ConfirmExtractedInstrumentFields` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-16 | `CreateCommitteeDraftFromInstrument` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-17 | `ExtractInstrumentData` | instrument.extract | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-18 | `RequestReview` | minutes.draft (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-19 | `RespondToReview` | review.respond | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-20 | `ReviewActionExtension` | action.admin (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-21 | `UploadDocumentVersion` | agenda.edit (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-22 | `UploadFoundingInstrument` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-23 | `ActivateAlternate` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-24 | `AuthorizeCommitteeAction` | read (تلميح فقط) | لا | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-25 | `CloseAction` | action.close | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-26 | `DeclareConflict` | conflict.declare | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-27 | `DelegateAuthority` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-28 | `ExtendTerm` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-29 | `ProcessEscalation` | action.admin (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-30 | `RecordRecusal` | recusal.record | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-31 | `RequestActionExtension` | action.progress | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-32 | `RetryEscalationNotice` | action.admin (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-33 | `UpdateActionProgress` | action.progress | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-34 | `CompileCommitteeMemory` | committee.view (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-35 | `GenerateInstitutionalMemory` | committee.close (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-36 | `ActivateCommittee` | committee.activate (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-37 | `CloseCommittee` | committee.close (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-38 | `EndCommitteeMembership` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-39 | `InviteCommitteeMember` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-40 | `ProposeCommitteeAmendment` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-41 | `RenewCommittee` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-42 | `SuspendCommittee` | committee.activate (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-43 | `TransitionCommitteeStatus` | committee.activate (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-44 | `EvaluateAgendaReadiness` | agenda.evaluate | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-45 | `NotifyAffectedMembers` | amendment.notify | نعم | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-46 | `RespondToInvitation` | attendance.respond | نعم | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-47 | `shared/authorityKernel.ts` | read (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-48 | `shared/commandGuard.ts` | — | لا | سجل مستهدف | — | authorizeCommand | لا | لا | مهاجر |
| CMD-49 | `SubmitAgendaItem` | agenda.propose (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
| CMD-50 | `TestAuthorizationGuard` | read | لا | تلميح لجنة | — | authorizeCommand | لا | لا | مهاجر |
| CMD-51 | `TransitionAmendmentStatus` | committee.manage (تلميح فقط) | نعم | تلميح لجنة | مرِّر السجل المستهدف عبر authorizeCommand | — | لا | لا | قيد الترحيل |
