# LIJAN™ Frozen-Preview Acceptance — Final Report

> **Governing spec:** `src/docs/ACCEPTANCE_HANDOFF_BRIEF.md` (SHA-256 `6191e4cd13ccc8f2b2ec529aeaf43590166dd12580397714fa8d388e1d46e091`)
> **Frozen fingerprint:** `7e53a2649dd705dbdea1e7303c3018af21f366b9b7b31c34cc73f8c4d0dcce07`
> **Test date/time:** 2026-10-14T12:32Z (Asia/Riyadh 15:32)
> **Environment:** Preview — `https://lijan.base44.app`
> **Build ID:** Base44 exposes no public build ID. All results are bound to the full source fingerprint + preview URL above.
> **Publication status:** NOT PUBLISHED — frozen for acceptance only.

---

## 1. Candidate Match — PASS — VERIFIED

| Check | Expected | Actual | Status |
|-------|----------|-------|--------|
| Frozen fingerprint | 7e53a2649dd705dbdea1e7303c3018af21f366b9b7b31c34cc73f8c4d0dcce07 | 7e53a2649dd705dbdea1e7303c3018af21f366b9b7b31c34cc73f8c4d0dcce07 | PASS |
| Source file count | 801 | 801 | PASS |
| Brief SHA-256 | 6191e4cd…46e091 | 6191e4cd…46e091 | PASS |
| Artifact manifest SHA-256 | d40f8e10…c4a358 | d40f8e10…c4a358 | PASS |
| Build | PASS exit 0 | PASS — VERIFIED | PASS |
| Lint | PASS exit 0 | PASS — VERIFIED | PASS |
| Language guard (LGUARD-1) | PASS exit 0 | PASS — VERIFIED | PASS |
| Authorization policy | authz-1.10.0 | authz-1.10.0 | PASS |

**Classification:** MATCH — proceed with acceptance.

---

## 2. Sixteen Frozen Artifacts — Full Hashes (PASS — VERIFIED server-side)

| Slot | Product | Lang | Format | Artifact ID | Size | Full SHA-256 |
|------|---------|------|--------|-------------|------|--------------|
| 1 | committee_minutes | ar | pdf | 6acf47ab7c0639a68a58e7c3 | 498562 | 2be627f35641830bcc8d271f387473f0b5774288523acf86488302f1409a2996 |
| 2 | committee_minutes | ar | docx | 6acf47abf7c25461342ab5d7 | 714673 | 4bcaf69a78672aa18a5742fbf2b92254c62ac9e063de83677dce449695b7ae3b |
| 3 | committee_report | ar | pdf | 6acf47ac849f7611f9ee1a73 | 507849 | f280eb5f739634569d30d28f5d492fa5a4e3244e92e3b7c2ecb9451e21bdc554 |
| 4 | committee_report | ar | docx | 6acf47a939405022888fad77 | 715692 | 38e3a894b927149cdaa8935a30388adf986a383d45746c57033ecb53ada88318 |
| 5 | personal_work_report | ar | xlsx | 6acf47aeed2678211612c645 | 442592 | 13a086f3665866c2b09ffeef1097cb8a745263683712130293bc7eec3dacfdad |
| 6 | decision_register | ar | xlsx | 6acf47aec9f4df7df50be500 | 443161 | 3c754947e1321ff512d57a3315910ea1a2da243ea105bdb89803924d421b8048 |
| 7 | attendance_register | ar | xlsx | 6acf47ae680a85bf4020896d | 443079 | ee5152b63a6b60a545bf7b8480e22608894ee0ba8a65f1d0ef2cf90b5a8371bf |
| 8 | executive_brief | ar | pdf | 6acf47af2258636c9f8e98ca | 508056 | e59bd833fa95742b8451b6a433e3efa9df73d92aede6a01286fcf49f26d9a84f |
| 9 | committee_minutes | en | pdf | 6acf47b343766101a50fb399 | 489854 | f2822406a1f870a98755001a87ab9fda1ddf3fbf1cc967ec024afb65180c630b |
| 10 | committee_minutes | en | docx | 6acf47b4867dc64c7f901b95 | 714518 | 09763eb0fa9d976ce2618492e517cade5dcf2d8e29357f7856188289036cda4a |
| 11 | committee_report | en | pdf | 6acf47b36a1cb23e7a99027c | 495115 | 57c8ece440b6b0f4e0b66863d6499aa33c55eaea5591a4dff4f4d7be3916492c |
| 12 | committee_report | en | docx | 6acf47b3fe8fac9d53760213 | 715519 | 0e8fe1b4a4d789b8ab3f6f2d88af3f1f08c200929aedb1dda768aedc4f595a22 |
| 13 | personal_work_report | en | xlsx | 6acf47b635796a4761219d69 | 442464 | b187876ae7ef7dbac68012319bfd8e47790a92d9ec00cc72caa98b1cdcb37571 |
| 14 | decision_register | en | xlsx | 6acf47b6d5cd5fc7126fe9c9 | 442991 | f28d8d25679c956c6b12131cd16df8002805d5d57f3bc9ad2145b09b3dcc03f5 |
| 15 | attendance_register | en | xlsx | 6acf47b6b445a183594cdda5 | 443262 | 4aba7c3faec9897c8b49f7208497d684f714a773141ea4654a5119ee4613a9dbd |
| 16 | executive_brief | en | pdf | 6acf47b7b1c65ed26eeb49f8 | 495501 | 27f34aa04925767a853ed454c93c06ce67f425fae3e0b29cb30db23d3ee2b3e9 |

