// orgAssetIntake.ts — intake rules for the central institutional asset registry.
//
// These rules are enforced SERVER-SIDE at import time, so no client can push an unapproved
// or off-policy mark into the registry. Quality gates follow the LIJAN institutional identity rules:
//   official vector (SVG) preferred → transparent PNG ≥1024px on its longest side → otherwise refuse.
// News sites, social networks and logo-aggregator sites are never an acceptable source.

/** Domains that may legitimately publish a Qatari institutional identity. */
const OFFICIAL_DOMAIN_SUFFIXES = ['.gov.qa', '.qa', '.org.qa'];

/** Explicitly sanctioned non-.gov publishers (their own official corporate domains). */
const OFFICIAL_DOMAINS = new Set([
  'qrdi.org.qa',
  'qstp.qa',
  'invest.qa',
  'www.invest.qa',
  'qfc.qa',
  'www.qfc.qa',
  'qvca.co',
  'www.qvca.co',
]);

/** Never a source: press, social networks, marketplaces and logo aggregators. */
const BLOCKED_DOMAIN_PARTS = [
  'facebook.', 'instagram.', 'twitter.', 'x.com', 'linkedin.', 'youtube.', 'tiktok.',
  'wikipedia.', 'wikimedia.', 'news.', 'gulf-times', 'thepeninsulaqatar', 'aljazeera',
  'seeklogo', 'logowik', 'worldvectorlogo', 'logos-world', 'brandsoftheworld', '1000logos',
  'pngwing', 'freepik', 'pinterest', 'medium.com', 'blogspot', 'wordpress.com',
];

export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Is this URL a legitimate official publisher for an institutional mark? */
export function isOfficialSource(url: string): { ok: boolean; reason?: string } {
  const host = sourceDomain(url);
  if (!host) return { ok: false, reason: 'invalid_url' };
  if (BLOCKED_DOMAIN_PARTS.some((p) => host.includes(p))) return { ok: false, reason: 'blocked_source' };
  if (OFFICIAL_DOMAINS.has(host)) return { ok: true };
  if (OFFICIAL_DOMAIN_SUFFIXES.some((s) => host.endsWith(s))) return { ok: true };
  return { ok: false, reason: 'not_an_official_domain' };
}

const MAX_SVG_BYTES = 3_000_000;
const MAX_PNG_BYTES = 6_000_000;

/** PNG intrinsic size from the IHDR block (bytes 16..24, big-endian). */
function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!isPng) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export type IntakeResult =
  | { ok: true; mime_type: string; width: number | null; height: number | null; file_name: string }
  | { ok: false; reason: string };

/**
 * Validate downloaded asset bytes against the registry's quality gates.
 * SVG is accepted as the official vector original; PNG must be a large transparent-quality original.
 */
export function validateAssetBytes(bytes: Uint8Array, contentType: string, url: string): IntakeResult {
  const lower = (contentType || '').toLowerCase();
  const name = (url.split('/').pop() || 'asset').split('?')[0];

  const looksSvg = lower.includes('svg') || name.toLowerCase().endsWith('.svg');
  const looksPng = lower.includes('png') || name.toLowerCase().endsWith('.png');

  if (looksSvg) {
    if (bytes.byteLength > MAX_SVG_BYTES) return { ok: false, reason: 'svg_too_large' };
    const head = new TextDecoder().decode(bytes.slice(0, 400)).toLowerCase();
    // A real SVG document — never an HTML error/soft-404 page.
    if (!head.includes('<svg')) return { ok: false, reason: 'not_a_vector_document' };
    // An Illustrator/Inkscape export that embeds a raster is not a clean vector original.
    if (head.includes('base64')) return { ok: false, reason: 'svg_embeds_raster' };
    return { ok: true, mime_type: 'image/svg+xml', width: null, height: null, file_name: name || 'logo.svg' };
  }

  if (looksPng) {
    if (bytes.byteLength > MAX_PNG_BYTES) return { ok: false, reason: 'png_too_large' };
    const size = pngSize(bytes);
    if (!size) return { ok: false, reason: 'not_a_png_document' };
    if (Math.max(size.width, size.height) < 1024) return { ok: false, reason: 'png_below_1024px' };
    return { ok: true, mime_type: 'image/png', width: size.width, height: size.height, file_name: name || 'logo.png' };
  }

  return { ok: false, reason: 'unsupported_format' };
}

const MAX_PACK_BYTES = 6_000_000;
const MIN_PACK_LONG_SIDE = 400;

/**
 * Intake rules for an APPROVED identity pack — the sanctioned delivery channel for a whole
 * institutional identity set at once (the LIJAN national committee pack).
 *
 * A pack is not an ad-hoc URL import: every file arrives with a published manifest (owner,
 * publisher, declared format) and a published SHA-256, and the caller must present the manifest's
 * own fingerprint. Byte integrity is therefore checked against the manifest rather than by the
 * size heuristic used for a single URL import — which is what lets a small, genuine primary file
 * (a 447px raster, a JPEG reproduction) enter the registry instead of being refused.
 *
 * Vector quality is still enforced: a pack SVG must be a real, self-contained vector document.
 * Nothing off-policy can enter, because only a platform administrator can run a pack import.
 */
export function validatePackAsset(
  bytes: Uint8Array,
  contentType: string,
  fileName: string
): IntakeResult {
  const lower = (contentType || '').toLowerCase();
  const name = fileName || 'asset';

  if (bytes.byteLength > MAX_PACK_BYTES) return { ok: false, reason: 'asset_too_large' };

  const looksSvg = lower.includes('svg') || name.toLowerCase().endsWith('.svg');
  const looksPng = lower.includes('png') || name.toLowerCase().endsWith('.png');
  const looksJpg = lower.includes('jpeg') || lower.includes('jpg') || /\.jpe?g$/i.test(name);

  if (looksSvg) {
    const head = new TextDecoder().decode(bytes.slice(0, 400)).toLowerCase();
    if (!head.includes('<svg')) return { ok: false, reason: 'not_a_vector_document' };
    if (head.includes('base64')) return { ok: false, reason: 'svg_embeds_raster' };
    return { ok: true, mime_type: 'image/svg+xml', width: null, height: null, file_name: name };
  }

  if (looksPng) {
    const size = pngSize(bytes);
    if (!size) return { ok: false, reason: 'not_a_png_document' };
    if (Math.max(size.width, size.height) < MIN_PACK_LONG_SIDE) return { ok: false, reason: 'png_below_400px' };
    return { ok: true, mime_type: 'image/png', width: size.width, height: size.height, file_name: name };
  }

  if (looksJpg) {
    const size = jpegSize(bytes);
    if (!size) return { ok: false, reason: 'not_a_jpeg_document' };
    if (Math.max(size.width, size.height) < MIN_PACK_LONG_SIDE) return { ok: false, reason: 'jpeg_below_400px' };
    return { ok: true, mime_type: 'image/jpeg', width: size.width, height: size.height, file_name: name };
  }

  return { ok: false, reason: 'unsupported_format' };
}

/** JPEG intrinsic size from the SOF marker. */
function jpegSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const SOF = [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf];
  let i = 2;
  while (i < bytes.byteLength - 9) {
    if (view.getUint8(i) !== 0xff) { i++; continue; }
    const marker = view.getUint8(i + 1);
    if (SOF.includes(marker)) {
      return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    i += 2 + view.getUint16(i + 2);
  }
  return null;
}

/** SHA-256 of the asset bytes, hex encoded — the registry's integrity fingerprint. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}