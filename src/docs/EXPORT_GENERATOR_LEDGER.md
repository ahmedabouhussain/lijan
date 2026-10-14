# EXPORT_GENERATOR_LEDGER — LIJAN™ Baseline (Phase 0)

> Stable IDs: `X-###` (generator/product type). Every human-facing file must go through
> the InstitutionalExportEngine. CSV is raw data only.
> Cross-links: defect → `OPEN_DEFECT_REGISTER`, route → `ROUTE_AND_SURFACE_REGISTER`.
> Source: `src/lib/institutionalExportEngine.js`, `exportTemplates.js`,
> `exportContent.js`, `exportPdfRenderer.js`, `exportDocxRenderer.js`,
> `exportRenderers.js`, `documentEngine.js`.

## Central engine
- Entry: `exportInstitutionalDocument({ productType, organizationId, organizationName,
  committeeId, committeeName, language, classification, data, format, ... })` →
  `{ blob, filename, metadata, quality, content_hash }`.
- Renderers: PDF (html2canvas→jsPDF, browser-canvas RTL), DOCX (docx), XLSX (exceljs),
  CSV (inline, BOM + quoted).
- Brand resolution: `resolveBrandAssets` → tri-logo lockup (org logo → LIJAN™ →
  CONNECTION™). Org logo pulled from `OrganizationAsset` (approved, primary); missing
  → `quality.org_logo_missing=true`.
- Audit: every export invokes `LogInstitutionalExport` (product_type, format, language,
  org, committee, classification, item_count, content_hash, quality_ok).
- Engine version: `institutional-export-1.0.0`.

## Product registry (template_for)
| ID | Product type | Arabic | English | Default format | Sheet-based | Migrated | Render-inspected |
|----|--------------|--------|---------|-----------------|-------------|----------|------------------|
| X-001 | personal_work_report | تقرير عملي | My Work Report | xlsx | yes | yes (MyWorkInbox) | NOT TESTED |
| X-002 | committee_minutes | محضر اجتماع | Committee Minutes | pdf | no | yes (CommitteeMinutes) | NOT TESTED |
| X-003 | agenda_pack | حزمة الاجتماع وجدول الأعمال | Agenda & Meeting Pack | pdf | no | pending | NOT TESTED |
| X-004 | decision_resolution | قرار وتوصية | Decision & Resolution | pdf | no | pending | NOT TESTED |
| X-005 | attendance_quorum | الحضور والنصاب | Attendance & Quorum | xlsx | yes | pending | NOT TESTED |
| X-006 | action_tracking | تتبع الإجراءات | Action Tracking | xlsx | yes | pending | NOT TESTED |
| X-007 | legislative_dossier | ملف إحالة تشريعي | Legislative Referral Dossier | pdf | no | yes (LegislativeReportPanel) | NOT TESTED |
| X-008 | audit_traceability | التدقيق والتتبع | Audit & Traceability | xlsx | yes | pending | NOT TESTED |
| X-009 | work_group_report | تقرير مجموعة عمل | Work Group Report | pdf | no | pending | NOT TESTED |
| X-010 | executive_report | تقرير تنفيذي | Executive Report | pdf | no | pending | NOT TESTED |
| X-011 | institutional_dataset | بيانات مؤسسية | Institutional Dataset | xlsx | yes | pending | NOT TESTED |
| X-012 | raw_data_csv | بيانات خام | Raw Data | csv | no | n/a | NOT TESTED |
| X-013 | product_document | مستند منتج | Product Document | pdf | no | yes (documentEngine legacy → engine) | NOT TESTED |

## Brand lockup requirements (every human-facing output)
1. Owning institution logo (when an approved `OrganizationAsset` exists).
2. LIJAN™ official logo (`BRAND_LOGO_URL`).
3. CONNECTION™ official logo (`CONNECTION_LOGO_URL`).
4. "LIJAN™ by CONNECTION™" lockup text.
5. Document title · 6. Owning committee · 7. Reference number · 8. Version ·
9. Status · 10. Classification · 11. Generated date · 12. Page numbers (PDF) ·
13. Template version (`engine_version`) · 14. Content hash (SHA-256) ·
15. Verification metadata where approved.

