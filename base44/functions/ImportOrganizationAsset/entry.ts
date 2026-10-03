import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { isOfficialSource, validateAssetBytes, sha256Hex, sourceDomain } from '../../shared/orgAssetIntake.ts';

// ImportOrganizationAsset — the ONE governed path that brings an institutional mark into LIJAN.
//
// Downloading happens at IMPORT time (here, on the server), never when a page opens: the asset is
// fetched from the institution's official domain, quality-checked, stored in the app's own platform
// storage, fingerprinted, and recorded in the Organization Asset Registry as `pending_review`.
// Nothing becomes renderable until an administrator approves and activates it.
//
// Admin-only: this is platform administration, never a committee power.

const FETCH_TIMEOUT_MS = 20_000;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { organization_id, source_url, usage_note, variant, asset_type } = body || {};

    if (!organization_id || !source_url) {
      return Response.json({ error: 'organization_id and source_url are required' }, { status: 400 });
    }

    // Only official publishers may be a source. Press, social and aggregator sites are refused.
    const source = isOfficialSource(source_url);
    if (!source.ok) {
      return Response.json({ error: 'Source is not an official domain', reason: source.reason }, { status: 400 });
    }

    const organization = await base44.asServiceRole.entities.Organization.get(organization_id).catch(() => null);
    if (!organization) return Response.json({ error: 'Organization not found' }, { status: 404 });

    // ── Download at import time ──
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(source_url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'LIJAN-Asset-Registry/1.0 (+official identity intake)' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (!response.ok) {
      return Response.json({ error: 'Source did not return the asset', status: response.status }, { status: 502 });
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || '';

    const verdict = validateAssetBytes(bytes, contentType, source_url);
    if (!verdict.ok) {
      return Response.json({ error: 'Asset failed the institutional quality gates', reason: verdict.reason }, { status: 422 });
    }

    const checksum = await sha256Hex(bytes);

    // ── Store in the app's own platform storage (never an external hotlink) ──
    const file = new File([bytes], verdict.file_name, { type: verdict.mime_type });
    const upload = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });
    const storedPath = upload?.file_url;
    if (!storedPath) return Response.json({ error: 'Storage upload failed' }, { status: 500 });

    // ── Version the asset: a re-issued mark supersedes the previous one ──
    const existing = await base44.asServiceRole.entities.OrganizationAsset
      .filter({ organization_id, asset_type: asset_type || 'logo', variant: variant || 'primary' })
      .catch(() => []);
    const previous = (existing || []).sort((a, b) => (b.version || 0) - (a.version || 0))[0] || null;

    // The registry never renders: an import is evidence, not an approval.
    for (const asset of existing || []) {
      if (asset.is_active) await base44.asServiceRole.entities.OrganizationAsset.update(asset.id, { is_active: false });
    }

    const record = await base44.asServiceRole.entities.OrganizationAsset.create({
      organization_id,
      organization_slug: organization.slug || null,
      asset_type: asset_type || 'logo',
      variant: variant || 'primary',
      stored_path: storedPath,
      filename: verdict.file_name,
      source_url,
      source_domain: sourceDomain(source_url),
      retrieved_at: new Date().toISOString(),
      mime_type: verdict.mime_type,
      width: verdict.width,
      height: verdict.height,
      sha256: checksum,
      usage_note: usage_note || null,
      verification_status: 'pending_review',
      version: (previous?.version || 0) + 1,
      supersedes_asset_id: previous?.id || null,
      is_active: false,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'provision',
      entity_type: 'OrganizationAsset',
      entity_id: record.id,
      entity_title: `${organization.name_en} — ${verdict.file_name}`,
      description: `Imported official asset v${record.version} from ${sourceDomain(source_url)} (pending review)`,
      new_value: checksum,
    }).catch(() => {});

    return Response.json({
      status: 'ok',
      asset: record,
      sha256: checksum,
      stored_path: storedPath,
      note: 'Imported as pending_review — approve and activate it in the Asset Registry.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}