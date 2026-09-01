import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveUserCapabilities } from '../../shared/committeeAuth.ts';

// PublishPageConfiguration — publishes a draft page configuration.
// Requires can_publish_page_configuration capability.
// Creates an immutable PageConfigurationVersion snapshot, creates an audit event,
// and requires a change_reason for material changes.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { committee_id, page_key, change_reason, effective_from, expected_draft_version } = body;
    if (!committee_id || !page_key) {
      return Response.json({ error: 'committee_id and page_key required' }, { status: 400 });
    }
    if (!change_reason || !change_reason.trim()) {
      return Response.json({ error: 'change_reason required for publishing' }, { status: 400 });
    }

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    const capabilities = await resolveUserCapabilities(base44, user, committee);
    if (!capabilities.can_publish_page_configuration) {
      return Response.json({ error: 'Insufficient authority: can_publish_page_configuration required' }, { status: 403 });
    }

    // Get the draft
    let draftList = await base44.asServiceRole.entities.PageConfiguration
      .filter({ committee_id: committee.id, page_key, status: 'draft' })
      .catch(() => []);
    const draft = (draftList || [])[0];
    if (!draft) return Response.json({ error: 'No draft to publish' }, { status: 404 });

    // Optimistic concurrency
    if (expected_draft_version !== undefined && expected_draft_version !== draft.draft_version) {
      return Response.json({
        error: 'Conflict: draft was modified by another user',
        conflict: true,
        current_draft_version: draft.draft_version,
      }, { status: 409 });
    }

    // Determine new version number
    const existingVersions = await base44.asServiceRole.entities.PageConfigurationVersion
      .filter({ committee_id: committee.id, page_key })
      .catch(() => []);
    const maxVersion = (existingVersions || []).reduce((max, v) => Math.max(max, v.version_number || 0), 0);
    const newVersionNumber = maxVersion + 1;

    const correlationId = `pub-${page_key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Build the config snapshot
    const snapshot = {
      title_ar: draft.title_ar,
      title_en: draft.title_en,
      description_ar: draft.description_ar,
      description_en: draft.description_en,
      guidance_ar: draft.guidance_ar,
      guidance_en: draft.guidance_en,
      visible: draft.visible,
      sidebar_visible: draft.sidebar_visible,
      sidebar_order: draft.sidebar_order,
      sections: draft.sections,
      labels: draft.labels,
      table_columns: draft.table_columns,
      filters: draft.filters,
      role_visibility: draft.role_visibility,
      empty_state_ar: draft.empty_state_ar,
      empty_state_en: draft.empty_state_en,
    };

    // Create immutable version snapshot
    await base44.asServiceRole.entities.PageConfigurationVersion.create({
      organization_id: committee.organization_id,
      committee_id: committee.id,
      page_key,
      version_number: newVersionNumber,
      config_snapshot: JSON.stringify(snapshot),
      change_reason,
      effective_from: effective_from || new Date().toISOString().split('T')[0],
      published_by_name: user.full_name || user.email,
      published_by_user_id: user.id,
      published_at: new Date().toISOString(),
      audit_correlation_id: correlationId,
      is_current: true,
    });

    // Mark previous versions as not current
    if (existingVersions && existingVersions.length > 0) {
      await base44.asServiceRole.entities.PageConfigurationVersion.bulkUpdate(
        existingVersions.filter(v => v.is_current).map(v => ({ id: v.id, is_current: false }))
      ).catch(() => {});
    }

    // Delete any existing published config, then promote draft to published
    let publishedList = await base44.asServiceRole.entities.PageConfiguration
      .filter({ committee_id: committee.id, page_key, status: 'published' })
      .catch(() => []);
    const oldPublished = (publishedList || [])[0];
    if (oldPublished) {
      await base44.asServiceRole.entities.PageConfiguration.delete(oldPublished.id).catch(() => {});
    }

    // Promote draft to published
    const published = await base44.asServiceRole.entities.PageConfiguration.update(draft.id, {
      status: 'published',
      version: newVersionNumber,
      published_version: newVersionNumber,
      change_reason,
      effective_from: effective_from || new Date().toISOString().split('T')[0],
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
      action: 'publish',
      entity_type: 'PageConfiguration',
      entity_id: draft.id,
      entity_title: `${page_key} v${newVersionNumber}`,
      description: `Published page configuration for "${page_key}" — ${change_reason}`,
      old_value: oldPublished ? `v${oldPublished.version}` : 'default',
      new_value: `v${newVersionNumber}`,
      authority_context: capabilities.effective_committee_role || 'org_admin',
      correlation_id: correlationId,
    }).catch(() => {});

    return Response.json({
      published,
      version_number: newVersionNumber,
      correlation_id: correlationId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}