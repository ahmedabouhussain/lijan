# Recovery Checkpoint — LIJAN before National-Corporate Readiness Program

**Checkpoint name:** `LIJAN before national-corporate readiness program`
**Created:** 2026-10-13 (Asia/Riyadh)
**Created by:** Base44 build agent
**Mode:** Non-destructive. No working functionality deleted or replaced.
**Publication:** NOT approved. No publish action performed.

## Purpose
This checkpoint marks the stable state of the LIJAN™ platform immediately before the
National and Corporate Governance Readiness Program (Phases 0–11). It is the rollback
reference for every subsequent mutation: any work package that cannot be made reversible
must stop (per Section A.20) and reference this checkpoint.

## What this checkpoint guarantees
1. The existing governed core (entities, backend functions, authority kernel, export
   engine, committee workspace, organization portal) is intact and not rebuilt.
2. Dr Hamad's seven memberships and all production memberships are untouched.
3. No records were deleted to alter behavior or to make tests pass.
4. The InstitutionalExportEngine remains the single export path; no parallel generator
   was introduced.
5. The authority kernel remains the single command-authority system.

## Phase 0 registers produced alongside this checkpoint
- `src/docs/CURRENT_STATE_REGISTER.md` — routes, pages, components, entities, functions,
  agents, integrations, generators, export paths, command sites.
- `src/docs/OPEN_DEFECT_REGISTER.md` — known defects with status (the first work package
  closed the rendered raw-status leaks D-130…D-134).

## First mutations applied after this checkpoint (Phase 1, language parity)
- Added 5 canonical bilingual label maps to `src/lib/raqeemUtils.js`:
  `DELEGATION_STATUS`, `CIRCULATION_ROUND_STATE`, `CIRCULATION_RULE`,
  `CIRCULATION_DISPATCH_STATE`, `CIRCULATION_RESPONSE` — all registered in
  `BILINGUAL_LABEL_MAPS` so they bind to the active language on read.
- Routed 4 rendered raw-status leaks through the canonical maps:
  - `src/components/workgroups/DecisionActionBoard.jsx` (decision status)
  - `src/pages/committee/CommitteeRisks.jsx` (delegation status)
  - `src/components/raqeem/CirculationPanel.jsx` (round state, rule, dispatch state, response)
- Build verified green (`npx vite build` → exit 0).

## Reversibility
The label-map additions are purely additive. The 4 site fixes replace a raw `{value}`
render with `{L.label(MAP, value, value)}` — the fallback is the raw value, so behavior
degrades identically to before if a map key is absent. Reversal = revert the 4 find/replace
edits and delete the 5 added map blocks.