// LIJAN™ — Arabic Typography & Embedding Standard: Noto Naskh Arabic.
//
// The official Arabic typeface of the platform. Bundled locally under
// /fonts/NotoNaskhArabic/ (never fetched from Google Fonts or any external CDN),
// so Arabic rendering is identical in the interface, printed documents, exported
// files and closed/offline sovereign environments.
//
// Weight system (the ONLY four weights permitted in Arabic output):
//   400 Regular  — body text, paragraphs, table content
//   500 Medium   — important text / labels
//   600 SemiBold — subheadings, table headers, cards
//   700 Bold     — main headings and cover titles
// Never lighter than 400 for official Arabic text. Never artificial/faux bold —
// only the real weights above (font-synthesis: none).

export const ARABIC_FONT_NAME = "Noto Naskh Arabic";
export const ARABIC_FONT_STACK = "'Noto Naskh Arabic', ui-sans-serif, system-ui, sans-serif";
export const LATIN_FONT_STACK = "'Inter', ui-sans-serif, system-ui, sans-serif";

export const ARABIC_FONT_WEIGHTS = {
  body: 400,
  label: 500,
  subheading: 600,
  heading: 700,
};

// Line height — Naskh needs more room than Latin faces.
export const ARABIC_LINE_HEIGHTS = {
  body: 1.55,      // long-form Arabic text (1.45–1.60)
  compact: 1.4,    // short Arabic text (1.30–1.45)
  heading: 1.25,   // Arabic headings (1.15–1.30)
};

export const ARABIC_FONT_FILES = {
  400: "NotoNaskhArabic-Regular.ttf",
  500: "NotoNaskhArabic-Medium.ttf",
  600: "NotoNaskhArabic-SemiBold.ttf",
  700: "NotoNaskhArabic-Bold.ttf",
};

/** @font-face rules for locally bundled Noto Naskh Arabic (four real weights). */
export function arabicFontFaceCss(baseUrl = "") {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return Object.entries(ARABIC_FONT_FILES)
    .map(([weight, file]) => `@font-face {
  font-family: '${ARABIC_FONT_NAME}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('${base}/fonts/NotoNaskhArabic/${file}') format('truetype');
}`)
    .join("\n");
}

/**
 * Full typographic block for exported/printed Arabic documents (PDF via browser
 * print, memos, reports, meeting packs). Call with the absolute app origin so the
 * font resolves inside a print window — this is what embeds the face into the PDF.
 */
export function arabicDocumentTypographyCss(baseUrl = "") {
  return `${arabicFontFaceCss(baseUrl)}
* { box-sizing: border-box; }
html, body { letter-spacing: 0 !important; font-synthesis: none; }
body {
  font-family: ${ARABIC_FONT_STACK};
  font-weight: ${ARABIC_FONT_WEIGHTS.body};
  line-height: ${ARABIC_LINE_HEIGHTS.body};
  text-shadow: none;
}
h1 { font-family: ${ARABIC_FONT_STACK}; font-weight: ${ARABIC_FONT_WEIGHTS.heading}; line-height: ${ARABIC_LINE_HEIGHTS.heading}; }
h2, h3 { font-family: ${ARABIC_FONT_STACK}; font-weight: ${ARABIC_FONT_WEIGHTS.subheading}; line-height: ${ARABIC_LINE_HEIGHTS.heading}; }
h4, h5, h6 { font-family: ${ARABIC_FONT_STACK}; font-weight: ${ARABIC_FONT_WEIGHTS.subheading}; line-height: ${ARABIC_LINE_HEIGHTS.compact}; }
.label, .meta { font-weight: ${ARABIC_FONT_WEIGHTS.label}; line-height: ${ARABIC_LINE_HEIGHTS.compact}; }
table { border-collapse: collapse; width: 100%; }
th { font-family: ${ARABIC_FONT_STACK}; font-weight: ${ARABIC_FONT_WEIGHTS.subheading}; }
td { font-family: ${ARABIC_FONT_STACK}; font-weight: ${ARABIC_FONT_WEIGHTS.body}; line-height: ${ARABIC_LINE_HEIGHTS.compact}; }
strong, b { font-weight: ${ARABIC_FONT_WEIGHTS.subheading}; }
[dir="rtl"] { text-align: right; }
[dir="rtl"] th, [dir="rtl"] td { text-align: right; }`;
}

// Official Arabic-Indic digits — for government-facing Arabic output only.
const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/** Convert Latin digits to Arabic-Indic digits (metrics/KPIs keep Latin digits). */
export function toArabicIndicDigits(value) {
  return String(value ?? "").replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}