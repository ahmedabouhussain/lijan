# AUTHORITY_COMMAND_LEDGER — LIJAN™ Baseline (Phase 0)

> Stable IDs: `C-###` (command). Every sensitive command must fail closed.
> Cross-links: route → `ROUTE_AND_SURFACE_REGISTER`, interaction →
> `INTERACTION_CONTRACT_REGISTRY`, defect → `OPEN_DEFECT_REGISTER`.
> Source: `base44/functions/**` + `base44/shared/*authority*.ts`.

## Authority model (single kernel)
- One authority kernel: `base44/shared/authorityKernel.ts` + `capabilityKernel.ts` +
  `commandGuard.ts`. No second authority system exists.
- Client-provided organization/committee/role are **routing hints only**; every
  governed command re-derives scope from the target record's owning org/committee
  and the authenticated actor's seat/membership/role/effective date.
- Technical-administrator status is NOT committee decision authority.
- Vice-chair authority ≠ chair authority unless the instrument explicitly grants it.
- Fail-closed is the default: on missing/ambiguous authority the command refuses.

## Command ledger (governed writes)
| ID | Command (function) | Capability | Scope derived from | State precondition | Persisted result | Audit event | Fail-closed |
|----|---------------------|-----------|-------------------|-------------------|------------------|-------------|-------------|
| C-001 | CreateCommittee | org.admin | record + actor org | org exists | Committee record | AuditEvent | yes |
| C-002 | ActivateCommittee | committee.activate | committee + seat | draft/pending_activation | status=active | AuditEvent | yes |
| C-003 | SuspendCommittee | committee.suspend | committee + seat | active | status=suspended | AuditEvent | yes |
| C-004 | CloseCommittee | committee.close | committee + seat | not closed | status=closed | AuditEvent | yes |
| C-005 | RenewCommittee | committee.renew | committee + seat | expiry due | extended term | AuditEvent | yes |
| C-006 | InviteCommitteeMember | member.invite | committee + seat | committee active | membership draft | AuditEvent | yes |
| C-007 | EndCommitteeMembership | member.end | membership + seat | member in term | membership ended | AuditEvent | yes |
| C-008 | DelegateAuthority | governance.delegate | seat + delegator | delegator active | Delegation record | AuditEvent | yes |
| C-009 | ActivateAlternate | governance.alternate | seat + appointer | alternate appointed | AlternateActivation | AuditEvent | yes |
| C-010 | RecordRecusal | member.recuse | seat + self | member eligible | Recusal record | AuditEvent | yes |
| C-011 | DeclareConflict | member.conflict | seat + self | none | ConflictDeclaration | AuditEvent | yes |
| C-012 | OpenCirculation | circulation.open | committee + seat | policy enabled | CirculationRound dispatched | AuditEvent | yes |
| C-013 | RecordCirculationResponse | circulation.respond | row + own identity | round live, not answered | CirculationResponse | AuditEvent | yes |
| C-014 | FinalizeCirculation | circulation.finalize | committee + finalizer | ready & not dispatcher | round outcome | AuditEvent | yes |
| C-015 | OpenVote | vote.open | committee + seat | quorum eligible | Vote round | AuditEvent | yes |
| C-016 | CastVote | vote.cast | seat + own identity | round open, eligible | Vote record | AuditEvent | yes |
| C-017 | CloseVote | vote.close | committee + seat | round open | tally + IssueSnapshot | AuditEvent | yes |
| C-018 | IssueDecision | decision.issue | committee + finalizer | approved & evidenced | Decision issued | AuditEvent + IssueSnapshot | yes |
| C-019 | TransitionDecision | decision.transition | decision + seat | valid stage | decision stage | AuditEvent | yes |
| C-020 | SignRecord | signature.sign | record + seat | signature required | Signature record | AuditEvent | yes |
| C-021 | ApproveMinutes | minutes.approve | minutes + seat | in_review | minutes approved | AuditEvent | yes |
| C-022 | TransitionMinutes | minutes.transition | minutes + seat | valid stage | minutes stage | AuditEvent | yes |
| C-023 | SubmitActionEvidence | action.evidence | action + assignee | action open | evidence revision | AuditEvent | yes |
| C-024 | ReviewActionEvidence | evidence.review | action + verifier (independent) | evidence submitted | verdict (accept/return) | AuditEvent | yes |
| C-025 | CloseAction | action.close | action + verifier | evidence accepted | action closed | AuditEvent | yes |
| C-026 | AuthorizeCommitteeAction | action.authorize | committee + seat | authority valid | authority grant | AuditEvent | yes |
| C-027 | RecordRatification | ratification.record | committee + ratifier | route in force | RatificationRecord (append-only) | AuditEvent | yes |
| C-028 | SetRatificationRoute | ratification.set | committee + admin | none | RatificationRoute | AuditEvent | yes |
| C-029 | SetRetentionRule | retention.set | committee + admin | none | RetentionRule | AuditEvent | yes |
| C-030 | SetCirculationPolicy | circulation.policy | committee + admin | none | GovernanceConfig | AuditEvent | yes |
| C-031 | SetMembershipEffectPolicy | membership.effect | committee + admin | none | MembershipEffectPolicy | AuditEvent | yes |
| C-032 | SetPrincipalBasis | principal.set | committee + admin | none | principal basis record | AuditEvent | yes |
| C-033 | OpenLegislativeFile | legislative.open | committee + seat | profile enabled | LegislativeFile | AuditEvent | yes |
| C-034 | TransitionLegislativeFile | legislative.transition | file + seat | forward-only stage | file stage | AuditEvent + stage_history | yes |
| C-035 | UpdateLegislativeReport | legislative.report | file + seat | draft/review | report sections | AuditEvent | yes |
| C-036 | PublishCommitteeRecord | record.publish | record + seat | submitted | published record | AuditEvent | yes |
| C-037 | SupersedeOfficialRecord | record.supersede | record + admin | published | superseded (preserved) | AuditEvent | yes |
| C-038 | ReturnCommitteeRecordForCorrection | record.return | record + seat | submitted | returned | AuditEvent | yes |
| C-039 | ArchivePermittedRecord | record.archive | record + admin | published | archived | AuditEvent | yes |
| C-040 | InitiateHandover | handover.initiate | committee + seat | seat leaving | HandoverPack | AuditEvent | yes |
| C-041 | AcceptHandover | handover.accept | pack + named successor | pack pending | items assigned once | AuditEvent | yes |
| C-042 | CreateCommitteeRelationship | relationship.create | committee + admin | none | CommitteeRelationship | AuditEvent | yes |
| C-043 | RecordAppointmentEvent | appointment.record | seat + seat | none | SeatAppointmentEvent | AuditEvent | yes |
| C-044 | RecordChangeDisposition | change.disposition | change + authority | change open | ChangeDisposition | AuditEvent | yes |
| C-045 | RegisterAISystem | ai.register | org admin | none | AISystem | AuditEvent | yes |
| C-046 | RecordAIIncident | ai.incident | org member | none | AIIncident | AuditEvent | yes |
| C-047 | RecordAIFeedback | ai.feedback | user + output | output exists | AIOutputLedger feedback | AuditEvent | yes |
| C-048 | RespondToActionExtract | extract.respond | grant + token | grant valid | ActionClarification/response | AuditEvent | yes |
| C-049 | AnswerActionClarification | extract.answer | seat + authority | question raised | answer recorded | AuditEvent | yes |
| C-050 | InviteAgendaItemGuest | guest.invite | agenda + seat | item exists | AgendaItemGuest | AuditEvent | yes |

