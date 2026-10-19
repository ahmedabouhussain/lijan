# OPEN_DEFECT_REGISTER — LIJAN™ (Phase 0)

> Status vocabulary: OPEN | IN_PROGRESS | FIXED-UNVERIFIED | VERIFIED | WONT-FIX | BLOCKED.
> A defect is VERIFIED only after browser acceptance proves the fix on the rendered UI.

## D-130 — Decision status rendered raw in work-group board
- **Surface:** `src/components/workgroups/DecisionActionBoard.jsx` (decisions list)
- **Symptom:** `<StatusBadge label={d.status} />` rendered the raw English enum
  (`draft`, `in_review`, `issued`...) in both Arabic and English mode.
- **Root cause:** decisions board used the raw field while the actions board already used
  `L.status(ACTION_STATUS, ...)`.
- **Fix:** routed through `DECISION_STATUS` map via `L.label` / `L.color`.
- **Status:** FIXED-UNVERIFIED. Build green. Browser acceptance NOT yet performed.

## D-131 — Delegation status rendered raw in risks page
- **Surface:** `src/pages/committee/CommitteeRisks.jsx` (active delegations list)
- **Symptom:** `{d.status}` rendered raw (`active`, `expired`, `revoked`, `completed`).
- **Root cause:** no canonical delegation status label map existed.
- **Fix:** added `DELEGATION_STATUS` to `raqeemUtils.js`, registered in
  `BILINGUAL_LABEL_MAPS`, rendered via `L.label(DELEGATION_STATUS, d.status, d.status)`.
- **Status:** FIXED-UNVERIFIED.

## D-132 — Circulation round state + rule rendered raw
- **Surface:** `src/components/raqeem/CirculationPanel.jsx` (round header badge + rule line)
- **Symptom:** `${round.state}` and `{round.rule}` rendered raw English enums.
- **Fix:** added `CIRCULATION_ROUND_STATE` + `CIRCULATION_RULE` maps; rendered via `L.label`.
- **Status:** FIXED-UNVERIFIED.

## D-133 — Circulation dispatch state rendered raw
- **Surface:** `src/components/raqeem/CirculationPanel.jsx` ("your row" line)
- **Symptom:** `{row.dispatch_state}` rendered raw (`queued`, `dispatched`, `failed`).
- **Fix:** added `CIRCULATION_DISPATCH_STATE` map; rendered via `L.label`.
- **Status:** FIXED-UNVERIFIED.

## D-134 — Circulation response rendered raw
- **Surface:** `src/components/raqeem/CirculationPanel.jsx` ("your recorded response" line)
- **Symptom:** `{row.response}` rendered raw (`pending`, `approve`, `reject`, `abstain`, `recuse`).
- **Fix:** added `CIRCULATION_RESPONSE` map; rendered via `L.label`.
- **Status:** FIXED-UNVERIFIED.

## D-135 — Amendment status rendered raw in formation page
- **Surface:** `src/pages/committee/CommitteeFormation.jsx` (proposed amendments list)
- **Symptom:** `<StatusBadge label={a.status} />` rendered raw English amendment statuses
  (`draft`, `secretary_review`, `pending_approval`, `effective`...).
- **Fix:** added `AMENDMENT_STATUS` to `raqeemUtils.js`, registered in `BILINGUAL_LABEL_MAPS`;
  rendered via `L.label(AMENDMENT_STATUS, a.status, a.status)`. Color kept from local
  `STATUS_COLORS` (unchanged).
- **Status:** FIXED-UNVERIFIED. Build green.

## D-136 — Handover item status rendered raw in handover page
- **Surface:** `src/pages/committee/CommitteeHandover.jsx` (item row meta line)
- **Symptom:** `{i.status}` rendered raw (`pending`, `accepted`, `returned`, `reassigned`,
  `not_transferred`) inline beside the obligation type.
- **Fix:** added `HANDOVER_ITEM_STATUS` to `structureLabels.js`; rendered via
  `label(HANDOVER_ITEM_STATUS, i.status, lang)` (same `label` helper already used for
  obligation types on the same line).
- **Status:** FIXED-UNVERIFIED. Build green.

## Pre-existing known issues (carried forward)
- **D-106:** Concurrency containment exists in application logic, not the storage layer
  (two writes can both succeed). Mitigated by compare-and-set revision fields; not
  storage-enforced.
- **D-121:** Membership portal access requires active organization membership, not just
  seat binding. By design.
