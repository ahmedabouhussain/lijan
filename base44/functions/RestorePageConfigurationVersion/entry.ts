import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveUserCapabilities } from '../../shared/committeeAuth.ts';

// RestorePageConfigurationVersion — restores a previous published configuration version.
// Requires can_restore_configuration_version capability.
// Creates a NEW version rather than deleting history.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { committee_id, page_key, version_number, change_reason } = body;
    if (!committee_id || !page_key || !version_number) {
      return Response.json({ error: 'committee_id, page_key, version_number required' }, { status: 400 });
    }
    if (!change_reason || !change_reason.trim()) {
      return Response.json({ error: 'change_reason required for restore' }, { status: 400 });
    }

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    const capabilities = await resolveUserCapabilities(base44, user, committee);
    if (!capabilities.can_restore_configuration_version) {
      return Response.json({ error: 'Insufficient authority: can_restore_configuration_version required' }, { status: 403 });
    }

    // Get the version to restore
    let versionList = await base44.asServiceRole.entities.PageConfigurationVersion
      .filter({ committee_id: committee.id, page_key, version_number })
      .catch(() => []);
    const sourceVersion = (versionList || [])[0];
    if (!sourceVersion) return Response.json({ error: 'Version not found' }, { status: 404 });

    const restoredConfig = JSON.parse(sourceVersion.config_snapshot);

    // Determine new version number
    const allVersions = await base44.asServiceRole.entities.PageConfigurationVersion
      .filter({ committee_id: committee.id, page_key })
      .catch(() => []);
    const maxVersion = (allVersions || []).reduce((max, v) => Math.max(max, v.version_number || 0), 0);
    const newVersionNumber = maxVersion + 1;

    const correlationId = `restore-${page_key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Create new immutable version snapshot (restored)
    await base44.asServiceRole.entities.PageConfigurationVersion.create({
      organization_id: committee.organization_id,
      committee_id: committee.id,
      page_key,
      version_number: newVersionNumber,
      config_snapshot: JSON.stringify(restoredConfig),
      change_reason: `Restored from v${version_number}: ${change_reason}`,
      effective_from: new Date().toISOString().split('T')[0],
      published_by_name: user.full_name || user.email,
      published_by_user_id: user.id,
      published_at: new Date().toISOString(),
      audit_correlation_id: correlationId,
      is_current: true,
    });

    // Mark previous versions as not current
    if (allVersions && allVersions.length > 0) {
      await base44.asServiceRole.entities.PageConfigurationVersion.bulkUpdate(
        allVersions.filter(v => v.is_current).map(v => ({ id: v.id, is_current: false }))
      ).catch(() => {});
    }

    // Replace published config with restored values
    let publishedList = await base44.asServiceRole.entities.PageConfiguration
      .filter({ committee_id: committee.id, page_key, status: 'published' })
      .catch(() => []);
    const oldPublished = (publishedList || [])[0];
    if (oldPublished) {
      await base44.asServiceRole.entities.PageConfiguration.delete(oldPublished.id).catch(() => {});
    }

    // Also delete any existing draft
    let draftList = await base44.asServiceRole.entities.PageConfiguration
      .filter({ committee_id: committee.id, page_key, status: 'draft' })
      .catch(() => []);
    const oldDraft = (draftList || [])[0];
    if (oldDraft) {
      await base44.asServiceRole.entities.PageConfiguration.delete(oldDraft.id).catch(() => {});
    }

    // Create new published config from restored snapshot
    const published = await base44.asServiceRole.entities.PageConfiguration.create({
      ...restoredConfig,
      organization_id: committee.organization_id,
      committee_id: committee.id,
      page_key,
      status: 'published',
      version: newVersionNumber,
      published_version: newVersionNumber,
      draft_version: 1,
      change_reason: `Restored from v${version_number}: ${change_reason}`,
      effective_from: new Date().toISOString().split('T')[0],
      published_by_name: user.full_name || user.email,
      published_by_user_id: user.id,
      published_at: new Date().toISOString(),
      audit_correlation_id: correlationId,
    });

    // Create audit event
    await base44.asServiceRole.entities.AuditLog.create({
      organization_id: committee.organization_id,
      committee_id: committee.id,
      actor_name: user.full_name || user.email,
      actor_id: user.id,
      action: 'update',
      entity_type: 'PageConfiguration',
      entity_id: published.id,
      entity_title: `${page_key} restored to v${newVersionNumber}`,
      description: `Restored page configuration for "${page_key}" from v${version_number}`,
      old_value: oldPublished ? `v${oldPublished.version}` : 'default',
      new_value: `v${newVersionNumber} (restored from v${version_number})`,
      authority_context: capabilities.effective_committee_role || 'org_admin',
      correlation_id: correlationId,
    }).catch(() => {});

    return Response.json({
      published,
      version_number: newVersionNumber,
      restored_from: version_number,
      correlation_id: correlationId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}