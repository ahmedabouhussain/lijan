/**
 * LIJAN Document Engine — Frontend document rendering.
 *
 * Uses jspdf (browser-native) for PDF generation.
 * Browser handles Arabic text shaping natively with system fonts.
 *
 * Runtime Spike Result (2026-09-02):
 *   jspdf works in browser → valid %PDF- output with Arabic text.
 *   Backend jspdf NOT available (Deno runtime, browser-only library).
 * Runtime Spike Result (2026-09-02):
 *   jspdf works in browser → valid %PDF- output with Arabic text.
 *   Backend jspdf NOT available (Deno runtime, browser-only library).
 *   Strategy: generate the PDF client-side, then upload it to PRIVATE storage and
 *   keep its identity on the record — never a public URL.
 */

import { base44 } from '@/api/base44Client';
import { arabicFontFaceCss, ARABIC_FONT_STACK } from '@/lib/arabicTypography';
import { uploadPrivateFile, logFileAccess } from '@/lib/secureFiles';

/** SHA-256 of the produced bytes — the document fingerprint, stored with the record. */
async function sha256Hex(blob) {
  const bytes = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const MAROON = [138, 21, 56];
const WARM_WHITE = [250, 248, 245];
const CHARCOAL = [33, 33, 33];
const MUTED = [111, 113, 118];
const GOLD = [181, 154, 91];

/**
 * Render a branded PDF with structured sections.
 * Browser handles Arabic text shaping natively.
 */
export async function renderPDF(sections, meta, lang = 'ar') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // ── Header bar ──
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  const headerTitle = lang === 'ar' ? (meta.title_ar || meta.title) : meta.title;
  doc.text(headerTitle || 'LIJAN Document', margin, 13);
  doc.setFontSize(8);
  doc.text('LIJAN™ | لِجان', pageWidth - margin - 25, 13);
  if (meta.committee_name) {
    doc.setFontSize(9);
    doc.text(meta.committee_name, margin, 22);
  }
  y = 38;

  // ── Metadata strip ──
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  const metaParts = [];
  if (meta.product_type) metaParts.push(`${lang === 'ar' ? 'النوع' : 'Type'}: ${meta.product_type}`);
  if (meta.classification) metaParts.push(`${lang === 'ar' ? 'التصنيف' : 'Class'}: ${meta.classification}`);
  if (meta.generated_by_name) metaParts.push(`${lang === 'ar' ? 'أنشأه' : 'By'}: ${meta.generated_by_name}`);
  if (meta.generated_at) {
    const d = new Date(meta.generated_at);
    metaParts.push(d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB'));
  }
  if (metaParts.length > 0) {
    doc.text(metaParts.join('  ·  '), margin, y);
    y += 7;
  }

  // ── Gold separator ──
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ── Sections ──
  for (const section of sections) {
    const sectionTitle = lang === 'ar' ? section.title_ar : (section.title_en || section.title_ar);
    const sectionContent = lang === 'ar' ? section.content_ar : (section.content_en || section.content_ar);

    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    // Section header
    doc.setFillColor(...WARM_WHITE);
    doc.rect(margin, y - 4, contentWidth, 9, 'F');
    doc.setTextColor(...MAROON);
    doc.setFontSize(11);
    doc.text(sectionTitle || section.section_key, margin + 2, y + 1);
    y += 11;

    // Section content
    doc.setTextColor(...CHARCOAL);
    doc.setFontSize(9);
    if (sectionContent) {
      const lines = doc.splitTextToSize(sectionContent, contentWidth - 4);
      for (const line of lines) {
        if (y > pageHeight - 25) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin + 2, y);
        y += 5;
      }
    } else {
      doc.setTextColor(...MUTED);
      doc.setFontSize(8);
      doc.text(lang === 'ar' ? '— لا يوجد محتوى —' : '— No content —', margin + 2, y);
      y += 5;
    }

    // Source references
    if (section.source_references && section.source_references.length > 0) {
      y += 2;
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      const refText = `${lang === 'ar' ? 'المصادر' : 'Sources'}: ${section.source_references.map(r => r.record_type).join(', ')}`;
      doc.text(refText, margin + 2, y);
      y += 5;
    }

    y += 5;
  }

  // ── Footer on each page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    const verifyLink = meta.verification_id
      ? `Verify: lijan.base44.app/verify/product/${meta.verification_id}`
      : 'LIJAN™ | لِجان';
    doc.text(verifyLink, margin, pageHeight - 8);
    doc.text(`${lang === 'ar' ? 'صفحة' : 'Page'} ${i} / ${pageCount}`, pageWidth - margin - 25, pageHeight - 8);
  }

  return doc;
}

/**
 * Generate the PDF, store it in PRIVATE storage, and record its identity on the
 * ProductInstance: internal storage key, file type, size, fingerprint, version,
 * classification, owner, committee, creation time and the export template.
 * No permanent link is written, and no signed link is ever persisted — a signed
 * link is minted on demand by the governed gate (`RequestFileAccess`) after the
 * server has judged the viewer's permission and scope.
 */
