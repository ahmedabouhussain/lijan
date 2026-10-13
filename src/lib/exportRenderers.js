// exportRenderers.js — the XLSX renderer for the Institutional Export Engine.
// A branded multi-sheet workbook: cover, executive summary, the data as a real Excel Table
// (filters, frozen header, RTL, maroon header), slices, and a field-definitions sheet.
import { BRAND } from "@/lib/brand";
import { ENGINE_PALETTE } from "@/lib/exportTemplates";
import {
  WORK_EXPORT_COLUMNS, buildWorkExportRows, buildWorkExportMeta,
} from "@/lib/workExport";

const loc = (lang, ar, en) => (lang === "ar" ? ar : en);
const ink = (c) => c.slice(2);

function setCell(ws, ref, value, opts) {
  opts = opts || {};
  const c = ws.getCell(ref);
  c.value = value;
  c.font = { bold: !!opts.bold, size: opts.size || 10, color: opts.color ? { argb: opts.color } : undefined };
  if (opts.fill) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.fill } };
  c.alignment = { wrapText: true, vertical: "top" };
}

function colLetter(n) {
  let s = "";
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function coverSheet(wb, { metadata, isAr, lang }) {
  const ws = wb.addWorksheet(loc(lang, "الغلاف", "Cover"), { views: [{ rightToLeft: isAr }] });
  ws.columns = [{ width: 28 }, { width: 52 }];
  setCell(ws, "A1", BRAND.nameAr + BRAND.trademark + " by CONNECTION" + BRAND.trademark, { bold: true, size: 14, color: ink(ENGINE_PALETTE.maroon) });
  ws.mergeCells("A1:B1");
  setCell(ws, "A2", metadata.identity_text, { size: 9, color: ink(ENGINE_PALETTE.muted) });
  ws.mergeCells("A2:B2");
  const rows = [
    [loc(lang, "نوع المستند", "Document type"), metadata.template_label],
    [loc(lang, "الجهة المالكة", "Owning organization"), metadata.organization_name ? (isAr ? metadata.organization_name.ar : metadata.organization_name.en) : loc(lang, "غير محددة", "Not specified")],
    [loc(lang, "اللجنة", "Committee"), metadata.committee_name ? (isAr ? metadata.committee_name.ar : metadata.committee_name.en) : "—"],
    [loc(lang, "طالب التقرير", "Requested by"), metadata.requested_by || "—"],
    [loc(lang, "اللغة", "Language"), isAr ? loc(lang, "العربية", "Arabic") : "English"],
    [loc(lang, "التصنيف", "Classification"), metadata.classification_label ? (isAr ? metadata.classification_label.ar : metadata.classification_label.en) : "—"],
    [loc(lang, "تاريخ الإنشاء", "Generated"), metadata.generated_at_display],
    [loc(lang, "إصدار المحرك", "Engine version"), metadata.engine_version],
  ];
  let r = 4;
  rows.forEach((pair) => {
    setCell(ws, "A" + r, pair[0], { bold: true, size: 10 });
    setCell(ws, "B" + r, pair[1], { size: 10 });
    r++;
  });
  if (metadata.ameen_draft) {
    setCell(ws, "A" + r, metadata.ameen_draft_text, { bold: true, size: 10, color: ink(ENGINE_PALETTE.warningInk), fill: ENGINE_PALETTE.warningSurface });
    ws.mergeCells("A" + r + ":B" + r);
  }
  return ws;
}

function addTableSheet(wb, name, columns, rows, { isAr, lang }) {
  const ws = wb.addWorksheet(name, {
    views: [{ rightToLeft: isAr, state: "frozen", ySplit: 1 }],
    pageSetup: { fitToWidth: 1, printTitlesRow: "1:1" },
  });
  ws.columns = columns.map((c) => ({
    header: c.label, key: c.key,
    width: Math.max(14, Math.min(40, String(c.label).length + 6)),
    style: { alignment: { wrapText: true, vertical: "top", horizontal: isAr ? "right" : "left" } },
  }));
  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: ENGINE_PALETTE.white }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ENGINE_PALETTE.maroon } };
    cell.alignment = { wrapText: true, vertical: "center", horizontal: "center" };
    cell.border = { bottom: { style: "thin", color: { argb: ENGINE_PALETTE.maroonDark } } };
  });
  ws.getRow(1).height = 22;
  (rows || []).forEach((r) => {
    const row = ws.addRow(r);
    row.eachCell((cell) => {
      cell.alignment = { wrapText: true, vertical: "top", horizontal: isAr ? "right" : "left" };
      cell.font = { size: 10 };
    });
  });
  const lastCol = colLetter(columns.length);
  const ref = "A1:" + lastCol + Math.max(2, (rows ? rows.length : 0) + 1);
  try {
    ws.addTable({
      name: "T_" + name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 20),
      ref, headerRow: true,
      style: { theme: "TableStyleLight1", showRowStripes: true },
      columns: columns.map((c) => ({ name: c.label, filterButton: true })),
      rows: (rows || []).map((r) => columns.map((c) => r[c.key] ?? "")),
    });
  } catch (e) { /* table add best-effort; sheet still renders */ }
  ws.autoFilter = { from: "A1", to: lastCol + "1" };
}

