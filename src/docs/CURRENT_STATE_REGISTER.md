# CURRENT_STATE_REGISTER — LIJAN™ Baseline (Phase 0)

> Machine-maintained register. Generated 2026-10-13 from the live source tree.
> This is the atomic denominator for the readiness program: every requirement is mapped
> against the entries below before any change is planned.

## 1. Routes (src/App.jsx)
- Public: `/` (EntryPortal), `/explore`, `/explore/:personaSlug`, `/create-portal`,
  `/governance-policies`, `/sovereign-standards`, `/committees-registry`, `/ai-register`,
  `/platform-specification`, `/verify/:type/:id`, `/guest/:token`, `/extract/:token`.
- Auth: `/login`, `/register`, `/forgot-password`, `/reset-password`.
- Org portal (Level 2, ProtectedRoute + OrgLayout): `/o/:orgRef`, `/o/:orgRef/committees`,
  `/o/:orgRef/notifications`, `/o/:orgRef/admin`, `/o/:orgRef/create-committee`.
- Committee workspace (Level 3, ProtectedRoute + CommitteeLayout): 40+ surfaces under
  `/o/:orgRef/c/:committeeRef/...` (members, formation, meetings, agenda, packs,
  attendance, documents, minutes, voting, decisions, legislative-file, actions, evidence,
  reports, memory, ai, audit, mandate, governance-rules, integrations, notifications,
  closure, settings, products, documentation, workstreams, hubs).
- Admin/oversight: `/organization-assets`, `/activity-log`, `/audit-trail`,
  `/minutes-archive`, `/notification-preferences`, `/national-adoption-showcase`,
  `/profile`, `/founder-vault`.
- Legacy redirects: `/dashboard`, `/committees`, `/decisions`, `/minutes`, `/execution`,
  `/calendar`, `/memory`, `/ai-ledger`, `/dependencies`, `/scenarios`, `/integrations`,
  `/admin/*`, `/committees/:id`, `/meetings/:id`, `/decisions/:id`, `/institutions/new`,
  `/dr-hamad-experience/*`.
- Catch-all: `*` → PageNotFound.

