import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveUserCapabilities } from '../../shared/committeeAuth.ts';

// SavePageConfigurationDraft — autosaves a draft page configuration.
// Requires can_edit_page_drafts capability.
// Enforces optimistic concurrency via draft_version.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { committee_id, page_key, configuration, expected_draft_version } = body;
    if (!committee_id || !page_key) {
      return Response.json({ error: 'committee_id and page_key required' }, { status: 400 });
    }

    // Resolve committee + authority
    const committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    const capabilities = await resolveUserCapabilities(base44, user, committee);
    if (!capabilities.can_edit_page_drafts) {
      return Response.json({ error: 'Insufficient authority: can_edit_page_drafts required' }, { status: 403 });
    }

    // Find existing draft or published config
    let existing = await base44.asServiceRole.entities.PageConfiguration
      .filter({ committee_id: committee.id, page_key, status: 'draft' })
      .catch(() => []);
    existing = (existing || [])[0];

    if (!existing) {
      // Try to find published config to branch from
      let published = await base44.asServiceRole.entities.PageConfiguration
        .filter({ committee_id: committee.id, page_key, status: 'published' })
        .catch(() => []);
      published = (published || [])[0];

      const baseConfig = published || {
        organization_id: committee.organization_id,
        committee_id: committee.id,
        page_key,
        version: 0,
        published_version: published ? published.version : 0,
        draft_version: 1,
      };

      // Optimistic concurrency check
      if (expected_draft_version !== undefined && expected_draft_version !== baseConfig.draft_version) {
        return Response.json({
          error: 'Conflict: draft was modified by another user',
          conflict: true,
          current_draft_version: baseConfig.draft_version,
        }, { status: 409 });
      }

      const created = await base44.asServiceRole.entities.PageConfiguration.create({
        ...baseConfig,
        ...configuration,
        organization_id: committee.organization_id,
        committee_id: committee.id,
        page_key,
        status: 'draft',
        draft_version: (baseConfig.draft_version || 1) + 1,
        sections: stringifyField(configuration.sections, baseConfig.sections),
        labels: stringifyField(configuration.labels, baseConfig.labels),
        table_columns: stringifyField(configuration.table_columns, baseConfig.table_columns),
        filters: stringifyField(configuration.filters, baseConfig.filters),
        role_visibility: stringifyField(configuration.role_visibility, baseConfig.role_visibility),
      });

      return Response.json({ draft: created, created: true });
    }

    // Optimistic concurrency check
    if (expected_draft_version !== undefined && expected_draft_version !== existing.draft_version) {
      return Response.json({
        error: 'Conflict: draft was modified by another user',
        conflict: true,
        current_draft_version: existing.draft_version,
      }, { status: 409 });
    }

    const updated = await base44.asServiceRole.entities.PageConfiguration.update(existing.id, {
      ...configuration,
      draft_version: (existing.draft_version || 1) + 1,
      sections: configuration.sections ? JSON.stringify(configuration.sections) : existing.sections,
      labels: configuration.labels ? JSON.stringify(configuration.labels) : existing.labels,
      table_columns: configuration.table_columns ? JSON.stringify(configuration.table_columns) : existing.table_columns,
      filters: configuration.filters ? JSON.stringify(configuration.filters) : existing.filters,
      role_visibility: configuration.role_visibility ? JSON.stringify(configuration.role_visibility) : existing.role_visibility,
    });

    return Response.json({ draft: updated, created: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function stringifyField(newValue, existingValue) {
  if (newValue !== undefined) return JSON.stringify(newValue);
  return existingValue;
}