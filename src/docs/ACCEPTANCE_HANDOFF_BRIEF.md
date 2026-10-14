# Acceptance Handoff Brief — LIJAN™ Phase 1

> **FROZEN CANDIDATE.** Do not modify source or showcase data during acceptance.
> Any change invalidates affected results and requires a new fingerprint + rerun.

---

## Frozen Candidate

| Field | Value |
|-------|-------|
| Frozen at | 2026-10-14T10:28:33Z |
| Candidate ID | phase1-acceptance-candidate-2026-10-14T13 |
| Environment | Preview (lijan.base44.app) |
| Source fingerprint | `7e53a2649dd705dbdea1e7303c3018af21f366b9b7b31c34cc73f8c4d0dcce07` |
| Source file count | 801 |
| Authorization policy | authz-1.10.0 |
| Entity count | 107 |
| Backend function count | 216 |
| Build | PASS — VERIFIED (exit 0) |
| Lint | PASS — VERIFIED (exit 0) |
| Language guard (LGUARD-1) | PASS — VERIFIED |
| Publication status | NOT PUBLISHED — frozen for acceptance only |

Full manifest: `.fingerprint/ACCEPTANCE_CANDIDATE_FROZEN.json`

---

## Reconciliation Evidence

| ID | Evidence file | Status |
|----|--------------|--------|
| A — 220 repaired records | `.fingerprint/RECONCILIATION_A_220_REPAIR.json` | PASS — VERIFIED |
| B — 126 archived shells | `.fingerprint/RECONCILIATION_B_126_ARCHIVED.json` | PASS — VERIFIED |
| C — 35 preserved histories | `.fingerprint/RECONCILIATION_C_35_PRESERVED.json` | PARTIAL (structural; viewer = Suite C) |
| D — 992 interaction balance | `.fingerprint/RECONCILIATION_D_992_INTERACTION.json` | PASS — VERIFIED |

### A. 220 repaired records (5 entities)

| Entity | Inspected | Changed | Unchanged | Failed | Readback |
|--------|-----------|---------|-----------|--------|----------|
| AgendaItem | 24 | 24 | 0 | 0 | 24 |
| Decision | 6 | 6 | 0 | 0 | 6 |
| Action | 23 | 23 | 0 | 0 | 23 |
| Meeting | 8 | 8 | 0 | 0 | 8 |
| Document | 159 | 159 | 0 | 0 | 159 |
| **Total** | **220** | **220** | **0** | **0** | **220** |

### B. 126 archived document shells

- 126 archived; all were empty and unversioned
- No valid file removed; no version removed
- No review task left pointing to an archived shell (0 broken)
- No meeting, decision or report reference broken (0 broken)
- Rollback reference exists for every archived record
- New audit event exists for the archival batch

### C. 35 preserved versioned histories

- 35 versioned document histories preserved
- Canonical document remains accessible (none archived)
- Versions remain ordered (structural; viewer opening = Suite C)

### D. 992 interaction balance

```
766 user-visible operational + 162 navigation + 53 component plumbing +
 3 decorative + 6 propagation-only + 0 test/development + 2 dead/unreachable = 992
```

Registered: 928. Excluded: 64 (53 component plumbing + 3 decorative + 6 propagation-only + 2 dead/unreachable). No unexplained remainder.

---

## 16 Frozen Export Artifacts

| Slot | Product | Lang | Format | Artifact ID |
|------|---------|------|--------|-------------|
| 1 | committee_minutes | ar | pdf | 6acf47ab7c0639a68a58e7c3 |
| 2 | committee_minutes | ar | docx | 6acf47abf7c25461342ab5d7 |
| 3 | committee_report | ar | pdf | 6acf47ac849f7611f9ee1a73 |
| 4 | committee_report | ar | docx | 6acf47a939405022888fad77 |
| 5 | personal_work_report | ar | xlsx | 6acf47aeed2678211612c645 |
| 6 | decision_register | ar | xlsx | 6acf47aec9f4df7df50be500 |
| 7 | attendance_register | ar | xlsx | 6acf47ae680a85bf4020896d |
| 8 | executive_brief | ar | pdf | 6acf47af2258636c9f8e98ca |
| 9 | committee_minutes | en | pdf | 6acf47b343766101a50fb399 |
| 10 | committee_minutes | en | docx | 6acf47b4867dc64c7f901b95 |
| 11 | committee_report | en | pdf | 6acf47b36a1cb23e7a99027c |
| 12 | committee_report | en | docx | 6acf47b3fe8fac9d53760213 |
| 13 | personal_work_report | en | xlsx | 6acf47b635796a4761219d69 |
| 14 | decision_register | en | xlsx | 6acf47b6d5cd5fc7126fe9c9 |
| 15 | attendance_register | en | xlsx | 6acf47b6b445a183594cdda5 |
| 16 | executive_brief | en | pdf | 6acf47b7b1c65ed26eeb49f8 |

All 16: private file persisted, SHA-256 recorded, governed access, signed download returns 200, hash matches.

Structural inspection: `.fingerprint/export-structural-inspection.json`
- PDF: Noto Naskh Arabic font dictionaries + FontFile2 streams + ToUnicode CMaps with Arabic presentation forms (6 outputs)
- DOCX: regular + bold `.odttf` font parts, deobfuscated bytes match actual TTF assets, fontTable relationships linked (4 outputs)
- XLSX: Arabic sheets `rightToLeft=1` + `readingOrder=2`; English sheets LTR (6 outputs)
- Owning institution logo: BLOCKED (QDB registered logo is SVG; renderer expects PNG)

---

## Suite A — Dr Hamad Read-Only Exploration

