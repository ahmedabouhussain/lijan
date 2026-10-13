// exportDocxRenderer.js — branded DOCX renderer for the Institutional Export Engine.
// Uses the docx library with RTL section properties for Arabic, a maroon title block,
// metadata paragraphs, headed sections, and comparison tables. One shape (buildExportContent)
// feeds both PDF and DOCX, so the two never disagree on content.
import { buildExportContent } from "@/lib/exportContent";

const loc = (lang, ar, en) => (lang === "ar" ? ar : en);

export async function renderDocx({ productType, metadata, data, language }) {
  const docx = await import("docx");
  const { Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
    WidthType, BorderStyle, ShadingType, PageNumber, Footer, Header, Document, Packer,
    LevelFormat, convertInchesToTwip } = docx;
  const content = buildExportContent({ productType, data, metadata, language });
  const isAr = language === "ar";
  const rtl = { bidirectional: true, alignment: isAr ? AlignmentType.RIGHT : AlignmentType.LEFT };

  const MAROON = "8A1538";
  const MUTED = "6E7376";
  const INK = "1F2023";
  const BAND = "F3EFE8";

  const children = [];

  // Title block
  children.push(new Paragraph({
    ...rtl,
    spacing: { after: 80 },
    children: [new TextRun({ text: content.title || "", bold: true, size: 32, color: MAROON, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })],
  }));
  if (content.subtitle) {
    children.push(new Paragraph({
      ...rtl,
      spacing: { after: 60 },
      children: [new TextRun({ text: content.subtitle, size: 22, color: INK, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })],
    }));
  }
  children.push(new Paragraph({
    ...rtl,
    spacing: { after: 200 },
    children: [new TextRun({ text: metadata.template_label + " · " + (isAr ? metadata.classification_label?.ar : metadata.classification_label?.en), size: 16, color: MUTED, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })],
  }));

  // Metadata grid as a shaded two-column table
  if (content.meta?.length) {
    const rows = content.meta.map((m) => new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, fill: BAND },
          children: [new Paragraph({ ...rtl, children: [new TextRun({ text: m.label, bold: true, size: 16, color: MUTED, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })] })],
        }),
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          children: [new Paragraph({ ...rtl, children: [new TextRun({ text: String(m.value ?? "—"), size: 18, color: INK, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })] })],
        }),
      ],
    }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }));
    children.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  }

  // Sections
  for (const s of content.sections || []) {
    children.push(new Paragraph({
      ...rtl,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: s.heading, bold: true, size: 24, color: MAROON, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })],
    }));
    if (s.body) {
      const paras = String(s.body).split(/\n+/);
      paras.forEach((p) => children.push(new Paragraph({
        ...rtl,
        spacing: { after: 80 },
        children: [new TextRun({ text: p || "—", size: 20, color: INK, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })],
      })));
    }
    if (s.table?.columns?.length) {
      const headerRow = new TableRow({
        tableHeader: true,
        children: s.table.columns.map((c) => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: MAROON },
          children: [new Paragraph({ ...rtl, children: [new TextRun({ text: c.label, bold: true, size: 16, color: "FFFFFF", font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })] })],
        })),
      });
      const bodyRows = (s.table.rows || []).map((r) => new TableRow({
        children: s.table.columns.map((c) => new TableCell({
          children: [new Paragraph({ ...rtl, children: [new TextRun({ text: String(r[c.key] ?? "—"), size: 16, color: INK, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })] })],
        })),
      }));
      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [headerRow, ...bodyRows],
      }));
    }
  }

  if (metadata.ameen_draft) {
    children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
    children.push(new Paragraph({
      ...rtl,
      shading: { type: ShadingType.CLEAR, fill: "FAEED9" },
      children: [new TextRun({ text: metadata.ameen_draft_text, bold: true, size: 18, color: "9A5B16", font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr })],
    }));
  }

  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: metadata.identity_text + " · ", size: 14, color: MUTED, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr }),
        new TextRun({ text: metadata.generated_at_display + " · ", size: 14, color: MUTED, font: isAr ? "Noto Naskh Arabic" : "Inter", rightToLeft: isAr }),
        new TextRun({ children: [PageNumber.CURRENT], size: 14, color: MUTED }),
        new TextRun({ text: " / ", size: 14, color: MUTED }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 14, color: MUTED }),
      ],
    })],
  });

  const doc = new Document({
    creator: "LIJAN by CONNECTION",
    title: content.title || metadata.template_label,
    sections: [{
      properties: {
        page: { margin: { top: convertInchesToTwip(0.8), bottom: convertInchesToTwip(0.8), left: convertInchesToTwip(0.7), right: convertInchesToTwip(0.7) } },
        bidi: isAr,
      },
      footers: { default: footer },
      children,
    }],
  });

  return await Packer.toBlob(doc);
}