**Structural inspection (server-side, from `.fingerprint/export-structural-inspection.json`):**
- PDF (6 outputs): Noto Naskh Arabic font dictionaries + FontFile2 streams + ToUnicode CMaps with Arabic presentation forms — PASS
- DOCX (4 outputs): regular + bold `.odttf` font parts, deobfuscated bytes match TTF assets, fontTable relationships linked — PASS
- XLSX (6 outputs): Arabic sheets `rightToLeft=1` + `readingOrder=2`; English sheets LTR — PASS
- Owning institution logo: BLOCKED — QDB registered logo is SVG; renderer expects PNG (known limitation)

---

## 3. Dr Hamad Baseline (Pre-Run)

| Field | Value |
|-------|-------|
| Persona ID | 6ac1fce36bc8a3bddb2bcf4c |
| User/account ID | (showcase persona — no live login) |
| Permanent organization ID | 6ac144e8042bf45d71173358 (Qatar Development Bank) |
| Showcase committees (DR_HAMAD_GOVERNED_DEMO_V1) | 7 |
| Active membership rows in 7 committees | 70 (multiple roles/historical per committee) |
| Meetings | 17 |
| Documents — active | 35 |
| Documents — archived | 126 |
| Versioned histories | 35 |
| Review tasks | 5 |

---

## 4. Mandatory Membership Scope Test — SERVER-SIDE FINDING (CRITICAL)

**Database state:** Dr Hamad's user_id is linked to active memberships across **three** dataset populations:

| Population | demo_dataset | Committees | Active rows for Dr Hamad | Expected in exploration |
|------------|-------------|------------|--------------------------|------------------------|
| Dr Hamad showcase | DR_HAMAD_GOVERNED_DEMO_V1 | 7 | 70 | ✅ All 7 |
| Isolated fixture | seated_e2e_fixture_v1 | 1 | 5 | ❌ Never |
| Fahad showcase | FAHAD_QATAR_GOVERNMENT_DEMO_V2 | 7 | 70 | ❌ Never |
| ITISG (non-demo) | (null) | 1 | (present) | ❌ Never |

**Server-side classification: AT RISK — requires browser verification.**
The exploration UI **must** filter by `demo_dataset = DR_HAMAD_GOVERNED_DEMO_V1` to surface exactly 7 committees. If it filters by `organization_id` alone, or by `user_id` alone, it will leak the fixture (5 rows), Fahad's committees (70 rows), and ITISG into Dr Hamad's view.

The Testing Agent MUST verify in browser:
- Exactly 7 committees appear (A-01, A-02)
- `seated_e2e_fixture` committee (`6ac60a3d8ce548ea29bf0cc7`, "Isolated Synthetic Committee — Governance Fixture") is never visible
- Fahad's 7 committees are never visible
- Direct URL to the fixture is denied
- Switching committee changes role, not identity or permanent organization

If the fixture is visible: **FAIL — SHOWCASE SCOPE LEAKAGE.**

---

## 5. Archive Reconciliation — PASS — VERIFIED

| Scope | Archived count |
|-------|---------------|
| Globally reconciled shells (repair batch) | 126 |
| Dr Hamad 7-committee scope | 126 |
| Total archived in database | 126 |

**Finding:** The 126 globally-reconciled archived shells and the 126 archived documents in Dr Hamad's 7 committees are the **same population** (`populations_match: true`). There is no contradiction: all 126 archived shells belonged to Dr Hamad's 7 showcase committees. The earlier preflight figure of "108" was a truncated query artifact; the exact scoped count is 126.

The fixture committee has 0 archived and 0 active documents — it carries only membership rows, no document records.

---

