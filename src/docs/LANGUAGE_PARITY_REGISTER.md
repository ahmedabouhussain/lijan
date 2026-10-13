# LANGUAGE_PARITY_REGISTER — LIJAN™ Baseline (Phase 0)

> Stable IDs: `L-###` (language item). One canonical bilingual-label registry:
> `src/lib/raqeemUtils.js` (+ `structureLabels.js` for structure-specific maps).
> Local status maps removed/consolidated where a canonical map exists.

## Canonical label registry (single source)
`raqeemUtils.js` exports these bilingual maps, all bound to the active language at
read time via `BILINGUAL_LABEL_MAPS`:
COMMITTEE_TYPES · COMMITTEE_STATUS · MEETING_STATUS · DECISION_STATUS · ACTION_STATUS ·
PRIORITY · READINESS · AGENDA_ITEM_STATUS · ESCALATION_LEVEL · CLASSIFICATION ·
MINUTES_STATUS · ATTENDANCE_STATUS · MEMBER_ROLE · AUTHORITY_LEVELS ·
DEPENDENCY_TYPE · DEPENDENCY_STATUS · SCENARIO_TYPE · SCENARIO_STATUS ·
AI_OUTPUT_TYPE · AI_OUTPUT_STATUS · WORKSTREAM_STATUS · WORKSTREAM_ROLE ·
FIRST_MEETING_STATUS · INITIATIVE_STATUS · DELEGATION_STATUS · CIRCULATION_ROUND_STATE ·
CIRCULATION_RULE · CIRCULATION_DISPATCH_STATE · CIRCULATION_RESPONSE · AMENDMENT_STATUS.

`structureLabels.js`: HANDOVER_DISPOSITIONS · HANDOVER_STATUS · HANDOVER_ITEM_STATUS ·
OBLIGATION_TYPES · EXCLUDED_FROM_HANDOVER · REASON_CLASSES.

`legislativeFileLabels.js`: REPORT_STAGE_LABELS · CLASSIFICATION_LABELS (legislative).

Accessors: `L.label(map, key, fallback)`, `L.color(map, key, fallback)`,
`L.status(map, key, fallback)`, `L.name(record, base)`, `L.title(record)`,
`L.date(value)`. `structureLabels.label(map, key, lang)`.

## Defects found and corrected (Phase 1)
| ID | Surface | Defect | Fix | Status |
|----|--------|--------|-----|--------|
| L-001 → D-130 | DecisionActionBoard | raw decision status | routed via `DECISION_STATUS` | IMPLEMENTED — NOT BROWSER TESTED |
| L-002 → D-131 | CommitteeRisks | raw delegation status | added `DELEGATION_STATUS` | IMPLEMENTED — NOT BROWSER TESTED |
| L-003 → D-132 | CirculationPanel | raw round state + rule | added `CIRCULATION_ROUND_STATE`, `CIRCULATION_RULE` | IMPLEMENTED — NOT BROWSER TESTED |
| L-004 → D-133 | CirculationPanel | raw dispatch state | added `CIRCULATION_DISPATCH_STATE` | IMPLEMENTED — NOT BROWSER TESTED |
| L-005 → D-134 | CirculationPanel | raw response | added `CIRCULATION_RESPONSE` | IMPLEMENTED — NOT BROWSER TESTED |
| L-006 → D-135 | CommitteeFormation | raw amendment status | added `AMENDMENT_STATUS` | IMPLEMENTED — NOT BROWSER TESTED |
| L-007 → D-136 | CommitteeHandover | raw handover item status | added `HANDOVER_ITEM_STATUS` | IMPLEMENTED — NOT BROWSER TESTED |

## Static check (raw enum render prevention)
- Pattern audited: `{x.status}`, `{x.state}`, `{x.rule}`, `{x.response}` rendered
  directly in JSX. After the 7 fixes, the remaining matches are either routed via
  `L.*` / `label(...)` or are logic comparisons (`===`), not renders.
- The `BILINGUAL_LABEL_MAPS` binding rewrites each map entry's `ar`/`en` to a getter
  bound to the active language, so `t(MAP[k]?.ar, MAP[k]?.en)` and `L.label(MAP, k)`
  both resolve to ONE language only.
- A lint-level guard is not yet wired; the static check is currently the manual grep
  audit. Wiring an ESLint rule against raw `{x.status}` renders is a Phase 2 item
  (LGUARD-1).

## Content categories (display policy)
| Category | Policy |
|----------|--------|
| Interface translation | active language only; one canonical map |
| Official bilingual institutional data | authored in both languages; never machine-translated at display |
| User-authored content | rendered in authored language |
| Proper names | rendered as authored; legacy Arabic-only falls back honestly |
| Generated-document content | follows selected UI language; engine applies Noto Naskh Arabic + RTL for Arabic |

## AMEEN language handling
- `AmeenContext` resolves the AMEEN opening message from `ameen_message_ar` /
  `ameen_message_en` returned by `ResolveAmeenContext`, selected by active `lang`.
- The assistant label: Arabic mode → «أمين»; English mode → "AMEEN" (see `ameenIdentity.js`).
- L-GAP-1: AMEEN reply language must follow the selected UI language on every turn;
  to be verified in browser acceptance (NOT TESTED).

## Dates / numbers
- `L.date` / `dateOf` use `ar-QA` (Arabic) or `en-GB` (English) with `numberingSystem:
  "latn"` so Arabic pages show Latin digits with tabular figures (`.arabic-figures`).
- Date literals in inline `t(...)` are localized; no untranslated dates found in
  governed surfaces.

## Remaining language work (Phase 1 open)
- LGUARD-1: ESLint rule to forbid raw `{x.status}`/`{x.state}` renders — NOT IMPLEMENTED.
- P-GAP-1: bilingual showcase fields for Dr Hamad committees/meetings — NOT YET DONE.
- L-GAP-1: AMEEN reply-language verification — NOT TESTED.
- Full surface-by-surface visual audit (all pages × both languages × 3 viewports) —
  NOT TESTED (deferred to browser acceptance).