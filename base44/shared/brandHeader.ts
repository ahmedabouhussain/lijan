// Branded markdown header for AI-generated governance documents.
// Prepended to meeting minutes, institutional memory, and other outputs
// so every document carries the LIJAN brand mark.
// Powered by CONNECTION™ — parent platform identity.

export const BRAND_LOGO_URL =
  "https://media.base44.com/images/public/6a96a0e0cd5dac701b62b7f5/a6183da5e_LijanLogo.png";

export function brandedMarkdownHeader(titleAr?: string, titleEn?: string): string {
  const title = titleAr || titleEn ? `\n### ${titleAr || titleEn}\n` : "";
  return `<div align="center">\n<img src="${BRAND_LOGO_URL}" alt="لِجان · LIJAN" width="100" />\n<br/>\n<strong>لِجان™ · LIJAN™</strong>\n<br/>\n<em>National Councils & Committees Operating System</em>\n<br/>\n<small>Powered by CONNECTION™</small>\n</div>\n\n---\n${title}`;
}