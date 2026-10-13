// institutionalExportEngine.js — the CENTRAL engine every export goes through.
// Minimal core: brand resolver, CSV renderer, main entry. XLSX renderer lives in exportRenderers.js.
import { base44 } from "@/api/base44Client";
import { BRAND_LOGO_URL, CONNECTION_LOGO_URL, BRAND } from "@/lib/brand";
import { buildDocumentMetadata, templateFor, IDENTITY_TEXT } from "@/lib/exportTemplates";
import { WORK_EXPORT_COLUMNS, buildWorkExportRows } from "@/lib/workExport";
import { renderXlsx } from "@/lib/exportRenderers";

export async function resolveBrandAssets({ organizationId, language }) {
  const isAr = language === "ar";
  const result = { lijan_logo_url: BRAND_LOGO_URL, connection_logo_url: CONNECTION_LOGO_URL, org_logo_url: null, org_logo_missing: false };
  if (organizationId) {
    try {
      const page = await base44.entities.OrganizationAsset.filter({
        organization_id: organizationId, asset_type: "logo", variant: "primary",
        is_active: true, verification_status: "approved",
      }, { limit: 1 });
      const asset = page?.items?.[0];
      if (asset?.source_url) result.org_logo_url = asset.source_url;
      else if (asset?.stored_path) result.org_logo_url = asset.stored_path;
      else result.org_logo_missing = true;
    } catch { result.org_logo_missing = true; }
  }
  result.brand_mark_text = isAr ? `${BRAND.nameAr}${BRAND.trademark}` : `${BRAND.nameEn}${BRAND.trademark}`;
  return result;
}

const loc = (lang, ar, en) => (lang === "ar" ? ar : en);

export function renderCsv({ productType, language, rows, columns }) {
  const cols = columns || productColumns(productType, language);
  const header = cols.map((c) => csvCell(c.label)).join(",");
  const body = (rows || []).map((r) => cols.map((c) => csvCell(r[c.key] ?? "")).join(",")).join("\r\n");
  return "\uFEFF" + [header, body].join("\r\n");
}
function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  const escaped = s.split('"').join('""');
  return '"' + escaped + '"';
}

function productColumns(productType, language) {
  if (productType === "personal_work_report") {
    return WORK_EXPORT_COLUMNS.map((c) => ({ key: c.key, label: loc(language, c.ar, c.en) }));
  }
  return [];
}

function qualityReport(brandAssets, metadata) {
  const missing = [];
  if (brandAssets.org_logo_missing) missing.push("organization_logo");
  return { ok: missing.length === 0, missing, engine_version: metadata.engine_version };
}

async function contentHash(blob) {
  try {
    const buf = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch { return null; }
}

export async function exportInstitutionalDocument({
  productType, organizationId, organizationName, committeeId, committeeName,
  language = "ar", classification = "internal", data, format, requestedBy, purpose,
  ameenDraft, referenceNumber, version,
}) {
  const tpl = templateFor(productType);
  const fmt = format || tpl.default_format;
  const brandAssets = await resolveBrandAssets({ organizationId, language });
  const itemCount = data?.items?.length ?? data?.rows?.length ?? null;
  const metadata = buildDocumentMetadata({
    productType, organizationName, committeeName, language, classification,
    requestedBy, purpose, itemCount, ameenDraft, referenceNumber, version,
  });
  metadata.org_logo_url = brandAssets.org_logo_url;
  metadata.org_logo_missing = brandAssets.org_logo_missing;

  let blob;
  const ext = fmt;
  if (fmt === "xlsx") {
    blob = await renderXlsx({ productType, metadata, data, language });
  } else if (fmt === "csv") {
    const rows = productType === "personal_work_report" ? buildWorkExportRows(data?.items || [], language) : data?.rows;
    const csv = renderCsv({ productType, language, rows, columns: productColumns(productType, language) });
    blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  } else {
    throw new Error('Engine format "' + fmt + '" not yet implemented for "' + productType + '"');
  }

  const q = qualityReport(brandAssets, metadata);
  const hash = await contentHash(blob);
  const safeSlug = (referenceNumber || productType).replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 40);
  const filename = "lijan-" + safeSlug + "-" + new Date().toISOString().slice(0, 10) + "." + ext;

  base44.functions.invoke("LogInstitutionalExport", {
    product_type: productType, format: fmt, language,
    organization_id: organizationId, committee_id: committeeId,
    organization_name: organizationName, committee_name: committeeName,
    classification, item_count: itemCount, purpose, content_hash: hash,
    quality_ok: q.ok, missing_assets: q.missing, engine_version: metadata.engine_version,
  }).catch(() => {});

  return { blob, filename, metadata, quality: q, content_hash: hash };
}

export async function saveExportResult({ blob, filename }) {
  try {
    const { saveAs } = await import("file-saver");
    saveAs(blob, filename);
  } catch {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
}

export { IDENTITY_TEXT };