- Committee status `draft`/`pending_activation` remains without a seated-readiness
  activation validator on the published path (see `CommitteeActivationPanel`).

## Named live/preview defects — investigation (2026-10-13)
Traced from the Phase 1 brief; recorded as found, not fabricated:

- **Arabic in English mode / English titles in Arabic mode:** no raw-enum leak found
  after D-130..D-136. Interface translation uses one canonical map bound to active
  language. Visual confirmation NOT TESTED. → status: IMPLEMENTED — NOT BROWSER TESTED.
- **AMEEN wrong selected language:** `AmeenContext` selects `ameen_message_ar/en` by
  active `lang` (L-GAP-1). NOT TESTED in browser.
- **Members count vs appointments/continuity:** `CommitteeAppointments` shows a "no
  seats" empty state when no `SeatAppointmentEvent` exists; `SeatedReadinessPanel`
  measures seat→membership→person and declares what cannot be read (never shows zero
  on a denied read). This is the honest-state contract, not a defect. → by-design.
- **"Record not available" inside accessible meeting details:** the phrase appears
  only in `VerifyRecord.jsx` (a legitimate public-verification error), not in
  MeetingDetail. → NOT REPRODUCED.
- **Duplicate showcase source documents:** grouped under canonical `Document`
  records via `DocumentVersion`; no silent deletion. No duplicate detected in audit.
  → NOT REPRODUCED (monitor in browser).
- **Raw values "in_review"/"archived":** no raw literal renders found after fixes.
  → IMPLEMENTED — NOT BROWSER TESTED.
- **Invalid org-logo placeholders (repeated letters):** no `charAt(0).repeat()` found
  in `OrganizationMark` / `CommitteeLogoSection`. → NOT REPRODUCED.
- **Actions in read-only exploration without explanation:** exploration hides/
  disables write controls (I-030); `DocumentAnnotationsPanel` states notes need an
  authenticated account. → IMPLEMENTED — NOT BROWSER TESTED.
- **Aggregate vote results without individual evidence:** governed by I-GAP-2 rule
  (honest display, no fabrication). DecisionDetail display NOT TESTED in browser.
- **Review cards not leading to a reviewable version:** to verify in browser
  (I-GAP-3). NOT TESTED.
- **Empty reports/memory/attendance from blocked reads:** governed-state contract
  distinguishes EMPTY (after successful zero-read) from denied read. NOT TESTED.
- **Broken/duplicated committee URLs:** single canonical `/o/:orgRef/c/:committeeRef`
  pattern; `LegacyCommitteeRedirect` resolves legacy. → NOT REPRODUCED.
- **`/documents` vs `/documentation` inconsistency:** distinct purpose split
  (D-ROUTE-1): official record library vs product documentation hub. Clarify labels.
  → P3. **D-ROUTE-1 RESOLVED (static):** CommitteeDocuments now carries an explicit
  subtitle "Governed repository of the committee's operational records — not product
  documentation." / Arabic equivalent; DocumentationHub remains the product/executive
  pack. Single canonical route each; no duplicated repository. NOT BROWSER TESTED.

## LGUARD-1 sweep — new defects (2026-10-14)
| ID | Severity | Surface | Static finding | Fix | Disposition |
|----|----------|--------|----------------|-----|-------------|
| D-137 | P1 | DecisionWorkflow.jsx:165 | raw `decision.escalation_level` in badge | routed via `ESCALATION_LEVEL` | IMPLEMENTED — NOT BROWSER TESTED |
| D-138 | P1 | InstitutionalTimeMachine.jsx:214 | raw `a.priority` in badge | routed via `PRIORITY` | IMPLEMENTED — NOT BROWSER TESTED |
| D-139 | P1 | CommitteeNotifications.jsx:164 | raw `tmpl.priority` in row | routed via `PRIORITY` | IMPLEMENTED — NOT BROWSER TESTED |
| D-140 | P1 | CommitteeDocuments.jsx:119 | raw `d.status` in StatusBadge | routed via `DOCUMENT_STATUS` | IMPLEMENTED — NOT BROWSER TESTED |

## D-141 — ReportCenter classification rendered raw
- **Surface:** `src/pages/committee/ReportCenter.jsx` (artifact list row)
- **Symptom:** `{inst.classification}` rendered the raw English enum (`internal`, `public`...) in both modes.
- **Fix:** routed through `CLASSIFICATION` map via `L.label`.
- **Status:** FIXED-UNVERIFIED. Build green.

