/**
 * LIJAN™ Document Generators
 *
 * Generates real downloadable files: DOCX, PDF, PPTX, XLSX.
 * Uses: docx, pptxgenjs, exceljs, jspdf, file-saver.
 *
 * All files include the official LIJAN™ logo, branding, and metadata.
 */

import { saveAs } from "file-saver";
import { DOCUMENT_CATALOG, OFFICIAL_LOGO_URL, INTRO_VIDEO_URL, CLASSIFICATIONS } from "./catalog";
import { getDocumentContent } from "./content/index";

// ── Brand constants ──
const MAROON = "8A1538";
const MAROON_DARK = "5F0F28";
const WARM_WHITE = "FAF8F5";
const CHARCOAL = "1F2023";
const MUTED = "6F7176";
const GOLD = "B59358";
const WHITE = "FFFFFF";

let logoBufferCache = null;

/**
 * Fetch the official logo as an ArrayBuffer (cached).
 */
async function getLogoBuffer() {
  if (logoBufferCache) return logoBufferCache;
  try {
    const res = await fetch(OFFICIAL_LOGO_URL);
    logoBufferCache = await res.arrayBuffer();
    return logoBufferCache;
  } catch {
    return null;
  }
}

/**
 * Format date for document headers.
 */
function formatDate(lang) {
  const d = new Date();
  return d.toLocaleDateString(lang === "ar" ? "ar-SA" : "en-GB", {
    year: "numeric", month: "long", day: "numeric",
  });
}

/**
 * Get classification label.
 */
function getClassificationLabel(classification, lang) {
  const c = CLASSIFICATIONS[classification];
  if (!c) return "";
  return lang === "ar" ? c.ar : c.en;
}

// ═══════════════════════════════════════════════════════════════
// DOCX GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateDOCX(docMeta, content, lang = "ar") {
  const {
    Document, Packer, Paragraph, TextRun, Header, Footer, PageNumber,
    AlignmentType, HeadingLevel, ImageRun, Table, TableRow, TableCell,
    WidthType, BorderStyle, convertInchesToTwip,
  } = await import("docx");

  const isRTL = lang === "ar";
  const title = isRTL ? (docMeta.title_ar || docMeta.title_en) : docMeta.title_en;
  const classificationLabel = getClassificationLabel(docMeta.classification, lang);
  const logoBuffer = await getLogoBuffer();

  // Cover page elements
  const coverElements = [];

  if (logoBuffer) {
    try {
      coverElements.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 2000, after: 400 },
        children: [new ImageRun({
          data: logoBuffer,
          transformation: { width: 200, height: 100 },
          type: "png",
        })],
      }));
    } catch { /* skip logo if it fails */ }
  }

  coverElements.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 400, after: 200 },
    bidirectional: isRTL,
    children: [new TextRun({
      text: title,
      bold: true,
      size: 48,
      color: MAROON,
      rightToLeft: isRTL,
      font: isRTL ? "Arial" : "Calibri",
    })],
  }));

  coverElements.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 200 },
    bidirectional: isRTL,
    children: [new TextRun({
      text: isRTL ? "لِجان™ — نظام تشغيل المجالس واللجان الوطنية" : "LIJAN™ — National Councils & Committees Operating System",
      size: 24,
      color: MUTED,
      rightToLeft: isRTL,
    })],
  }));

  coverElements.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 600 },
    children: [new TextRun({
      text: isRTL ? "مدعوم بواسطة CONNECTION™" : "Powered by CONNECTION™",
      size: 20,
      color: GOLD,
      italics: true,
    })],
  }));

  // Metadata table on cover
  const metaRows = [
    [isRTL ? "الإصدار" : "Version", docMeta.version || "1.0"],
    [isRTL ? "التاريخ" : "Date", formatDate(lang)],
    [isRTL ? "المالك" : "Owner", docMeta.owner || "LIJAN Platform Office"],
    [isRTL ? "التصنيف" : "Classification", classificationLabel],
    [isRTL ? "الحالة" : "Status", isRTL ? "معتمد" : "Approved"],
  ];

  coverElements.push(new Table({
    width: { size: 60, type: WidthType.PERCENTAGE },
    alignment: AlignmentType.CENTER,
    rows: metaRows.map(([label, value]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 30, type: WidthType.PERCENTAGE },
          shading: { fill: WARM_WHITE },
          children: [new Paragraph({
            bidirectional: isRTL,
            children: [new TextRun({ text: label, bold: true, size: 20, color: MAROON, rightToLeft: isRTL })],
          })],
        }),
        new TableCell({
          width: { size: 70, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            bidirectional: isRTL,
            children: [new TextRun({ text: value, size: 20, color: CHARCOAL, rightToLeft: isRTL })],
          })],
        }),
      ],
    })),
  }));

  // Content sections
  const contentElements = [new Paragraph({ children: [new TextRun({ text: "", size: 2 })], pageBreakBefore: true })];

  const sections = content.sections || [];
  sections.forEach((section, idx) => {
    const sectionTitle = isRTL ? (section.title_ar || section.title_en) : (section.title_en || section.title_ar);
    const sectionContent = isRTL ? (section.content_ar || section.content_en) : (section.content_en || section.content_ar);

    contentElements.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      bidirectional: isRTL,
      children: [new TextRun({
        text: `${idx + 1}. ${sectionTitle}`,
        bold: true,
        size: 32,
        color: MAROON,
        rightToLeft: isRTL,
      })],
    }));

    if (sectionContent) {
      const paragraphs = sectionContent.split("\n\n");
      paragraphs.forEach((para) => {
        if (para.trim()) {
          contentElements.push(new Paragraph({
            spacing: { before: 100, after: 100, line: 360 },
            bidirectional: isRTL,
            alignment: isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
            children: [new TextRun({
              text: para.trim(),
              size: 22,
              color: CHARCOAL,
              rightToLeft: isRTL,
            })],
          }));
        }
      });
    }
  });

  // Footer
  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200 },
        border: { top: { style: BorderStyle.SINGLE, size: 1, color: GOLD } },
        children: [
          new TextRun({ text: "LIJAN™ | ", size: 16, color: MAROON, bold: true }),
          new TextRun({ text: `${classificationLabel}  ·  `, size: 16, color: MUTED }),
          new TextRun({ text: isRTL ? "صفحة " : "Page ", size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED }),
          new TextRun({ text: " / ", size: 16, color: MUTED }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED }),
        ],
      }),
    ],
  });

  const doc = new Document({
    creator: "LIJAN™ Platform",
    title: title,
    description: docMeta.description_en,
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
        },
      },
      footers: { default: footer },
      children: [...coverElements, ...contentElements],
    }],
  });

  const blob = await Packer.toBlob(doc);
  return blob;
}