## 6. Interaction Reconciliation (Suite D) — SERVER-SIDE PASS

```
766 user-visible operational + 162 navigation + 53 component plumbing +
 3 decorative + 6 propagation-only + 0 test/development + 2 dead/unreachable = 992
```

| Category | Count | Registered? |
|----------|-------|------------|
| user-visible operational | 766 | ✅ registered |
| navigation | 162 | ✅ registered |
| component plumbing | 53 | excluded |
| decorative | 3 | excluded |
| propagation-only | 6 | excluded |
| dead/unreachable | 2 | excluded |
| **Total** | **992** | 928 registered / 64 excluded |

No unexplained remainder. Whether a dead user-visible control hides among the 64 exclusions requires DOM inspection by the Testing Agent — **cannot confirm server-side.**

---

## 7. Suite Results

### Suite A — Dr Hamad Read-Only Exploration

**Status: NOT TESTED — BLOCKED (browser execution required)**

This agent has no browser, screenshot, viewport-emulation, or DOM-navigation capability. Suite A requires rendered-browser execution at 390×844, 768×1024, and 1366×768 in Arabic and English. The Testing Agent (test-tube icon, side panel) must execute all 12 journeys (A-01 through A-12).

Server-side preconditions verified: fingerprint match, 7 showcase committees identified, 126 archives confirmed absent from active views, 35 versioned histories present, 5 review tasks present, `write_scope:none` policy in force.

**Testing Agent goals:**
- A-01/A-02: "Enter Dr Hamad exploration, verify name + QDB org + exactly 7 committees (no fixture, no Fahad committees), open all 7 checking role/institution/logo/no leakage"
- A-03: "Visit every principal surface in Arabic then English — no raw enums, no fallback, true RTL/LTR"
- A-10: "Test AMEEN in 6 language scenarios — active UI language governs reply, «أمين»/AMEEN correct, history preserved"
- A-11: "Verify no write action succeeds across 7 committees — controls hidden/disabled with localized reason"
- A-12: "Verify responsive behavior at 390×844, 768×1024, 1366×768 — no overflow, no clipped Arabic, keyboard focus visible"

### Suite B — Isolated Operational Workflow

**Status: NOT TESTED — BLOCKED (browser + synthetic fixture required)**

An isolated synthetic write fixture exists (`seated_e2e_fixture_v1`, committee `6ac60a3d8ce548ea29bf0cc7`, 5 active membership rows for the test persona). However, executing end-to-end write workflows (agenda → attendance → documents → reviews → decisions → voting → actions → minutes → reports) requires browser interaction with a synthetic authenticated account. This agent cannot authenticate, navigate forms, or verify persisted state through the UI.

**Testing Agent goal:** "Using the isolated synthetic fixture account, execute the full operational write workflow end-to-end: create agenda, invite attendance, upload document, assign review, draft decision, cast vote, submit action evidence, generate minutes — verifying each write persists, creates an audit event, and produces the intended notification, then clean up"

If the synthetic account is not authorizable in the preview: **BLOCKED — AUTHORIZED SYNTHETIC WRITE FIXTURE UNAVAILABLE.**

### Suite C — 16 Frozen Artifacts

**Status: PARTIAL — structural PASS, visual inspection BLOCKED**

| Aspect | Status |
|--------|--------|
| Artifact IDs + full SHA-256 hashes | PASS — VERIFIED (all 16 match manifest) |
| Signed download returns 200 | PASS — VERIFIED (server-side) |
| PDF font embedding + Unicode mapping | PASS — VERIFIED (structural) |
| DOCX font parts + relationships | PASS — VERIFIED (structural) |
| XLSX RTL/LTR sheet views | PASS — VERIFIED (structural) |
| Visual: logos, colors, no clipping, no raw enums, page numbering, content accuracy | **NOT TESTED — browser/visual inspection required** |
| Owning-institution logo | BLOCKED — QDB logo is SVG, renderer expects PNG |

**Testing Agent goal:** "Download all 16 frozen artifacts by their IDs, open each, verify LIJAN + CONNECTION logos, maroon/white/gold colors (no blue/cyan/purple), Noto Naskh Arabic shaping, true RTL, no raw enums, no clipping, no placeholders — capture a screenshot of each representative opening page"

### Suite D — Interaction Contract Acceptance

**Status: PARTIAL — reconciliation PASS, execution NOT TESTED**

Server-side: 992 = 928 registered + 64 excluded, no unexplained remainder. Browser execution of the 928 registered interactions (rendered / executed / navigation verified / persisted / denied / blocked / not-tested) requires DOM interaction by the Testing Agent.

