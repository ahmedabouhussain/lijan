# INTERACTION_CONTRACT_REGISTRY — LIJAN™ Baseline (Phase 0)

> Stable IDs: `I-###` (interaction). Every user-visible control must have one of:
> A. executes a real authorized function → verifiable result; B. navigates to an
> accessible target; C. disabled with a localized reason; D. hidden (no capability);
> E. marked unavailable (external dependency missing).
> Forbidden: dead buttons, decorative-as-functional, links to missing objects, silent
> failures, zero-on-denied-read, generate-without-artifact, review-card-without-version.

## Outcome legend
A=executes · B=navigates · C=disabled(reason) · D=hidden · E=unavailable(dep)

## Interaction inventory (representative governed controls; full per-surface audit is
## the Phase 1 browser-acceptance input)
| ID | Surface (route) | Control | Outcome | Target/command | Capability | State precondition | Loading | Duplicate guard | Persisted result | Audit | Defect |
|----|-----------------|---------|---------|----------------|------------|--------------------|---------|-----------------|------------------|-------|--------|
| I-001 | CommitteeFormation (R-032) | "Propose a Change" buttons | B | navigate `/amendments?type=` | governance.propose | committee active | n/a | n/a | none (nav) | none | — |
| I-002 | CommitteeFormation (R-032) | Amendment status badge | A(render) | render via AMENDMENT_STATUS | read | — | — | — | — | — | D-135 fixed |
| I-003 | CommitteeDecisions (R-050) | "New decision draft" | A | CreateDecisionDraft | decision.propose | committee active | busy | request-id | Decision record | AuditEvent | — |
| I-004 | CommitteeVoting (R-049) | "Cast vote" | A | CastVote | vote.cast | round open, eligible | busy | seat+round idempotency | Vote record | AuditEvent | — |
| I-005 | CirculationPanel | "Dispatch the round" | A | OpenCirculation | circulation.open | policy enabled, deadline set | busy | round id | CirculationRound | AuditEvent | D-132/133 fixed |
| I-006 | CirculationPanel | Response buttons (approve/reject/abstain/recuse) | A | RecordCirculationResponse | circulation.respond | own row, round live | busy | response written once | CirculationResponse | AuditEvent | D-134 fixed |
| I-007 | CirculationPanel | "Produce the outcome" | A | FinalizeCirculation | circulation.finalize | ready & not dispatcher | busy | — | round outcome | AuditEvent | — |
| I-008 | CommitteeActions (R-054) | "Submit evidence" | A | SubmitActionEvidence | action.evidence | action open, assignee | busy | revision++ | evidence revision | AuditEvent | — |
| I-009 | CommitteeEvidence | "Accept/Return evidence" | A | ReviewActionEvidence | evidence.review | submitted, independent verifier | busy | verdict idempotency | verdict | AuditEvent | — |
| I-010 | CommitteeActions | "Close action" | A | CloseAction | action.close | evidence accepted | busy | — | action closed | AuditEvent | — |
| I-011 | CommitteeMinutes (R-048) | "Approve minutes" | A | ApproveMinutes | minutes.approve | in_review | busy | — | minutes approved | AuditEvent | — |
| I-012 | CommitteeMinutes | Export PDF/Word | A | exportInstitutionalDocument(committee_minutes) | read | minutes exists | exporting | — | blob download | LogInstitutionalExport | — |
| I-013 | LegislativeReportPanel | Save draft / advance stage | A | UpdateLegislativeReport | legislative.report | file open | saving | — | report sections | AuditEvent | — |
| I-014 | LegislativeReportPanel | Export PDF/Word | A | exportInstitutionalDocument(legislative_dossier) | read | file exists | exporting | — | blob download | LogInstitutionalExport | — |
| I-015 | MyWorkInbox | Export XLSX/CSV | A | exportInstitutionalDocument(personal_work_report) | read | work exists | exporting | — | blob download | LogInstitutionalExport | — |
| I-016 | CommitteeDelegations (R-037) | "Delegate authority" | A | DelegateAuthority | governance.delegate | delegator active | busy | — | Delegation | AuditEvent | — |
| I-017 | CommitteeRecusals (R-039) | "Recuse" | A | RecordRecusal | member.recuse | eligible | busy | — | Recusal | AuditEvent | — |
| I-018 | CommitteeHandover (R-040) | "Raise a handover" | A | InitiateHandover | handover.initiate | seat leaving | busy | — | HandoverPack | AuditEvent | D-136 fixed |
| I-019 | CommitteeHandover | "Accept / Return" | A | AcceptHandover | handover.accept | named successor | busy | — | items assigned once | AuditEvent | — |
| I-020 | MeetingDetail (R-041) | Start/Adjourn/Cancel | A | StartMeeting/AdjournMeeting/CancelMeeting | meeting.manage | scheduled | busy | — | meeting state | AuditEvent | — |
| I-021 | CommitteeCalendar (R-042) | Sync to calendar | A | SyncMeetingToCalendar/SyncMeetingToOutlook | meeting.manage | connector authorized | busy | — | external event | AuditEvent | C-GAP-1 if no connector |
| I-022 | CommitteeDocuments (R-046) | "Upload version" | A | UploadDocumentVersion | document.write | doc exists | busy | version++ | DocumentVersion | AuditEvent | — |
| I-023 | DocumentDetail (R-047) | Annotate | A | AnnotateDocument | annotation.write | version exists | busy | — | Annotation | AuditEvent | — |
| I-024 | CommitteeAI (R-061) | Generate output | A | governed generation (InvokeLLM via backend) | ai.generate | committee read | busy | — | AIOutputLedger | AuditEvent | — |
| I-025 | CommitteeAI | Approve/Reject output | A | RecordAIFeedback/governed transition | ai.review | output exists | busy | — | review verdict | AuditEvent | — |
| I-026 | GuestItemView (R-011) | Open/acknowledge | A | governed by token (GetGuestItemView) | token-scoped | token valid | — | — | view_count++ | AuditEvent | — |
| I-027 | ActionExtractView (R-012) | Respond/ask | A | RespondToActionExtract/AnswerActionClarification | token-scoped | grant valid | busy | — | response/clarification | AuditEvent | — |
| I-028 | OrgAdmin (R-023) | Invite user | A | base44.users.inviteUser | org.admin | — | busy | — | invitation | AuditEvent | — |
| I-029 | EntryPortal (R-001) | "Explore" / "Create portal" | B | navigate /explore, /create-portal | public | — | — | — | — | — | — |
| I-030 | Exploration gate | Write controls in exploration | D/C | hidden or disabled with "exploration mode" | — | isDemoMode | — | — | — | — | — |