function buildPersonalWorkWorkbook(wb, { metadata, data, language, isAr }) {
  const lang = language;
  coverSheet(wb, { metadata, isAr, lang });

  const workData = data && data.workData ? data.workData : {};
  const items = (data && data.items) || [];
  const rows = buildWorkExportRows(items, language);
  const counts = workData.counts || { total: items.length, overdue: 0, due_soon: 0 };
  const meta = buildWorkExportMeta({ data: workData, itemCount: items.length, scopeLabel: (data && data.scopeLabel) || "", lang });

  const sum = wb.addWorksheet(loc(lang, "الملخص التنفيذي", "Executive Summary"), { views: [{ rightToLeft: isAr }] });
  sum.columns = [{ width: 34 }, { width: 28 }];
  setCell(sum, "A1", loc(lang, "الملخص التنفيذي", "Executive Summary"), { bold: true, size: 13, color: ink(ENGINE_PALETTE.maroon) });
  setCell(sum, "A2", metadata.organization_name ? (isAr ? metadata.organization_name.ar : metadata.organization_name.en) : "", { size: 9, color: ink(ENGINE_PALETTE.muted) });
  const sumRows = [
    [loc(lang, "النطاق", "Scope"), (data && data.scopeLabel) || "—"],
    [loc(lang, "إجمالي البنود", "Total items"), counts.total ?? 0],
    [loc(lang, "المتأخرة", "Overdue"), counts.overdue ?? 0],
    [loc(lang, "المستحقة قريبًا", "Due soon"), counts.due_soon ?? 0],
    [loc(lang, "آخر تحديث", "Last updated"), workData.generated_at || metadata.generated_at_display],
  ];
  let rr = 4;
  sumRows.forEach((pair) => {
    setCell(sum, "A" + rr, pair[0], { bold: true });
    setCell(sum, "B" + rr, String(pair[1]));
    rr++;
  });
  if (meta.unread_sources && meta.unread_sources.length) {
    setCell(sum, "A" + rr, loc(lang, "مصادر لم تُقرأ", "Sources not read"), { bold: true, color: ink(ENGINE_PALETTE.warningInk) });
    setCell(sum, "B" + rr, meta.unread_sources.join(" | "));
    rr++;
  }
  if (items.length === 0) {
    rr++;
    setCell(sum, "A" + rr, loc(lang, "لا توجد بنود تتطلب إجراءك ضمن النطاق المحدد", "No items require your action within the selected scope"), { bold: true, color: ink(ENGINE_PALETTE.successInk), fill: ENGINE_PALETTE.successSurface });
    sum.mergeCells("A" + rr + ":B" + rr);
    rr++;
    setCell(sum, "A" + rr, loc(lang, "الصفر ناتج عن قراءة ناجحة، لا عن فشل صامت.", "Zero is the result of a successful read, not a silent failure."), { size: 9, color: ink(ENGINE_PALETTE.muted) });
    sum.mergeCells("A" + rr + ":B" + rr);
  }

  const cols = WORK_EXPORT_COLUMNS.map((c) => ({ key: c.key, label: loc(lang, c.ar, c.en) }));
  addTableSheet(wb, loc(lang, "كل المطلوب مني", "All Required of Me"), cols, rows, { isAr, lang });

  const overdueRows = rows.filter((r) => /متأخر|overdue/i.test(r.deadline_band));
  const dueSoonRows = rows.filter((r) => /بعد|in \d|today|اليوم/i.test(r.deadline_band) && !/متأخر|overdue/i.test(r.deadline_band));
  addTableSheet(wb, loc(lang, "المتأخر", "Overdue"), cols, overdueRows, { isAr, lang });
  addTableSheet(wb, loc(lang, "المستحق قريبًا", "Due Soon"), cols, dueSoonRows, { isAr, lang });

  const byComm = {};
  rows.forEach((r) => {
    const k = r.committee || loc(lang, "غير محدد", "Unspecified");
    byComm[k] = (byComm[k] || 0) + 1;
  });
  addTableSheet(wb, loc(lang, "حسب اللجنة", "By Committee"),
    [{ key: "committee", label: loc(lang, "اللجنة", "Committee") }, { key: "count", label: loc(lang, "العدد", "Count") }],
    Object.keys(byComm).map((k) => ({ committee: k, count: byComm[k] })),
    { isAr, lang });

  addTableSheet(wb, loc(lang, "تعريف الحقول", "Field Definitions"),
    [{ key: "key", label: loc(lang, "المفتاح", "Key") }, { key: "ar", label: "العربية" }, { key: "en", label: "English" }],
    WORK_EXPORT_COLUMNS.map((c) => ({ key: c.key, ar: c.ar, en: c.en })),
    { isAr, lang });
}

function buildGenericDatasetWorkbook(wb, { metadata, data, isAr, language }) {
  const lang = language;
  coverSheet(wb, { metadata, isAr, lang });
  const cols = ((data && data.columns) || []).map((c) => ({ key: c.key, label: c.label }));
  addTableSheet(wb, loc(lang, "البيانات", "Data"), cols, (data && data.rows) || [], { isAr, lang });
}

export async function renderXlsx({ productType, metadata, data, language }) {
  const ExcelJS = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "LIJAN by CONNECTION";
  wb.created = new Date();
  const isAr = language === "ar";
  if (productType === "personal_work_report") {
    buildPersonalWorkWorkbook(wb, { metadata, data, language, isAr });
  } else {
    buildGenericDatasetWorkbook(wb, { metadata, data, isAr, language });
  }
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}