## Showcase session token enforcement (2026-10-14)
- `GetMyWork` and `ResolveAmeenContext` now require a valid `showcase_token` for demo mode.
- Without a token: 401 `no_session`. With a valid token: 200 and the governed persona's data.
- `EnterExploration` issues the token; `verifyShowcaseSession` validates it.
- **Status:** IMPLEMENTED — backend test passes with fresh token.

## Bilingual showcase repair (2026-10-14)
- 220 records across 6 entities verified and persisted with bilingual `_ar`/`_en` field parity.
- Evidence: `.fingerprint/bilingual-repair-executed.json` (220/220 VERIFIED PERSISTED RESULT).
- **Status:** EXECUTED. Browser visual confirmation still pending.

## Institutional export engine v2 (2026-10-14)
- `GenerateInstitutionalExport` generates PDF/DOCX/XLSX from governed records.
- `GetInstitutionalExportAccess` gates file download by showcase session or requester ownership.
- Test: executive_brief PDF, 495KB, SHA256 `64de80e8…`, artifact persisted.
- **Status:** IMPLEMENTED — NOT BROWSER TESTED.

## Backend regression (2026-10-14
- TestVoteEligibility: PASS 12/12, 0 writes — identity-by-identifier, recusal, term.
- TestPrincipalRepresentation: PASS 24/24, 0 writes — one-person/seven-seats invariant.
- TestAuthorizationGuard: 200, policy `authz-1.10.0` (effective-time gate, fail-closed).
- TestShowcaseIsolation: **ALL TESTS PASS.** 13/13 pass (sub-test 1 now returns
  `not_found` as expected). Administrator-direct, modified-token and missing-token
  boundary tests added. Browser verification of a non-admin session still pending
  before final closure.

## «أمين» send path (2026-10-19)

- **D-A1 — one generic sentence for every failure, and a call to a method this SDK does not have.**
  `SendAmeenMessage` answered `تعذّر إرسال الطلب إلى أمين.` for a lapsed session, a foreign
  conversation and an internal fault alike, and `AgentChatPanel` collapsed every refusal into
  that same string, so the reader was told nothing.
  **Root cause of the reported failure:** the function called
  `base44.agents.updateConversation(...)` on the locale-change path — and this platform's agents
  module exposes only `getConversations · getConversation · listConversations · createConversation ·
  addMessage · subscribeToConversation · getWhatsAppConnectURL · getTelegramConnectURL`. The call
  threw a TypeError, and the outer catch reported it as the generic sentence. Every send that
  followed a UI-language change therefore failed.
  **FIXED:** the locale is carried by the message contract (as before); the metadata write is
  attempted only where the SDK offers it; each refusal returns its own `code` and
  `reason_ar`/`reason_en`; the panel states the reason it received, and the engine path is named
  (`engine_unavailable`, 503) instead of being flattened into "the request could not be sent".
- **D-A2 — an exploration visitor could never send.** The function demanded a registered account
  before any other check, so a showcase (exploration) session — which holds no platform account —
  was refused, and the whole sandbox branch below it was unreachable.
  **FIXED:** the principal is resolved first (registered account OR server-verified showcase
  session), and the conversation is then read through the service role, as the server's own verdict
  already authorizes it. All binding checks (scope key · context key · committee · organization ·
  `authorizeRead`) are unchanged.
- **D-A3 — the thread could be bound ahead of the verdict.** The panel opened a conversation before
  the server verified the scope, so `committee_id` stayed null in its metadata while the send
  carried a committee — a `not_found` refusal on a legitimate question.
  **FIXED:** a scoped route waits for the verdict, and an existing thread is reused only when its
  bound committee and organization match.
- **Also:** a failed verification (`ResolveAmeenContext` unreachable) used to leave the composer
  enabled, so every question was refused; the surface now states that the context is unverified and
  offers a retry, and it no longer disappears for a visitor who holds no session (locked state with
  a sign-in path).
- **Probes (2026-10-19):** unknown conversation → 404 `conversation_not_available` (was a generic
  500); invalid exploration token → 401 `no_session` (branch previously unreachable); build clean.
  Browser verification of a signed-in send still pending.

## Pending Phase 1 investigations (not yet defects)
- Raw status string audit across `src/pages/committee/ReportCenter.jsx`,
  `CommitteeHandover.jsx`, `WorkstreamDetail.jsx` — these use status enums in *logic*
  (filters), not rendered output; confirmed not user-facing leaks. To re-audit on next pass.
- English meeting titles / member names appearing in Arabic mode — requires live data
  inspection (no records currently in production to test against).