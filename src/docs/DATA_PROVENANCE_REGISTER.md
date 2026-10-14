# DATA_PROVENANCE_REGISTER — LIJAN™ Baseline (Phase 0)

> Stable IDs: `P-###` (provenance source). Classifies every record by origin.
> No record was fabricated, deleted, or silently machine-translated in Phase 0/1.
> Dr Hamad's seven memberships are untouched.

## Provenance taxonomy (entity field `data_origin`)
| Origin | Meaning | Examples |
|--------|---------|----------|
| source_based | read from an external/system source of record | ExternalReference, OrganizationAsset (imported) |
| synthetic_presentational | showcase/demo data, never presented as official | DemoPersonaProfile, demo-flagged records |
| operational | produced by a governed platform action | meetings, decisions, votes, actions created via functions |

## Demo / showcase provenance
| ID | Dataset | Source | Reversible | Arabic+English fields | Fabricated legal/evidence |
|----|--------|--------|------------|----------------------|---------------------------|
| P-001 | Dr Hamad journey | `ProvisionDrHamadDemoData` + `RepairDrHamadDemoExperienceV3` | yes (function can be re-run; records tagged `is_demo_data`) | partial (see P-GAP-1) | none |
| P-002 | Fahad demo | `ProvisionFahadDemoData` | yes | partial | none |
| P-003 | NSDC showcase | `SeedNSDCShowcase` | yes | yes | none |

Every demo record carries `is_demo_data: true` and `demo_dataset` so it is never
presented as official. The UI shows a demo/exploration notice (ExplorationNotice,
DemoBanner) when the effective actor is a demo persona.

## Dr Hamad — seven memberships (immutable identifier basis)
- One person, one account, one permanent primary organization: Qatar Development Bank.
- Seven independent committee memberships; role evaluated separately per committee.
- Identity verified by immutable identifiers (user id, membership id, seat id), never
  by name matching (`voteEligibility.ts`, `principalRepresentation.ts` enforce this).
- Memberships are NOT altered in Phase 0/1. Any demo-data correction is limited to
  showcase bilingual fields and is recorded here with before/after.

## Bilingual data correction log (showcase only)
| ID | Record | Field | Before | After | Timestamp | Actor | Reversible |
|----|--------|-------|--------|-------|-----------|-------|------------|
| M-001 | AgendaItem (all 7 Dr Hamad committees) | title | `def.topics_ar` (Arabic, fell back to `mandate_ar`) → English title rendered Arabic | `enTopics[idx]` from `DR_HAMAD_TOPICS[def.key].en` | 2026-10-14T09:10+03:00 | build agent (ProvisionDrHamadDemoData edit) | yes — revert import + 3 title expressions |
| M-002 | AgendaItem | title_ar | `def.topics_ar` (mandate_ar) | `arTopics[idx]` from `DR_HAMAD_TOPICS[def.key].ar` | 2026-10-14T09:10 | build agent | yes |
| M-003 | Decision | title / title_ar | `Decision on ${topics_ar?.[0] \|\| mandate_en}` / `قرار بشأن ${topics_ar?.[0] \|\| mandate_ar}` | `Decision on ${topicEn}` / `قرار بشأن ${topicAr}` (real bilingual topic) | 2026-10-14T09:10 | build agent | yes |
| M-004 | Action | title / title_ar | `Follow up on ${topics_ar?.[0] \|\| mandate_en}` / `متابعة ${topics_ar?.[0] \|\| mandate_ar}` | `Follow up on ${topicEn}` / `متابعة ${topicAr}` | 2026-10-14T09:10 | build agent | yes |

> These edits change the *provision function*, not persisted records. Existing demo
> records change only on the next admin re-provision (idempotent upsert). No
> production/institutional record touched. Permanent org remains Qatar Development
> Bank; seven independent memberships unchanged; no authority widening.

> Rule: official bilingual institutional data is authored in both languages; it is
> never machine-translated at display time. User-authored content and proper names
> render in their authored language. Generated-document content follows the selected
> UI language.

## Public file URLs (storage posture)
| ID | Asset | Storage | Access | Notes |
|----|-------|---------|--------|-------|
| P-010 | LIJAN logo | public (`BRAND_LOGO_URL`, media.base44.com) | world-readable | brand asset |
| P-011 | CONNECTION logo | public (`CONNECTION_LOGO_URL`) | world-readable | brand asset |
| P-012 | Org logos | `OrganizationAsset.source_url` / `stored_path` | governed (approved only) | tri-logo lockup |
| P-013 | End-user uploads | `UploadPrivateFile` → `file_uri` (default) | signed URL, app permissions | private |
| P-014 | Public uploads | `UploadPublicFile` → `file_url` | world-readable | only when explicitly requested |

## Read behavior classification
- `filter/list/get` (client SDK) runs as the app user but bypasses RLS; reads are
  scoped server-side by the entity `rls` rules. Records outside the user's org are not
  returned (owner-org-or-admin pattern).
- Count/aggregate run server-side; a zero result from a denied read is distinguished
  from a genuine empty set by the governed-state contract (EMPTY only after a
  successful read confirms zero).

## Known provenance gaps
- P-GAP-1: Dr Hamad showcase committees/meetings/documents have partial bilingual
  fields. Important committees, meetings and roles need explicit Arabic + English
  fields so the Dr Hamad experience is complete in both languages. Correction is
  showcase-only, reversible, and must be logged above. NOT YET PERFORMED.
- P-GAP-2: No production LegislativeFile records exist (confirmed 2026-10-13), so
  the legislative journey is exercised only via demo data.