# ROUTE_AND_SURFACE_REGISTER — LIJAN™ Baseline (Phase 0)

> Stable IDs: `R-###` (route), `S-###` (surface/page). Cross-links: command →
> `AUTHORITY_COMMAND_LEDGER`, interaction → `INTERACTION_CONTRACT_REGISTRY`,
> defect → `OPEN_DEFECT_REGISTER`.
> Generated 2026-10-13 from `src/App.jsx` + source tree. No route added/removed in Phase 1.

## Public routes (no auth)
| ID | Route | Surface | Arabic label | English label | Module | Permission |
|----|-------|--------|-------------|---------------|--------|------------|
| R-001 | `/` | EntryPortal | بوابة الدخول | Entry Portal | entry | public |
| R-002 | `/explore` | ExploreGateway | استكشف لجان | Explore LIJAN | entry | public |
| R-003 | `/explore/:personaSlug` | ExploreSession | جلسة استكشاف | Exploration Session | entry | public (demo) |
| R-004 | `/create-portal` | CreatePortal | إنشاء بوابة منظمة | Create Portal | entry | auth (write-disabled in exploration) |
| R-005 | `/governance-policies` | GovernancePolicies | سياسات الحوكمة | Governance Policies | public-governance | public |
| R-006 | `/sovereign-standards` | SovereignStandards | المعايير السيادية | Sovereign Standards | public-governance | public |
| R-007 | `/committees-registry` | PublicCommittees | سجل المجالس | Committees Registry | public | public |
| R-008 | `/ai-register` | PublicAIRegister | السجل الوطني للذكاء الاصطناعي | National AI Register | public | public |
| R-009 | `/platform-specification` | PlatformSpecification | مواصفات المنصة | Platform Specification | public | public |
| R-010 | `/verify/:type/:id` | VerifyRecord | التحقق من سجل | Verify Record | public | public |
| R-011 | `/guest/:token` | GuestItemView | عرض الضيف | Guest Item View | guest-capability | token-scoped |
| R-012 | `/extract/:token` | ActionExtractView | مستخلص الإجراء | Action Extract View | extract-capability | token-scoped |

## Auth routes
| ID | Route | Surface | Arabic | English |
|----|-------|--------|-------|---------|
| R-013 | `/login` | Login | تسجيل الدخول | Login |
| R-014 | `/register` | Register | إنشاء حساب | Register |
| R-015 | `/forgot-password` | ForgotPassword | نسيت كلمة المرور | Forgot Password |
| R-016 | `/reset-password` | ResetPassword | إعادة تعيين كلمة المرور | Reset Password |

## Organization portal (Level 2, ProtectedRoute + OrgLayout)
| ID | Route | Surface | Arabic | English | Permission |
|----|-------|--------|-------|---------|------------|
| R-020 | `/o/:orgRef` | OrgPortal | بوابة المنظمة | Org Portal | org member |
| R-021 | `/o/:orgRef/committees` | OrgCommittees | لجان المنظمة | Org Committees | org member |
| R-022 | `/o/:orgRef/notifications` | OrgNotifications | إشعارات المنظمة | Org Notifications | org member |
| R-023 | `/o/:orgRef/admin` | OrgAdmin | إدارة المنظمة | Org Admin | org admin |
| R-024 | `/o/:orgRef/create-committee` | CommitteeCreateV2 | إنشاء لجنة | Create Committee | org admin |