**Persona:** Dr. Hamad Salem Majigher
**Identity:** one person, one account, permanent organization = Qatar Development Bank, exactly 7 independent committee memberships, `write_scope:none`
**Viewports:** 390×844, 768×1024, 1366×768 (emulated, not physical device)
**Languages:** Arabic and English

| Journey | Goal phrasing for Testing Agent |
|---------|-------------------------------|
| A-01 | "Enter the Dr Hamad exploration journey and confirm his name, organization (Qatar Development Bank) and exactly seven committee memberships with no profile contamination" |
| A-02 | "Open all seven Dr Hamad committees individually and verify each shows the correct committee, institution logo, Dr Hamad role, permanent QDB organization, and no data leakage between committees" |
| A-03 | "Verify every core committee route renders fully in Arabic with no English interface labels, raw enums or malformed dates (dashboard, members, meetings, calendar, agenda, attendance, decisions, actions, documents, review tasks, reports, memory, work groups, notifications, AMEEN)" |
| A-04 | "Repeat all core committee routes in English with no Arabic interface labels, Arabic statuses or Arabic fallback titles" |
| A-05 | "Open all three National SME Committee meetings and verify each opens with title, date, mode, location, status, agenda, attendance and credible operational records — no generic 'Record not available'" |
| A-06 | "Verify member counts match active memberships, appointments/continuity shows active appointments, expired/vacant positions are honest, and institution logo is separate from personal identity" |
| A-07 | "Verify duplicate empty shells are gone from documents, all visible documents open with real versions, review cards open the exact assigned document, and write controls are hidden or disabled with a localized reason" |
| A-08 | "Verify decisions open from their register with correct actions and meeting relationships, localized status labels, and honest missing-evidence statements — no aggregate implying individual evidence" |
| A-09 | "Verify reports do not silently show zero on access failure, institutional memory shows only approved content, and empty/denied/degraded/error states remain distinct" |
| A-10 | "Test AMEEN in 6 language scenarios (ar+ar, en+en, ar+en, en+ar, mid-conversation switch, refresh, committee switch) and verify active UI language governs the reply, «أمين» only in Arabic, 'AMEEN' only in English, history preserved, no cross-committee leakage" |
| A-11 | "Verify no write control executes across all seven committees — buttons hidden or disabled with localized reason, direct write attempts fail without persistence or notification" |
| A-12 | "Verify responsive behavior at all three viewports: sidebar direction follows language, no horizontal overflow, no clipped Arabic, dialogs fit, fixed controls don't cover content, keyboard focus visible, mobile drawer closes" |

---

## Suite B — Isolated Operational Workflow

**Constraint:** Use authorized synthetic account + isolated synthetic records only. Do not write to Dr Hamad's showcase or real institutional data.

Full write workflows to exercise:
1. Create/update agenda → attendance invitation → response → approval
2. Document upload → multiple versions → preview → download
3. Review assignment → comment → request changes → resubmission → approval/rejection
4. Decision draft → voting → duplicate-vote rejection
5. Conflict declaration → recusal
6. Action assignment → progress update → evidence submission → escalation
7. Minutes generation → report generation
8. Repeated-click prevention → cancellation → recoverable failure
9. Refresh and persistence → audit event → notification result → cleanup

For every write: Browser action → backend command → persisted record → audit event → intended notification → refreshed UI result.

---

## Suite C — 16 Generated Artifacts

Download and visually inspect all 16 artifact IDs listed above. Do not regenerate.

For each: download succeeds, file opens, hash matches frozen manifest, correct language, correct committee/source data, LIJAN logo, CONNECTION logo, "LIJAN™ by CONNECTION™", owning institution logo (BLOCKED — QDB SVG), classification, reference/version, generation date, page number, maroon/white/gold identity (no blue/cyan/purple), no clipping, tables fit, no empty shell, no raw enum, no broken logo, no placeholder text.

Arabic: Noto Naskh renders, true RTL paragraphs and table order, connected glyphs, searchable/selectable text, embedded English terms maintain order.
English: correct LTR, no Arabic fallback, consistent terminology.
DOCX: visually verify shaping + direction; distinguish declared font from genuinely embedded font (inspect `.odttf` parts).
PDF: inspect embedded font/subset; confirm text is not a screenshot; confirm searchable Unicode mapping.
XLSX: Arabic sheet RTL, first logical column on right, headers not truncated, filters/widths usable, no repair warnings.

---

## Interaction Check

Use `.fingerprint/interaction-inventory-current.json` as the source. For every registered user-visible control: confirm rendered for appropriate role/state, valid target/handler, expected loading/success/error behavior, prohibited roles denied. Separate: rendered / executed / persisted / denied-as-expected / blocked / not-tested. Do not report 928/928 merely because controls exist.

---

## Evidence Format (every test record)

Test ID · frozen fingerprint · environment · persona/account · committee · language · viewport · route · interaction ID · expected result · actual result · persisted effect · audit effect · screenshot · downloaded artifact ID (if applicable) · PASS / FAIL / BLOCKED / NOT TESTED.

Preserve failure screenshots and receipts. Do not discard failed results after a fix — rerun against a new fingerprint.

---

## Final Acceptance Report (required output)

1. Frozen candidate details
2. Suite A result
3. Suite B result
4. Suite C result
5. Interaction coverage result
6. Arabic/English parity
7. AMEEN language result
8. Document visual-inspection result
9. Authority/isolation result
10. Responsive result
11. P0/P1/P2 defects
12. Preview acceptance decision
13. Published acceptance status
14. Publication recommendation

Allowed statuses: PASS — VERIFIED · FAIL · PARTIAL · BLOCKED · NOT TESTED

**Do not publish. Do not call the platform ready until all mandatory P0 journeys pass.**