## Read / query (governed, no write)
| ID | Function | Scope | Notes |
|----|----------|-------|-------|
| C-060 | GetCommitteeRecord | committee | re-derives scope from record |
| C-061 | GetLegislativeFile | file | — |
| C-062 | GetCirculationState | decision | frozen electorate, per-seat identity |
| C-063 | GetRatificationState | committee | — |
| C-064 | GetRetentionState | committee | — |
| C-065 | GetPrincipalBasis | committee | — |
| C-066 | GetDecisionDossier | decision | — |
| C-067 | GetDecisionEffectState | decision | — |
| C-068 | GetParticipationMatrix | committee | — |
| C-069 | GetSeatedActorReadiness | seat | seat→membership→person |
| C-070 | GetCommitteeCapabilities | actor + committee | the capability hook for `useCommitteeAdmin` |
| C-071 | GetCommitteeMetrics | committee | server-side aggregation |
| C-072 | GetRecordAuditTrail | record | — |
| C-073 | GetMyWork | actor | — |
| C-074 | GetMyOrganizations | actor | — |
| C-075 | GetAIAccountabilityReport | org | server-side |
| C-076 | GetPublicAIRegister | public | no auth, permitted metadata only |
| C-077 | GetSovereignStandards | public | — |
| C-078 | GetIntegrationHealth | org | truthful state per adapter |
| C-079 | GetGuestItemView | token | token = capability |
| C-080 | GetActionExtractView | token | token = capability |

## Append-only records (no update/delete; RLS writer = `__append_only_no_writer__`)
RatificationRecord (C-027), IssueSnapshot (C-018). These preserve immutable history.

## Known authority gaps (open, carried)
- AGAP-1: D-106 — concurrency containment is in application logic (compare-and-set
  revision fields), not enforced at the storage layer. Mitigated, not eliminated.
- AGAP-2: Name-based identity matching — audited; the eligibility/voting path uses
  seat identifiers, not names (`voteEligibility.ts`, `principalRepresentation.ts`).
  No name-based match found in governed commands.
- AGAP-3: Write gated by read — audited; governed writes re-derive authority server-side.
  The client `useCommitteeAdmin` hook is a display hint, not the authority source.