## Committee workspace (Level 3, ProtectedRoute + CommitteeLayout)
| ID | Route | Surface | Arabic | English | Capability |
|----|-------|--------|-------|---------|-----------|
| R-030 | `…/c/:committeeRef` | CommitteeHome | الرئيسية | Home | committee.read |
| R-031 | `…/members` | CommitteeMembers | الأعضاء | Members | committee.read |
| R-032 | `…/formation` | CommitteeFormation | التشكيل والتعديلات | Formation | committee.read |
| R-033 | `…/establishment` | CommitteeEstablishment | سند التأسيس | Establishment | committee.read |
| R-034 | `…/formation-history` | FormationHistory | نسخ التشكيل | Formation History | committee.read |
| R-035 | `…/amendments` | CommitteeAmendments | التعديلات | Amendments | governance.* |
| R-036 | `…/roles` | CommitteeRoles | الأدوار | Roles | committee.read |
| R-037 | `…/delegations` | CommitteeDelegations | التفويضات | Delegations | governance.delegate |
| R-038 | `…/alternates` | CommitteeAlternates | البدلاء | Alternates | governance.manage |
| R-039 | `…/recusals` | CommitteeRecusals | التنحيات | Recusals | committee.read |
| R-040 | `…/meetings` | MeetingsHub | الاجتماعات | Meetings | meeting.read |
| R-041 | `…/meetings/:id` | MeetingDetail | تفاصيل الاجتماع | Meeting Detail | meeting.read |
| R-042 | `…/calendar` | CommitteeCalendar | التقويم | Calendar | committee.read |
| R-043 | `…/agenda` | CommitteeAgenda | جدول الأعمال | Agenda | agenda.read |
| R-044 | `…/packs` | CommitteePacks | حزم الاجتماع | Packs | meeting.read |
| R-045 | `…/attendance` | CommitteeAttendance | الحضور | Attendance | attendance.read |
| R-046 | `…/documents` | CommitteeDocuments | الوثائق الرسمية | Documents | document.read |
| R-047 | `…/documents/:documentId` | DocumentDetail | تفاصيل الوثيقة | Document Detail | document.read |
| R-048 | `…/minutes` | CommitteeMinutes | المحاضر | Minutes | minutes.read |
| R-049 | `…/voting` | CommitteeVoting | التصويت | Voting | vote.read |
| R-050 | `…/decisions` | CommitteeDecisions | القرارات | Decisions | decision.read |
| R-051 | `…/decisions/:id` | DecisionDetail | تفاصيل القرار | Decision Detail | decision.read |
| R-052 | `…/legislative-file/:id` | LegislativeFileDetail | الملف التشريعي | Legislative File | legislative.read |
| R-053 | `…/signatures` | CommitteeSignatures | التوقيعات | Signatures | signature.read |
| R-054 | `…/actions` | CommitteeActions | الإجراءات | Actions | action.read |
| R-055 | `…/evidence` | CommitteeEvidence | الأدلة | Evidence | action.read |
| R-056 | `…/risks` | CommitteeRisks | المخاطر | Risks | committee.read |
| R-057 | `…/dependencies` | CommitteeDependencies | التبعيات | Dependencies | committee.read |
| R-058 | `…/escalations` | CommitteeEscalations | التصعيدات | Escalations | action.read |
| R-059 | `…/reports` | CommitteeReports | التقارير | Reports | committee.read |
| R-060 | `…/memory` | CommitteeMemory | الذاكرة المؤسسية | Memory | memory.read |
| R-061 | `…/ai` | CommitteeAI | الذكاء المؤسسي | AI | ai.read |
| R-062 | `…/audit` | CommitteeAudit | التدقيق | Audit | audit.read |
| R-063 | `…/mandate` | CommitteeMandate | الصلاحية | Mandate | committee.read |
| R-064 | `…/governance-rules` | CommitteeGovernanceRules | قواعد الحوكمة | Governance Rules | committee.read |
| R-065 | `…/integrations` | CommitteeIntegrations | التكاملات | Integrations | committee.read |
| R-066 | `…/notifications` | CommitteeNotifications | الإشعارات | Notifications | committee.read |
| R-067 | `…/closure` | CommitteeClosure | الإغلاق | Closure | governance.close |
| R-068 | `…/settings` | CommitteeSettings | الإعدادات | Settings | governance.manage |
| R-069 | `…/products` | ProductCatalog | المنتجات | Products | committee.read |
| R-070 | `…/documentation` | DocumentationHub | توثيق المنتج | Documentation | committee.read |
| R-071 | `…/workstreams` | CommitteeWorkstreams | مجموعات العمل | Work Groups | workstream.read |
| R-072 | `…/workstreams/:workstreamId` | WorkstreamDetail | تفاصيل مجموعة العمل | Workstream Detail | workstream.read |

## Hub aggregations (same governed surfaces, grouped)
| ID | Route | Surface |
|----|-------|--------|
| R-080 | `…/people` | PeopleFormationHub |
| R-081 | `…/records` | RecordsHub |
| R-082 | `…/execution` | ExecutionHub |
| R-083 | `…/intelligence` | IntelligenceHub |
| R-084 | `…/governance` | GovernanceHub |

## Administrative / oversight
| ID | Route | Surface | Arabic | English | Permission |
|----|-------|--------|-------|---------|------------|
| R-090 | `/organization-assets` | OrganizationAssetsAdmin | سجل الهوية المؤسسية | Org Assets Admin | platform admin |
| R-091 | `/activity-log` | ActivityLog | سجل النشاط | Activity Log | admin |
| R-092 | `/audit-trail` | AuditTrail | مسار التدقيق | Audit Trail | admin |
| R-093 | `/minutes-archive` | MinutesArchive | أرشيف المحاضر | Minutes Archive | auth |
| R-094 | `/notification-preferences` | NotificationPreferences | تفضيلات الإشعارات | Notification Preferences | auth |
| R-095 | `/national-adoption-showcase` | NationalAdoptionShowcase | عرض التبني الوطني | National Adoption | founder/admin |
| R-096 | `/profile` | Profile | الملف الشخصي | Profile | auth |
| R-097 | `/founder-vault` | FounderVault | خزنة المؤسس | Founder Vault | founder |

## Legacy redirects (no surface; navigate to current home)
R-100 `/dashboard`→`/` · R-101 `/committees`→`/` · R-102 `/decisions`→`/` · R-103 `/minutes`→`/` ·
R-104 `/execution`→`/` · R-105 `/calendar`→`/` · R-106 `/memory`→`/` · R-107 `/ai-ledger`→`/` ·
R-108 `/dependencies`→`/` · R-109 `/scenarios`→`/` · R-110 `/integrations`→`/` · R-111 `/admin/*`→`/` ·
R-112 `/committees/:id` → LegacyCommitteeRedirect · R-113 `/meetings/:id` → LegacyRecordRedirect ·
R-114 `/decisions/:id` → LegacyRecordRedirect · R-115 `/institutions/new`→`/create-portal` ·
R-116 `/dr-hamad-experience/*`→`/explore/dr-hamad` · R-117 `…/charter`→`…/establishment` (ParamRedirect).

## Surface-state contract (applies to every S-###)
Each surface must render exactly one governed state: LOADING · EMPTY (only after a
successful read returns zero) · NO_AUTHORITY · OUT_OF_SCOPE · NOT_FOUND · DEGRADED ·
ERROR · SESSION_ENDED · EXPLORATION. See `INTERACTION_CONTRACT_REGISTRY` for per-control
outcomes and `LANGUAGE_PARITY_REGISTER` for state-string translation.

## Known route defects
- D-ROUTE-1: `/documents` (official record library) vs `/documentation` (product
  documentation hub) — distinct purpose but easily confused naming. Not a defect;
  documented as intentional split. To clarify in navigation labels.
- No broken/duplicated committee URLs found: committee resolution is centralized
  through `LegacyCommitteeRedirect` + `CommitteeContext`; `/o/:orgRef/c/:committeeRef` is
  the single canonical pattern.