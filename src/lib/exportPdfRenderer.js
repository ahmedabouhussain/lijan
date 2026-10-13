// exportPdfRenderer.js — branded PDF renderer for the Institutional Export Engine.
// Uses html2canvas → jsPDF so Arabic shaping, RTL, the tri-logo lockup, maroon band and
// Noto Naskh Arabic all render exactly as the browser shows them. The browser is the only
// reliable Arabic shaping engine we have; we lean on it and paginate the canvas into A4.
import { buildExportContent } from "@/lib/exportContent";

const loc = (lang, ar, en) => (lang === "ar" ? ar : en);
// HTML entities assembled at runtime from fragments so the source never holds a full entity
// (a full entity in source is decoded before validation and breaks the string literal).
const ENT = { amp: "&" + "amp;", lt: "&" + "lt;", gt: "&" + "gt;", quot: "&" + "quot;" };

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, ENT.amp)
    .replace(/</g, ENT.lt)
    .replace(/>/g, ENT.gt)
    .replace(/"/g, ENT.quot);
}

function metaGridHtml(meta) {
  if (!meta?.length) return "";
  const cells = meta.map((m) => `
    <div class="mc">
      <div class="ml">${escapeHtml(m.label)}</div>
      <div class="mv">${escapeHtml(m.value)}</div>
    </div>`).join("");
  return `<div class="mgrid">${cells}</div>`;
}