## 2. Page components (src/pages/**)
EntryPortal, ExploreGateway, ExploreSession, CreatePortal, Profile, FounderVault,
Login, Register, ForgotPassword, ResetPassword, OrgPortal, OrgCommittees,
OrgNotifications, OrgAdmin, CommitteeCreateV2, committee/* (CommitteeHome, Members,
Formation, Establishment, FormationHistory, Amendments, Roles, Delegations, Alternates,
Recusals, Calendar, Agenda, Packs, Attendance, Documents, DocumentDetail, Minutes,
Signatures, Decisions, LegislativeFileDetail, Actions, Voting, Evidence, Dependencies,
Escalations, Risks, Reports, Memory, AI, Audit, Mandate, GovernanceRules, Integrations,
Notifications, Closure, Settings, ProductCatalog, Workstreams, WorkstreamDetail,
LegislativeFiles, ReportCenter, CommitteeStructure, CommitteeMeetings, CommitteeHandover,
CommitteeAppointments, hubs/*), MeetingDetail, DecisionDetail, MinutesArchive,
NotificationPreferences, VerifyRecord, GuestItemView, ActionExtractView, GovernancePolicies,
SovereignStandards, ActivityLog, AuditTrail, PublicCommittees, PublicAIRegister,
PlatformSpecification, NationalAdoptionShowcase, OrganizationAssetsAdmin.
Approximate count: ~75 pages.

## 3. Shared components
- `src/components/raqeem/*` — PageHeader, StatusBadge, EmptyState, BrandLogo, SplashScreen,
  OrgLayout, CommitteeLayout, LoadingSkeleton, AIFeedbackPanel, AIAccountabilityPanel,
  AIGovernancePostureBanner, AISystemInventoryPanel, AgendaManager, MinutesManager,
  AttendancePanel, AttendancePanel, CirculationPanel, RatificationPanel, DecisionWorkflow,
  LiveVotingWidget, ProofChain*, IssuanceIntegrityPanel, ProposalIntegrityPanel,
  ActionEvidencePanel, ActionExtractPanel, DossierExportPanel, AuditChainPanel,
  RetentionPanel, PrincipalBasisPanel, SeatedReadinessPanel, RegisterStatePanel,
  ExplorationNotice, LocalizedField, LocalizedDatePicker, CalendarSyncButton,
  OutlookSyncButton, MyWorkInbox, WorkInbox, ChairBrief, SecretaryOperations,
  InstitutionalTimeMachine, MetricsPanel, MeetingInsightsPanel, ParticipationMatrixPanel,
  RecordRiskPanel, ExceptionCataloguePanel, ConsistencyCheckPanel, ChangeInventoryPanel,
  RoundEffectPanel, SovereignCard, FormationAndAmendments, FormationImpactPreview,
  SignaturePad, SecureFileLink, SecureFileImage, LocalizedFileUpload, EntitySearchSelect,
  CommitteeActivationPanel, CommitteeLogoSection, CommitteeHubTabs, NextActionCard,
  NoticeDeliveryStatus, NotificationCenter, EscalationAction, CrudFormDialog,
  AmendmentFormBuilder, FormationDiff, LivingProductDelta, GenerateWizard, ProductViewer,
  PackDraftPanel, SilentFailureRadar, MemoryReviewPanel, MemorySectionRenderer,
  PreflightChecklist, PasswordInput, QRCode, SmartFormAssist, RecurrenceConfig,
  StickyPageNav, TraceabilityMatrix, CompletionLedger, AuthorityLens, UnifiedWorkspace,
  VaultEntryForm, AgentChatPanel, admin/* (AdminEditMode, AdminVersionHistory, AdminEditForm),
  homes/* (Chair/Member/Secretary/Observer HomeEnhanced), annotations/*.
- `src/components/nav/*` — AppShell, AppSidebar, SidebarNav, SidebarBottom,
  SidebarContextCard, SidebarSkeleton, useSidebarShell.
- `src/components/ui/*` — full shadcn/ui primitive set (button, card, dialog, table, etc.).
- `src/components/brand/*` — BrandWordmark, PoweredByConnection.
- `src/components/workgroups/*` — WorkGroupCard, DecisionActionBoard, etc.
- `src/components/demo/*` — ExplorationGate, PersonaContextPath, RoleLensSection, etc.

## 4. Entities (base44/entities/*.jsonc)
Full schemas in context: LegislativeFile, HearingSession, LegislativeProfile, AISystem,
AIIncident, AIOutputLedger, RatificationRecord, RatificationRoute, RetentionRule,
CirculationRound, EligibleVoterSnapshot, ChangeDisposition, ActionExtractGrant,
ActionClarification, IssueSnapshot, MembershipEffectPolicy, Action, CirculationResponse,
Annotation, AgendaItemGuest.
Other entities (90+): Organization, Committee, CommitteeMembership, CommitteeRelationship,
SeatAppointmentEvent, HandoverPack, HandoverItem, DemoPersonaProfile, Decision,
TransitionClaim, Attendance, Vote, Recusal, Delegation, ConflictDeclaration,
ShowcaseSession, NotificationOutbox, ReviewRequest, Document, ProductInstance, AgendaItem,
Meeting, AuthorityGrant, Initiative, EvidenceSubmissionEntry, AuthorityDelegation,
CrossEntityDependency, CommitteeAmendment, MeetingMinutes, CommitteeMandate,
TranslationGap, Workstream, OrganizationAsset, WorkstreamMembership,
DocumentationDownloadLog, DocumentationAsset, DocumentationRelease, AuditEvent,
ExternalReference, FounderVaultEntry, OrganizationMembership, FeatureFlag,
ProductTemplate, NotificationTemplate, NotificationPreference, IntegrationConfig,
OrganizationDirectory, OrganizationAccessRequest, RoleDefinition,
PageConfigurationVersion, PageConfiguration, PolicyScenario, ExtractedInstrumentField,
AmendmentReviewStage, InstrumentVersion, AIExtractionJob, OrganizationPortal, AuditLog,
CommitteeMember, Signature, CommitteeFormationVersion, FoundingInstrument,
MemberAcknowledgement, BrandTheme, Deliberation, ReviewResponse, QuorumRule, MeetingPack,
Representation, DocumentVersion, AgendaItemEvidenceRequirement, SharedComment,
DocumentAccessGrant, VotingRule, MandateReference, CommitteeLifecycleEvent, Institution,
NotificationConfig, GovernanceConfig, BreakGlassAccess, Invitation, UserProfile,
AlternateActivation, RoleAssignment, OrganizationVerification, User (built-in).
Approximate total: ~110 entities.

## 5. Backend functions (base44/functions/**)
Count: ~210 functions (full list in developer context). Governance-critical command sites:
CreateCommittee, ActivateCommittee, SuspendCommittee, CloseCommittee, RenewCommittee,
InviteCommitteeMember, EndCommitteeMembership, DelegateAuthority, ActivateAlternate,
RecordRecusal, DeclareConflict, OpenCirculation, RecordCirculationResponse,
FinalizeCirculation, OpenVote, CastVote, CloseVote, IssueDecision, TransitionDecision,
SignRecord, ApproveMinutes, TransitionMinutes, SubmitActionEvidence, ReviewActionEvidence,
CloseAction, AuthorizeCommitteeAction, RecordRatification, SetRatificationRoute,
SetRetentionRule, SetCirculationPolicy, SetMembershipEffectPolicy, SetPrincipalBasis,
OpenLegislativeFile, TransitionLegislativeFile, UpdateLegislativeReport,
PublishCommitteeRecord, SupersedeOfficialRecord, ReturnCommitteeRecordForCorrection,
ArchivePermittedRecord, InitiateHandover, AcceptHandover, CreateCommitteeRelationship,
RecordAppointmentEvent, RecordChangeDisposition, RegisterAISystem, RecordAIIncident,
RecordAIFeedback, RespondToActionExtract, AnswerActionClarification, InviteAgendaItemGuest,
EnterOrganizationPortal, JoinOrganization, AdministerOrganizationMembership,
SetOrganizationStatus, ResolveOrganizationIdentity, MergeDuplicateOrganizations.
Governed-read/query: GetCommitteeRecord, GetLegislativeFile, GetCirculationState,
GetRatificationState, GetRetentionState, GetPrincipalBasis, GetDecisionDossier,
GetDecisionEffectState, GetParticipationMatrix, GetSeatedActorReadiness,
GetSovereignStandards, GetAIAccountabilityReport, GetPublicAIRegister,
GetCommitteeCapabilities, GetCommitteeMetrics, GetGovernanceSurfaces,
GetRecordAuditTrail, GetMyWork, GetMyOrganizations, GetOrganizationPortal.
Audit/logging: LogInstitutionalExport, LogAmeenAction, LogFileAccess,
LogDocumentationDownload.

## 6. Agents (base44/agents/**)
- `ameen.jsonc` — production AMEEN institutional intelligence agent.
- `ameen_demo.jsonc` — exploration/demo AMEEN (read-scoped).

## 7. Integrations / connectors
- Workspace-registered OAuth connectors: `outlook` (Outlook Calendar, id 6abe5970bddfed2e7caa5cda),
  `googlecalendar` (Calendar, id 6a40f423404d169cb3344836). Both connector_mode: all.
- No app connectors currently authorized.
- Core integrations (always available): InvokeLLM, TranscribeAudio, SendEmail,
  SendPushNotification, UploadPublicFile, UploadPrivateFile, CreateFileSignedUrl,
  GenerateImage, GenerateSpeech, GenerateVideo, ExtractDataFromUploadedFile.
- Integration posture field on LegislativeProfile: connected | configured_not_connected |
  awaiting_technical_integration | manual_governed_handoff | integration_unavailable.

## 8. Document generators / export paths
- Central engine: `src/lib/institutionalExportEngine.js` (entry: `exportInstitutionalDocument`).
  Renderers: `exportPdfRenderer.js` (html2canvas→jsPDF), `exportDocxRenderer.js` (docx),
  `exportRenderers.js` (XLSX via exceljs), CSV inline.
- Content model: `src/lib/exportContent.js` (legislative_dossier, product_document,
  committee_minutes, generic).
- Template registry: `src/lib/exportTemplates.js` (13 product types).
- Legacy print path: `src/lib/documentEngine.js` (printProduct browser print +
  generateAndUploadPDF now routed through the engine as `product_document`).
- Audit: `LogInstitutionalExport` backend function (records every export).
- Brand resolution: `resolveBrandAssets` (OrganizationAsset logo → tri-logo lockup).
- Migrated surfaces: LegislativeReportPanel (legislative_dossier PDF/DOCX),
  CommitteeMinutes (committee_minutes PDF/DOCX), MyWorkInbox (personal_work_report XLSX + CSV).
- Pending migration: agenda_pack, decision_resolution, attendance_quorum, action_tracking,
  audit_traceability, work_group_report, executive_report, institutional_dataset.

## 9. Authority checks / role maps / membership queries
- Authority kernel: `base44/shared/authorityKernel.ts`, `capabilityKernel.ts`,
  `committeeAuth.ts`, `commandGuard.ts`, `governedReadPolicy.ts`, `governedInvoke.js`.
- Client capability hook: `useCommitteeAdmin` (canManageGovernance, canManageMinutes,
  canManageExecution, etc.) backed by `GetCommitteeCapabilities`.
- Effective actor: `src/lib/EffectiveActorContext.jsx` (demo persona vs real user).
- RLS: per-entity `rls` blocks (owner-org-or-admin pattern dominant; append-only on
  RatificationRecord, IssueSnapshot).
- Seat → membership → person separation: CommitteeMembership, SeatAppointmentEvent,
  Delegation, AlternateActivation, Recusal, HandoverPack.

## 10. Known data state
- Production has zero LegislativeFile records (confirmed 2026-10-13).
- Dr Hamad demo data: provisioned via ProvisionDrHamadDemoData / RepairDrHamadDemoExperienceV3;
  seven memberships, one person, one primary organization (Qatar Development Bank).