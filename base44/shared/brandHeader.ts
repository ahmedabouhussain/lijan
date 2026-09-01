// Branded markdown header for AI-generated governance documents.
// Prepended to meeting minutes, institutional memory, and other outputs
// so every document carries the RAQEEM brand mark.

export const BRAND_LOGO_URL =
  "https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/8f8c5da44_file_1788277312686.png";

export function brandedMarkdownHeader(titleAr?: string, titleEn?: string): string {
  const title = titleAr || titleEn ? `\n### ${titleAr || titleEn}\n` : "";
  return `<div align="center">\n<img src="${BRAND_LOGO_URL}" alt="RAQEEM" width="100" />\n<br/>\n<strong>رَقِيم™ · RAQEEM™</strong>\n<br/>\n<em>من الصلاحية إلى الأثر · From Mandate to Impact</em>\n</div>\n\n---\n${title}`;
}