function tableHtml(table) {
  if (!table?.columns?.length) return "";
  const head = table.columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const body = (table.rows || []).map((r) => `<tr>${table.columns.map((c) => `<td>${escapeHtml(r[c.key] ?? "—")}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function sectionsHtml(sections) {
  return (sections || []).map((s) => `
    <section class="sec">
      <h2 class="sh">${escapeHtml(s.heading)}</h2>
      ${s.body ? `<div class="sb">${escapeHtml(s.body).replace(/\n/g, "<br/>")}</div>` : ""}
      ${s.table ? tableHtml(s.table) : ""}
    </section>`).join("");
}

function buildDocumentHtml({ content, metadata, brandAssets, language }) {
  const isAr = language === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const orgLogo = brandAssets?.org_logo_url;
  const orgLogoImg = orgLogo
    ? `<img src="${orgLogo}" class="logo" crossorigin="anonymous" onerror="this.style.display='none'"/>`
    : `<span class="logo-ph">${loc(language, "شعار الجهة", "Org logo")}</span>`;
  return `<div id="pdf-root" dir="${dir}">
      <div class="logos">
        ${orgLogoImg}
        <img src="${metadata.lijan_logo_url}" class="logo" crossorigin="anonymous" onerror="this.style.display='none'"/>
        <img src="${metadata.connection_logo_url}" class="logo conn" crossorigin="anonymous" onerror="this.style.display='none'"/>
      </div>
      <div class="band">
        <h1 class="bt">${escapeHtml(content.title)}</h1>
        ${content.subtitle ? `<div class="bst">${escapeHtml(content.subtitle)}</div>` : ""}
        <div class="bmeta">${escapeHtml(metadata.template_label)} · ${escapeHtml(isAr ? metadata.classification_label?.ar : metadata.classification_label?.en)}</div>
      </div>
      ${metaGridHtml(content.meta)}
      <div class="body">${sectionsHtml(content.sections)}</div>
      ${metadata.ameen_draft ? `<div class="ameen">${escapeHtml(metadata.ameen_draft_text)}</div>` : ""}
      <div class="foot">${escapeHtml(metadata.identity_text)} · ${escapeHtml(metadata.generated_at_display)}</div>
    </div>`;
}

const CSS = [
  "#pdf-root { width: 794px; padding: 40px 48px; background: #FAF8F5; color: #1F2023; font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }",
  "html[dir='rtl'] #pdf-root { font-family: 'Noto Naskh Arabic', ui-sans-serif, system-ui, sans-serif; }",
  ".logos { display: flex; align-items: center; justify-content: center; gap: 28px; margin-bottom: 18px; min-height: 56px; }",
  ".logos .logo { height: 52px; width: auto; object-fit: contain; }",
  ".logos .logo.conn { height: 30px; }",
  ".logo-ph { font-size: 10px; color: #6E7377; padding: 16px 12px; border: 1px dashed #E7E3DF; border-radius: 6px; }",
  ".band { background: #8A1538; color: #fff; padding: 26px 28px; border-radius: 8px; margin-bottom: 20px; }",
  ".band .bt { margin: 0 0 6px; font-size: 22px; font-weight: 700; line-height: 1.25; }",
  ".band .bst { font-size: 13px; font-weight: 500; opacity: 0.92; margin-bottom: 8px; }",
  ".band .bmeta { font-size: 11px; font-weight: 500; opacity: 0.85; }",
  ".mgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 24px; margin-bottom: 22px; padding: 14px 16px; background: #fff; border: 1px solid #E7E3DF; border-radius: 8px; }",
  ".mc .ml { font-size: 10px; font-weight: 600; color: #6E7376; text-transform: uppercase; letter-spacing: 0.04em; }",
  "html[dir='rtl'] .mc .ml { text-transform: none; letter-spacing: 0; }",
  ".mc .mv { font-size: 12px; font-weight: 500; color: #1F2023; margin-top: 2px; }",
  ".sec { margin-bottom: 18px; }",
  ".sec .sh { font-size: 14px; font-weight: 600; color: #8A1538; border-bottom: 1px solid #E7E3DF; padding-bottom: 5px; margin: 0 0 8px; }",
  ".sec .sb { font-size: 11.5px; line-height: 1.7; color: #1F2023; white-space: normal; }",
  "table { border-collapse: collapse; width: 100%; margin-top: 8px; }",
  "th { background: #8A1538; color: #fff; font-size: 10.5px; font-weight: 600; padding: 7px 9px; text-align: start; }",
  "td { border: 1px solid #E7E3DF; font-size: 10.5px; padding: 7px 9px; text-align: start; vertical-align: top; }",
  "tbody tr:nth-child(even) td { background: #FBF9F7; }",
  ".ameen { margin: 16px 0; padding: 10px 14px; background: #FAEED9; color: #9A5B16; border-radius: 6px; font-size: 11px; font-weight: 600; }",
  ".foot { margin-top: 28px; padding-top: 12px; border-top: 2px solid #B59358; font-size: 9.5px; color: #6E7176; text-align: center; }",
].join("\n");

async function loadImages(container) {
  const imgs = Array.from(container.querySelectorAll("img"));
  await Promise.all(imgs.map((img) => (img.complete ? Promise.resolve() : new Promise((res) => { img.onload = res; img.onerror = res; }))));
  await new Promise((r) => setTimeout(r, 80));
}

export async function renderPdf({ productType, metadata, data, brandAssets, language }) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");
  const content = buildExportContent({ productType, data, metadata, language });

  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-99999px;top:0;z-index:-1;";
  wrapper.innerHTML = "<style>" + CSS + "</style>" + buildDocumentHtml({ content, metadata, brandAssets, language });
  document.body.appendChild(wrapper);
  const root = wrapper.querySelector("#pdf-root");

  try {
    await loadImages(root);
    const canvas = await html2canvas(root, { scale: 2, useCORS: true, backgroundColor: "#FAF8F5", windowWidth: 794 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = 210, pageH = 297;
    const imgW = pageW;
    const imgH = (imgW * canvas.height) / canvas.width;
    let heightLeft = imgH;
    let yShift = 0;
    pdf.addImage(imgData, "PNG", 0, yShift, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      yShift -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, yShift, imgW, imgH);
      heightLeft -= pageH;
    }
    const pages = pdf.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7.5);
      pdf.setTextColor(111, 113, 118);
      const pn = loc(language, "صفحة", "Page") + " " + i + " / " + pages;
      if (language === "ar") pdf.text(pn, pageW - 14, pageH - 6, { align: "right" });
      else pdf.text(pn, 14, pageH - 6);
    }
    return pdf.output("blob");
  } finally {
    document.body.removeChild(wrapper);
  }
}