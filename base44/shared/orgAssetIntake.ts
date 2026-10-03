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

/** SHA-256 of the asset bytes, hex encoded — the registry's integrity fingerprint. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}