## Exploration-mode policy (I-030)
In exploration mode, writing controls are hidden or disabled with a clear localized
explanation. No fake success is presented. Annotations belong to an authenticated
account and are not available in exploration (`DocumentAnnotationsPanel` states this).
No showcase write access is opened in this package.

## Coverage denominators (static, 2026-10-14)
INTERACTION COVERAGE: PARTIAL — 30 CONTROLS REGISTERED, COMPLETE DENOMINATOR NOT ESTABLISHED.
Static source scan found: onClick handlers ~496 · `<Button>` 245 · `<Link to>` 9 (most
navigation uses `Link` via component wrappers / `useNavigate`) · `<form>` 5 ·
`onSubmit` 7 · TabsTrigger 16 · upload surfaces 16 · download/export triggers 58 ·
generate triggers 159 (many are string occurrences, not distinct controls). The 30
registered controls (I-001..I-030) are the governed-write + navigation surface; a
complete per-control registry of all ~496 onClick handlers is a Phase 2 work item
(ICOV-1). Until then this registry is PARTIAL by its own declaration.

## Known interaction gaps
- I-GAP-1: Calendar sync (I-021) requires an authorized app-user connector
  (googlecalendar id 6a40f423404d169cb3344836 or outlook id 6abe5970bddfed2e7caa5cda).
  No app connector is authorized yet → the control must be outcome **E** (unavailable,
  external dependency missing) with a localized reason. Verify in browser acceptance.
- I-GAP-2: Aggregate vote result display — when only aggregate results exist, the
  surface must show «نتيجة مجمعة — دليل التصويت الفردي غير متوفر» / "Aggregate result —
  individual voting evidence unavailable". No fabrication of individual votes.
  To verify in DecisionDetail (NOT TESTED).
- I-GAP-3: Review cards must open a real document + version + review workflow. To
  verify in browser acceptance (NOT TESTED).

## State contract (per surface)
Every surface renders exactly one: LOADING · EMPTY (only after successful zero-read)
· NO_AUTHORITY · OUT_OF_SCOPE · NOT_FOUND · DEGRADED · ERROR · SESSION_ENDED ·
EXPLORATION. Translations live in `LANGUAGE_PARITY_REGISTER`.