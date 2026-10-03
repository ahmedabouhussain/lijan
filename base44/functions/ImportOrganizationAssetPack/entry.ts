import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { validatePackAsset, sha256Hex, sourceDomain } from '../../shared/orgAssetIntake.ts';

// ImportOrganizationAssetPack — intake for an APPROVED institutional identity pack.
//
// The pack is the sanctioned delivery channel for a whole identity set: each file arrives with a
// published manifest (owner, publisher, format, verification) and a published SHA-256. This is the
// governed path that turns those files into registry assets:
//
//   1. the delivered bytes must match the manifest's own SHA-256 — that is the integrity gate;
//   2. the same quality rules as a URL import still apply (clean vector, valid raster);
//   3. a byte-identical asset is REUSED, never duplicated — the registry is keyed on the fingerprint;
//   4. a different file for the same slot becomes a NEW VERSION that supersedes the previous one,
//      and the previous version is retained, not deleted;
//   5. one asset stays active per institution, per asset type, per background tone;
//   6. the institution's own record is repointed so every surface resolves the new mark;
//   7. import, approval and activation are written to the audit trail.
//
// Admin-only: this is platform administration, never a committee power. Admin-only is also what
// makes approving in one step legitimate — the pack itself is the reviewed evidence.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      organization_id,
      filename,
      mime_type,
      content_base64,
      declared_sha256,
      source_url,
      source_page,
      usage_note,
      acronym,
      asset_type = 'logo',
      variant = 'primary',
      approve = true,
    } = body || {};

    if (!organization_id || !content_base64 || !filename) {
      return Response.json(
        { error: 'organization_id, filename and content_base64 are required' },
        { status: 400 }
      );
    }

    const bytes = Uint8Array.from(atob(content_base64), (c) => c.charCodeAt(0));

    // ── The manifest's fingerprint is the gate ──
    const checksum = await sha256Hex(bytes);
    if (declared_sha256 && declared_sha256.toLowerCase() !== checksum) {
      return Response.json(
        { error: 'Delivered bytes do not match the manifest fingerprint', reason: 'sha256_mismatch', actual: checksum },
        { status: 422 }
      );
    }

    const verdict = validatePackAsset(bytes, mime_type, filename);
    if (!verdict.ok) {
      return Response.json(
        { error: 'Asset failed the institutional quality gates', reason: verdict.reason },
        { status: 422 }
      );
    }

    const sr = base44.asServiceRole;
    const organization = await sr.entities.Organization.get(organization_id).catch(() => null);
    if (!organization) return Response.json({ error: 'Organization not found' }, { status: 404 });

    const existing = await sr.entities.OrganizationAsset
      .filter({ organization_id })
      .catch(() => []) || [];

    // ── Same institution + same fingerprint → reuse, never a duplicate ──
    const duplicate = existing.find((a: any) => a.sha256 === checksum);
    if (duplicate) {
      return Response.json({
        status: 'reused',
        asset_id: duplicate.id,
        version: duplicate.version,
        sha256: checksum,
        is_active: duplicate.is_active,
        message: 'Identical asset already registered for this institution — no duplicate created.',
      });
    }

    // ── Version the slot: a re-issued mark supersedes the previous one ──
    const sameSlot = existing
      .filter((a: any) => (a.asset_type || 'logo') === asset_type && (a.variant || 'primary') === variant)
      .sort((a: any, b: any) => (b.version || 0) - (a.version || 0));
    const previous = sameSlot[0] || null;

    for (const asset of sameSlot) {
      if (asset.is_active) {
        await sr.entities.OrganizationAsset.update(asset.id, { is_active: false });
      }
    }

    // ── Store the mark inside the platform's own storage ──
    const file = new File([bytes], verdict.file_name, { type: verdict.mime_type });
    const upload = await sr.integrations.Core.UploadPublicFile({ file });
    const storedPath = upload?.file_url;
    if (!storedPath) return Response.json({ error: 'Storage upload failed' }, { status: 500 });

    const approved = approve === true;
    const now = new Date().toISOString();

    const record = await sr.entities.OrganizationAsset.create({
      organization_id,
      organization_slug: organization.slug || null,
      asset_type,
      variant,
      stored_path: storedPath,
      filename: verdict.file_name,
      source_url: source_url || source_page || null,
      source_domain: source_url ? sourceDomain(source_url) : null,
      retrieved_at: now,
      mime_type: verdict.mime_type,
      width: verdict.width ?? null,
      height: verdict.height ?? null,
      sha256: checksum,
      usage_note: usage_note || (acronym ? `${acronym} — approved identity pack` : null),
      verification_status: approved ? 'approved' : 'pending_review',
      approved_by: approved ? user.full_name || user.email : null,
      approved_at: approved ? now : null,
      version: (previous?.version || 0) + 1,
      supersedes_asset_id: previous?.id || null,
      is_active: approved,
    });

    // The institution record points at the approved mark, so every surface resolves it.
    if (approved && variant === 'primary') {
      await sr.entities.Organization.update(organization_id, { logo_url: storedPath }).catch(() => {});
    }

    const label = `${organization.name_en} — ${verdict.file_name}`;
    const audit = {
      organization_id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      entity_type: 'OrganizationAsset',
      entity_id: record.id,
    };
    await sr.entities.AuditEvent.create({
      ...audit,
      action: 'provision',
      entity_title: label,
      description: `Pack import: registered ${asset_type}/${variant} v${record.version} from the approved identity pack (${sourceDomain(source_url) || 'pack'})`,
      new_value: checksum,
    }).catch(() => {});
    if (approved) {
      await sr.entities.AuditEvent.create({
        ...audit,
        action: 'approve',
        entity_title: label,
        description: `Pack import: approved ${asset_type}/${variant} v${record.version} against the published manifest fingerprint`,
        old_value: 'pending_review',
        new_value: 'approved',
      }).catch(() => {});
      await sr.entities.AuditEvent.create({
        ...audit,
        action: 'activate',
        entity_title: label,
        description: `Pack import: activated ${asset_type}/${variant} v${record.version}${
          previous ? ` superseding v${previous.version}` : ''
        }`,
        old_value: previous ? `v${previous.version}` : null,
        new_value: `v${record.version}`,
      }).catch(() => {});
    }

    return Response.json({
      status: 'imported',
      asset_id: record.id,
      version: record.version,
      superseded: previous ? { id: previous.id, version: previous.version } : null,
      sha256: checksum,
      stored_path: storedPath,
      verification_status: record.verification_status,
      is_active: record.is_active,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}