// ═══════════════════════════════════════════════════════════════
// PDF GENERATOR (jspdf)
// ═══════════════════════════════════════════════════════════════

export async function generatePDF(docMeta, content, lang = "ar") {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const isRTL = lang === "ar";
  const title = isRTL ? (docMeta.title_ar || docMeta.title_en) : docMeta.title_en;
  const classificationLabel = getClassificationLabel(docMeta.classification, lang);

  // ── Cover page ──
  doc.setFillColor(...hexToRgb(MAROON));
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Logo placeholder (white box with text since we can't easily embed remote images in jspdf)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(pageWidth / 2 - 30, 50, 60, 30, 3, 3, "F");
  doc.setTextColor(...hexToRgb(MAROON));
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("LIJAN™", pageWidth / 2, 70, { align: "center" });

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.text(title, pageWidth / 2, 120, { align: "center" });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(
    isRTL ? "لِجان™ — نظام تشغيل المجالس واللجان الوطنية" : "LIJAN™ — National Councils & Committees Operating System",
    pageWidth / 2, 135, { align: "center" }
  );

  // Gold separator
  doc.setDrawColor(...hexToRgb(GOLD));
  doc.setLineWidth(0.8);
  doc.line(pageWidth / 2 - 30, 145, pageWidth / 2 + 30, 145);

  // Powered by
  doc.setFontSize(11);
  doc.setTextColor(...hexToRgb(GOLD));
  doc.text(isRTL ? "مدعوم بواسطة CONNECTION™" : "Powered by CONNECTION™", pageWidth / 2, 155, { align: "center" });

  // Metadata
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  const metaY = 180;
  const metaItems = [
    `${isRTL ? "الإصدار" : "Version"}: ${docMeta.version || "1.0"}`,
    `${isRTL ? "التاريخ" : "Date"}: ${formatDate(lang)}`,
    `${isRTL ? "التصنيف" : "Classification"}: ${classificationLabel}`,
    `${isRTL ? "المالك" : "Owner"}: ${docMeta.owner || "LIJAN Platform Office"}`,
  ];
  metaItems.forEach((item, i) => {
    doc.text(item, pageWidth / 2, metaY + i * 8, { align: "center" });
  });

  // ── Content pages ──
  const sections = content.sections || content.slides || [];
  sections.forEach((section, idx) => {
    doc.addPage();
    y = margin;

    const sectionTitle = isRTL ? (section.title_ar || section.title_en) : (section.title_en || section.title_ar);
    const sectionContent = isRTL ? (section.content_ar || section.content_en) : (section.content_en || section.content_ar);

    // Header bar
    doc.setFillColor(...hexToRgb(MAROON));
    doc.rect(0, 0, pageWidth, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("LIJAN™", margin, 13);
    doc.text(title, pageWidth - margin, 13, { align: "right" });
    y = 30;

    // Section title
    doc.setTextColor(...hexToRgb(MAROON));
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(`${idx + 1}. ${sectionTitle}`, contentWidth);
    doc.text(titleLines, margin, y);
    y += titleLines.length * 7 + 3;

    // Gold separator
    doc.setDrawColor(...hexToRgb(GOLD));
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    // Content
    doc.setTextColor(...hexToRgb(CHARCOAL));
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (sectionContent) {
      const paragraphs = sectionContent.split("\n\n");
      paragraphs.forEach((para) => {
        if (para.trim()) {
          const lines = doc.splitTextToSize(para.trim(), contentWidth);
          for (const line of lines) {
            if (y > pageHeight - 25) {
              doc.addPage();
              y = margin;
            }
            doc.text(line, margin, y);
            y += 5.5;
          }
          y += 3;
        }
      });
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(...hexToRgb(MUTED));
      doc.setDrawColor(...hexToRgb(GOLD));
      doc.setLineWidth(0.3);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      doc.text(`LIJAN™  ·  ${classificationLabel}`, margin, pageHeight - 7);
      doc.text(`${isRTL ? "صفحة" : "Page"} ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 7, { align: "right" });
    }
  });

  const blob = doc.output("blob");
  return blob;
}

// ═══════════════════════════════════════════════════════════════
// PPTX GENERATOR (pptxgenjs)
// ═══════════════════════════════════════════════════════════════

export async function generatePPTX(docMeta, content, lang = "ar") {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "LIJAN_16x9", width: 13.333, height: 7.5 });
  pptx.layout = "LIJAN_16x9";
  pptx.author = "LIJAN™ Platform";
  pptx.title = docMeta.title_en;

  const isRTL = lang === "ar";
  const title = isRTL ? (docMeta.title_ar || docMeta.title_en) : docMeta.title_en;
  const classificationLabel = getClassificationLabel(docMeta.classification, lang);
  const slides = content.slides || [];

  slides.forEach((slide, idx) => {
    const s = pptx.addSlide();
    s.background = { color: slide.layout === "cover" ? MAROON_DARK : WARM_WHITE };

    // Logo on every slide (top-right for LTR, top-left for RTL)
    try {
      s.addImage({
        path: OFFICIAL_LOGO_URL,
        x: isRTL ? 0.3 : 12.2, y: 0.2, w: 0.9, h: 0.45,
      });
    } catch { /* skip */ }

    const slideTitle = isRTL ? (slide.title_ar || slide.title_en) : (slide.title_en || slide.title_ar);
    const slideContent = isRTL ? (slide.content_ar || slide.content_en) : (slide.content_en || slide.content_ar);

    if (slide.layout === "cover") {
      // Cover slide
      s.addText("LIJAN™", {
        x: 1, y: 2.5, w: 11.333, h: 0.8,
        fontSize: 44, bold: true, color: WHITE,
        align: "center", fontFace: "Arial",
      });
      s.addText(title, {
        x: 1, y: 3.4, w: 11.333, h: 0.6,
        fontSize: 28, color: WHITE,
        align: "center", fontFace: "Arial",
      });
      s.addText(isRTL ? "مدعوم بواسطة CONNECTION™" : "Powered by CONNECTION™", {
        x: 1, y: 4.2, w: 11.333, h: 0.4,
        fontSize: 16, color: GOLD, italic: true,
        align: "center", fontFace: "Arial",
      });
      s.addText(`${classificationLabel}  ·  v${docMeta.version}`, {
        x: 1, y: 5.0, w: 11.333, h: 0.3,
        fontSize: 11, color: WHITE, align: "center",
      });
    } else if (slide.layout === "video") {
      // Video slide — cover image + play button
      s.addText(slideTitle, {
        x: 0.5, y: 0.8, w: 12.333, h: 0.6,
        fontSize: 28, bold: true, color: MAROON,
        align: isRTL ? "right" : "left", fontFace: "Arial",
      });
      // Video placeholder
      s.addShape("rect", { x: 3, y: 2, w: 7.333, h: 4, fill: { color: CHARCOAL }, line: { color: GOLD, width: 2 } });
      s.addText("▶", { x: 5.9, y: 3.5, w: 1.5, h: 1, fontSize: 48, color: WHITE, align: "center" });
      s.addText(isRTL ? "اضغط للتشغيل" : "Click to Play", {
        x: 3, y: 6.1, w: 7.333, h: 0.4,
        fontSize: 14, color: MUTED, align: "center",
      });
      // Speaker notes
      s.addNotes(isRTL
        ? `فيديو المقدمة: ${INTRO_VIDEO_URL}\nشغّل الفيديو بالنقر. انتقال هادئ من الغلاف.`
        : `Intro video: ${INTRO_VIDEO_URL}\nClick to play. Calm transition from cover.`);
    } else {
      // Content slide
      s.addText(slideTitle, {
        x: 0.5, y: 0.4, w: 12.333, h: 0.7,
        fontSize: 26, bold: true, color: MAROON,
        align: isRTL ? "right" : "left", fontFace: "Arial",
      });
      // Gold separator
      s.addShape("line", { x: 0.5, y: 1.2, w: 12.333, h: 0, line: { color: GOLD, width: 1.5 } });

      if (slideContent) {
        s.addText(slideContent, {
          x: 0.8, y: 1.5, w: 11.733, h: 5.5,
          fontSize: 16, color: CHARCOAL,
          align: isRTL ? "right" : "left",
          valign: "top",
          fontFace: "Arial",
          lineSpacing: 28,
        });
      }

      // Footer
      s.addText(`LIJAN™  ·  ${classificationLabel}  ·  ${idx + 1}/${slides.length}`, {
        x: 0.5, y: 7.0, w: 12.333, h: 0.3,
        fontSize: 9, color: MUTED, align: isRTL ? "right" : "left",
      });

      // Speaker notes
      s.addNotes(slideContent || "");
    }
  });

  const blob = await pptx.writeBlob();
  return blob;
}

// ═══════════════════════════════════════════════════════════════
// XLSX GENERATOR (exceljs)
// ═══════════════════════════════════════════════════════════════

export async function generateXLSX(docMeta, content, lang = "ar") {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "LIJAN™ Platform";
  wb.title = docMeta.title_en;

  const isRTL = lang === "ar";
  const classificationLabel = getClassificationLabel(docMeta.classification, lang);
  const sheets = content.sheets || [];

  sheets.forEach((sheetDef) => {
    const sheetName = (isRTL ? sheetDef.name_ar : sheetDef.name_en) || sheetDef.id;
    const ws = wb.addWorksheet(sheetName.substring(0, 31), {
      views: [{ rightToLeft: isRTL, showGridLines: false }],
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
    });

    // Title row
    ws.mergeCells(1, 1, 1, sheetDef.columns.length);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = `LIJAN™  ·  ${isRTL ? sheetDef.name_ar : sheetDef.name_en}`;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF" + WHITE } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + MAROON } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 30;

    // Description row
    ws.mergeCells(2, 1, 2, sheetDef.columns.length);
    const descCell = ws.getCell(2, 1);
    descCell.value = isRTL ? sheetDef.description_ar : sheetDef.description_en;
    descCell.font = { size: 10, color: { argb: "FF" + MUTED }, italic: true };
    descCell.alignment = { horizontal: "center" };
    ws.getRow(2).height = 20;

    // Classification row
    ws.mergeCells(3, 1, 3, sheetDef.columns.length);
    const classCell = ws.getCell(3, 1);
    classCell.value = `${isRTL ? "التصنيف" : "Classification"}: ${classificationLabel}  ·  v${docMeta.version}  ·  ${formatDate(lang)}`;
    classCell.font = { size: 9, color: { argb: "FF" + GOLD } };
    classCell.alignment = { horizontal: "center" };

    // Header row (row 5)
    const headerRow = ws.getRow(5);
    sheetDef.columns.forEach((col, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = isRTL ? col.label_ar : col.label_en;
      cell.font = { bold: true, size: 11, color: { argb: "FF" + WHITE } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + MAROON_DARK } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FF" + GOLD } },
        bottom: { style: "thin", color: { argb: "FF" + GOLD } },
        left: { style: "thin", color: { argb: "FF" + GOLD } },
        right: { style: "thin", color: { argb: "FF" + GOLD } },
      };
      ws.getColumn(i + 1).width = col.width || 20;
    });
    ws.getRow(5).height = 25;

    // Freeze header
    ws.views = [{ rightToLeft: isRTL, showGridLines: false, ySplit: 5, xSplit: 0, topLeftCell: "A6", activeCell: "A6" }];

    // Data rows
    sheetDef.rows.forEach((row, rowIdx) => {
      const dataRow = ws.getRow(6 + rowIdx);
      sheetDef.columns.forEach((col, i) => {
        const cell = dataRow.getCell(i + 1);
        cell.value = row[col.key] || "";
        cell.font = { size: 10, color: { argb: "FF" + CHARCOAL } };
        cell.alignment = { horizontal: isRTL ? "right" : "left", vertical: "middle", wrapText: true };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE7E3DF" } },
        };
        if (rowIdx % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAF8F5" } };
        }
      });
      dataRow.height = 22;
    });

    // Footer row
    const footerRow = ws.getRow(6 + sheetDef.rows.length + 1);
    ws.mergeCells(footerRow.number, 1, footerRow.number, sheetDef.columns.length);
    const footerCell = footerRow.getCell(1);
    footerCell.value = `LIJAN™  ·  ${classificationLabel}  ·  ${isRTL ? "صفحة" : "Sheet"}: ${sheetName}`;
    footerCell.font = { size: 9, color: { argb: "FF" + MUTED }, italic: true };
    footerCell.alignment = { horizontal: "center" };
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

/**
 * Trigger file download from blob.
 */
export function downloadBlob(blob, fileName) {
  saveAs(blob, fileName);
}

/**
 * Generate a document and trigger download.
 * Returns { blob, fileName, sizeBytes }.
 */
export async function generateAndDownload(docId, format, lang = "ar", user = null) {
  const docMeta = DOCUMENT_CATALOG.find((d) => d.id === docId);
  if (!docMeta) throw new Error("Document not found: " + docId);

  const content = getDocumentContent(docId);
  if (!content) throw new Error("Content not found: " + docId);

  let blob;
  let ext;

  if (format === "docx") {
    blob = await generateDOCX(docMeta, content, lang);
    ext = "docx";
  } else if (format === "pdf") {
    blob = await generatePDF(docMeta, content, lang);
    ext = "pdf";
  } else if (format === "pptx") {
    blob = await generatePPTX(docMeta, content, lang);
    ext = "pptx";
  } else if (format === "xlsx") {
    blob = await generateXLSX(docMeta, content, lang);
    ext = "xlsx";
  } else {
    throw new Error("Unsupported format: " + format);
  }

  const langSuffix = lang === "ar" ? "AR" : "EN";
  const fileName = `${docMeta.key}_${langSuffix}_v${docMeta.version}.${ext}`;

  downloadBlob(blob, fileName);

  // Log download
  if (user) {
    try {
      const { base44 } = await import("@/api/base44Client");
      await base44.entities.DocumentationDownloadLog.create({
        user_id: user.id,
        user_name: user.full_name || user.email,
        user_email: user.email,
        document_key: docMeta.key,
        document_title: lang === "ar" ? docMeta.title_ar : docMeta.title_en,
        language: lang,
        format: format,
        version: docMeta.version,
        action: "download",
        file_size_bytes: blob.size,
        downloaded_at: new Date().toISOString(),
      });
    } catch { /* logging is best-effort */ }
  }

  return { blob, fileName, sizeBytes: blob.size };
}