---

## 8. Data-Integrity Comparison (Post-Suite A)

**NOT TESTED — Suite A was not executed in browser.** The post-A baseline comparison requires the Testing Agent to re-query Dr Hamad's dataset after navigation and confirm: no membership change, no committee-context change, no document creation/update, no review mutation, no decision/action mutation, no unauthorized audit/notification side effect.

Server-side pre-A baseline is recorded in `.fingerprint/PREFLIGHT_BASELINE.json` and `.fingerprint/ACCEPTANCE_PRE_RUN_VALIDATION.json` for comparison.

---

## 9. Defects

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| P0-SCOPE | P0 | Dr Hamad user_id has active memberships in fixture (5 rows) + Fahad committees (70 rows) + ITISG. Exploration MUST filter by demo_dataset=DR_HAMAD_GOVERNED_DEMO_V1 or scope leakage occurs | AT RISK — browser verification required |
| P1-LOGO | P1 | QDB owning-institution logo is SVG; export renderer expects PNG — logo blocked in all 16 artifacts | Known limitation |
| P2-VIEWER | P2 | 35 versioned document histories structurally verified; viewer opening not tested | Deferred to Suite C |

No defects were repaired during this run. No source or showcase data was modified.

---

## 10. Final Summary

| # | Item | Result |
|---|------|--------|
| 1 | Candidate match | **PASS — VERIFIED** |
| 2 | Suite A totals | **NOT TESTED — BLOCKED (browser required)** |
| 3 | Suite B totals | **NOT TESTED — BLOCKED (browser + synthetic auth required)** |
| 4 | Suite C (16 artifacts) | **PARTIAL — structural PASS, visual NOT TESTED** |
| 5 | Suite D (992 interactions) | **PARTIAL — reconciliation PASS, execution NOT TESTED** |
| 6 | Seven-membership result | **AT RISK — 70 rows resolve to 7 committees only if demo_dataset filter applies; browser must verify** |
| 7 | Eighth-fixture isolation | **AT RISK — fixture has 5 active rows for Dr Hamad; must never surface** |
| 8 | Arabic/English parity | NOT TESTED — browser required |
| 9 | AMEEN language result | NOT TESTED — browser required |
| 10 | Document/archive reconciliation | **PASS — VERIFIED (126 = 126, same population)** |
| 11 | Responsive/accessibility | NOT TESTED — browser required |
| 12 | Data-integrity comparison | NOT TESTED — Suite A not executed |
| 13 | P0/P1/P2 defects | 1 P0 (scope, at risk), 1 P1 (logo), 1 P2 (viewer) |
| 14 | Preview acceptance decision | **NOT READY — browser suites not executed** |
| 15 | Published acceptance | NOT TESTED |
| 16 | Publication recommendation | **DO NOT PUBLISH — hand off Suites A, B, C-visual, D to the Testing Agent; the platform cannot be called ready until all mandatory P0 journeys pass in a rendered browser** |

---

## 11. Handoff to Testing Agent

This agent completed every server-side verification possible: fingerprint match, 16 artifact hashes, archive reconciliation, interaction reconciliation, membership scope analysis. The browser-dependent suites (A, B, C-visual, D-execution) are **BLOCKED** because this agent has no browser, screenshot, viewport-emulation, or DOM-navigation tools.

The Testing Agent (test-tube icon, side panel) must execute:
1. **Suite A** — 12 journeys, Arabic + English, 3 viewports
2. **Suite B** — full synthetic write workflow (if fixture authorizable)
3. **Suite C** — visual inspection of 16 downloaded artifacts
4. **Suite D** — 928 registered interactions exercised in browser

**Critical P0 verification:** Confirm exactly 7 committees appear in Dr Hamad exploration — the fixture (`6ac60a3d8ce548ea29bf0cc7`) and Fahad's committees must never surface. If they do: **FAIL — SHOWCASE SCOPE LEAKAGE.**

Evidence receipts preserved in `.fingerprint/`:
- `ACCEPTANCE_CANDIDATE_FROZEN.json`
- `PREFLIGHT_BASELINE.json`
- `ACCEPTANCE_PRE_RUN_VALIDATION.json`
- `RECONCILIATION_A_220_REPAIR.json`
- `RECONCILIATION_B_126_ARCHIVED.json`
- `RECONCILIATION_C_35_PRESERVED.json`
- `RECONCILIATION_D_992_INTERACTION.json`
- `export-structural-inspection.json`
- `export-controlled-artifacts.json`

**Do not publish. Do not modify source or showcase data. Do not call the platform ready until all mandatory P0 journeys pass in a rendered browser.**