export async function generateAndUploadPDF(product, lang = 'ar') {
  let sections = [];
  try {
    sections = product.generated_content ? JSON.parse(product.generated_content) : [];
  } catch { sections = []; }

  const meta = {
    title: product.title,
    title_ar: product.title_ar || product.title,
    product_type: product.product_type,
    committee_name: product.committee_name,
    classification: product.classification,
    generated_by_name: product.generated_by_name,
    generated_at: product.generated_at,
    verification_id: product.id,
  };

  const doc = await renderPDF(sections, meta, lang);
  const blob = doc.output('blob');
  const fileName = `${product.product_type}_${product.id || Date.now()}.pdf`;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  const storageKey = await uploadPrivateFile(file);
  if (!storageKey) throw new Error('generated_document_upload_failed');

  const fingerprint = await sha256Hex(blob);
  const createdAt = new Date().toISOString();
  const nextVersion = (product.file_version || 0) + 1;

  if (product.id) {
    // The exported file is a governed record, not a public link.
    await base44.entities.ProductInstance.update(product.id, {
      storage_key: storageKey,
      file_type: 'application/pdf',
      file_size_bytes: blob.size,
      document_fingerprint: fingerprint,
      file_version: nextVersion,
      file_classification: product.classification || 'internal',
      file_owner_user_id: product.generated_by_user_id || null,
      file_created_at: createdAt,
      export_template: product.product_type,
      export_format: 'pdf',
    });

    await logFileAccess({
      action: 'upload',
      fileRef: storageKey,
      entityType: 'ProductInstance',
      entityId: product.id,
      committeeId: product.committee_id,
      title: product.title,
      reason: 'generated_document',
    });
  }

  return { storage_key: storageKey, fingerprint, sizeBytes: blob.size, version: nextVersion };
}

/**
 * Open print dialog for the document (browser print → save as PDF).
 * This is the most reliable way to get Arabic-perfect PDF output.
 */
export function printProduct(product, lang = 'ar') {
  let sections = [];
  try {
    sections = product.generated_content ? JSON.parse(product.generated_content) : [];
  } catch { sections = []; }

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const title = lang === 'ar' ? (product.title_ar || product.title) : product.title;

  const sectionsHtml = sections.map(s => {
    const st = lang === 'ar' ? s.title_ar : (s.title_en || s.title_ar);
    const sc = lang === 'ar' ? s.content_ar : (s.content_en || s.content_ar);
    return `<section style="margin-bottom:20px;">
      <h3 style="color:#8A1538;border-bottom:1px solid #E7E3DF;padding-bottom:6px;font-size:14px;margin:0 0 8px;">${st || s.section_key}</h3>
      <p style="line-height:1.9;color:#1F2023;white-space:pre-line;font-size:12px;margin:0;">${sc || '—'}</p>
    </section>`;
  }).join('');

  const html = `<!DOCTYPE html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8">
    <title>${title}</title>
    <style>
      ${arabicFontFaceCss(typeof window !== 'undefined' ? window.location.origin : '')}
      @page { size: A4; margin: 20mm; }
      body { max-width: 800px; margin: 0 auto; padding: 20px; background: #FAF8F5; color: #1F2023; font-size: 11.5pt; font-weight: 400; line-height: 1.6; letter-spacing: 0; }
      /* Arabic documents embed and use the official typeface; English stays Latin */
      html[dir="rtl"] body { font-family: var(--arabic-font); }
      html[dir="ltr"] body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
      .header { background: #8A1538; color: #fff; padding: 24px; border-radius: 12px; margin-bottom: 28px; }
      /* Cover / executive title — Bold 700 */
      .header h1 { margin: 0 0 6px; font-size: 24pt; font-weight: 700; line-height: 1.25; }
      /* Supporting metadata — Medium 500 */
      .header .meta { font-size: 10pt; font-weight: 500; line-height: 1.4; opacity: 0.9; }
      /* Section headings — SemiBold 600 */
      section h3 { font-weight: 600; line-height: 1.25; }
      section p { font-weight: 400; line-height: 1.6; }
      table { border-collapse: collapse; width: 100%; }
      th { font-weight: 600; font-size: 10.5pt; line-height: 1.4; }
      td { font-weight: 400; font-size: 10pt; line-height: 1.4; }
      strong, b { font-weight: 600; }
      .footer { margin-top: 40px; padding-top: 16px; border-top: 2px solid #B59A5B; font-size: 9pt; font-weight: 400; color: #6F7176; text-align: center; }
      @media print { body { background: white; } .header { border-radius: 0; } }
    </style></head><body style="--arabic-font: ${ARABIC_FONT_STACK}">
    <div class="header">
      <h1>${title}</h1>
      <div class="meta">${[product.committee_name, product.product_type, product.classification].filter(Boolean).join(' · ')}</div>
    </div>
    ${sectionsHtml}
    <div class="footer">LIJAN™ | لِجان — ${product.id ? `Verify: lijan.base44.app/verify/product/${product.id}` : ''}</div>
    <script>window.onload = () => { window.print(); }</script>
    </body></html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}