Arabic outputs: Noto Naskh Arabic, genuine RTL, right-to-left table order, searchable
text (no text-as-image), no artificial bold. English outputs: LTR equivalent.

## Caller sites (where exports are triggered)
| ID | Caller surface | Product | Format(s) | Routed via engine |
|----|----------------|---------|------------|-------------------|
| X-CALL-1 | LegislativeReportPanel | legislative_dossier | pdf, docx | yes |
| X-CALL-2 | CommitteeMinutes | committee_minutes | pdf, docx | yes |
| X-CALL-3 | MyWorkInbox | personal_work_report | xlsx, csv | yes |
| X-CALL-4 | documentEngine (legacy print + generateAndUploadPDF) | product_document | pdf, print | yes (migrated, backward-compatible) |

## Static rule (enforced by convention + audit)
No generator may write a file directly to the user outside the engine. Every export
must call `exportInstitutionalDocument` so that branding, audit, and the content hash
are applied. A generator that returns only a URL without the engine is non-compliant.

## Controlled generation and structural inspection (2026-10-14)
Engine claim: IMPLEMENTED — NOT VERIFIED. Acceptance status: PARTIAL.
Exactly 16 artifacts were generated in the controlled run, 8 Arabic and 8 English.
All 16 have persisted private files, non-zero sizes, recorded SHA-256 values,
governed artifact access and successful signed downloads; downloaded hashes match.
PDF header/trailer/pages/font dictionaries were parsed; DOCX/XLSX ZIP packages pass CRC
and their expected OOXML parts were parsed. This is NOT viewer-opening or visual acceptance.
Evidence: `.fingerprint/export-controlled-artifacts.json` and
`.fingerprint/export-structural-inspection.json` (exact artifact IDs, checks and source IDs).

- PDF: six outputs contain Noto Naskh Arabic font dictionaries and FontFile2 streams.
  Arabic ToUnicode maps include presentation forms, so logical Arabic search is NOT TESTED.
- DOCX: all four packages contain regular/bold `.odttf` font parts, fontTable relationships,
  document fontTable linkage and content types. Deobfuscated bytes match the actual Noto
  Naskh Arabic TTF assets. This establishes embedded package parts, not Word rendering.
- XLSX: Arabic files have rightToLeft sheet views and readingOrder=2; English equivalents
  use LTR. Column presentation is structurally verified, viewer rendering NOT TESTED.
  Fonts are declared, not embedded: FONT DECLARED — EMBEDDING NOT ESTABLISHED.
- Missing owning-institution logo: BLOCKED for the selected national committee. The QDB
  registered logo is SVG, while current renderers expect PNG; QDB rendering remains BLOCKED.
- Personal work report covers identity-bound actions in one committee, not the complete
  seven-committee queue. Current source actions without owner_user_id are not inferred.
- Classification label is currently fixed to Internal despite stored classification;
  non-internal outputs remain unverified.
- LIJAN/CONNECTION image parts and identity lockup exist; visual logo correctness, malformed
  Arabic, full viewer opening, source completeness and unauthorized download are NOT TESTED.
No artifact is labelled fully accepted. Browser suites must use the exact IDs in the manifest.

## Known export gaps
- XGAP-1: agenda_pack, decision_resolution, attendance_quorum, action_tracking,
  audit_traceability, work_group_report, executive_report, institutional_dataset
  still call legacy/inline generators or have no caller wired to the engine. Migration
  is a Phase 2 (Export Engine) work package, not Phase 1.
- XGAP-2: CSV (raw_data_csv) is correctly labeled as raw machine data and never
  presented as the institutional report — enforced by template default for
  human-facing products being xlsx/pdf.