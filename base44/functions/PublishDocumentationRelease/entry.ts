import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { PACK_RELEASE_V11, PACK_DELIVERABLES_V11 } from '../../shared/documentationPackV11.ts';

// Idempotent publication of a documentation release.
// Running it repeatedly never creates duplicate releases or documents:
// the release is keyed by release_id and each document by release + language + relative path.
const EDITABLE_FORMATS = ['docx', 'xlsx', 'pptx'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }
    // Administrators only. An automated/service invocation without a user context is allowed.
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const releaseId = PACK_RELEASE_V11.release_id;
    const now = new Date().toISOString();

    const assets = [];
    for (const deliverable of PACK_DELIVERABLES_V11) {
      for (const language of ['ar', 'en']) {
        for (const entry of deliverable.files[language] || []) {
          const relativePath = entry[0];
          const fileUri = entry[1];
          const filename = relativePath.split('/').pop();
          const format = filename.split('.').pop().toLowerCase();
          assets.push({
            asset_key: `${releaseId}|${language}|${relativePath}`,
            release_id: releaseId,
            deliverable_id: deliverable.deliverable_id,
            language,
            category: deliverable.category,
            title_ar: deliverable.title_ar,
            title_en: deliverable.title_en,
            purpose_ar: deliverable.purpose_ar,
            purpose_en: deliverable.purpose_en,
            relative_path: relativePath,
            filename,
            file_uri: fileUri,
            format,
            version: deliverable.version,
            classification: deliverable.classification,
            owner: deliverable.owner,
            editable: EDITABLE_FORMATS.includes(format),
            archival: format === 'pdf',
            status: 'active',
          });
        }
      }
    }

    const existingReleases = await base44.asServiceRole.entities.DocumentationRelease.filter({ release_id: releaseId });
    const releasePayload = {
      ...PACK_RELEASE_V11,
      status: 'active',
      superseded_by_release_id: null,
      published_by_name: user?.full_name || PACK_RELEASE_V11.owner,
      published_by_user_id: user?.id || null,
      published_at: now,
    };
    let releaseCreated = false;
    if (existingReleases.length > 0) {
      await base44.asServiceRole.entities.DocumentationRelease.update(existingReleases[0].id, releasePayload);
    } else {
      await base44.asServiceRole.entities.DocumentationRelease.create(releasePayload);
      releaseCreated = true;
    }

    // Previous releases stay on record, marked superseded — their audit history is preserved.
    const supersededReleases = await base44.asServiceRole.entities.DocumentationRelease.updateMany(
      { status: 'active', release_id: { $ne: releaseId } },
      { $set: { status: 'superseded', superseded_by_release_id: releaseId } }
    );
    await base44.asServiceRole.entities.DocumentationAsset.updateMany(
      { status: 'active', release_id: { $ne: releaseId } },
      { $set: { status: 'superseded' } }
    );

    const upserted = await base44.asServiceRole.entities.DocumentationAsset.upsert(assets, { key: 'asset_key' });

    await base44.asServiceRole.entities.AuditEvent.create({
      action: 'activate',
      entity_type: 'DocumentationRelease',
      entity_id: releaseId,
      entity_title: PACK_RELEASE_V11.title_en,
      description: `Documentation release ${releaseId} published (${assets.length} documents).`,
      actor_name: user?.full_name || 'LIJAN Platform Office',
      actor_user_id: user?.id || null,
    });

    return Response.json({
      release_id: releaseId,
      release_created: releaseCreated,
      documents_created: upserted?.created ?? null,
      documents_updated: upserted?.updated ?? null,
      documents_total: assets.length,
      superseded_releases: supersededReleases?.modified ?? supersededReleases?.count ?? null,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}