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

## Pre-existing known issues (carried forward)
- **D-106:** Concurrency containment exists in application logic, not the storage layer
  (two writes can both succeed). Mitigated by compare-and-set revision fields; not
  storage-enforced.
- **D-121:** Membership portal access requires active organization membership, not just
  seat binding. By design.
- Committee status `draft`/`pending_activation` remains without a seated-readiness
  activation validator on the published path (see `CommitteeActivationPanel`).

## Pending Phase 1 investigations (not yet defects)
- Raw status string audit across `src/pages/committee/ReportCenter.jsx`,
  `CommitteeHandover.jsx`, `WorkstreamDetail.jsx` — these use status enums in *logic*
  (filters), not rendered output; confirmed not user-facing leaks. To re-audit on next pass.
- English meeting titles / member names appearing in Arabic mode — requires live data
  inspection (no records currently in production to test against).