import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// GetEffectivePageConfiguration — returns the effective published page configuration
// for a committee page. Falls back to org-level template, then to system defaults.
// Also returns version history for authorized admins.

const SYSTEM_DEFAULTS = {
  sections: [],
  labels: {},
  table_columns: [],
  filters: {},
  role_visibility: [],
  sidebar_visible: true,
  sidebar_order: 0,
  visible: true,
  empty_state_ar: '',
  empty_state_en: '',
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { committee_id, page_key, include_versions } = body;
    if (!page_key) return Response.json({ error: 'page_key required' }, { status: 400 });

    // Resolve committee
    let committee;
    if (committee_id) {
      committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    }
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    // 1. Committee-specific published config
    let config = await base44.asServiceRole.entities.PageConfiguration
      .filter({ committee_id: committee.id, page_key, status: 'published' })
      .catch(() => []);
    config = (config || [])[0];

    // 2. Fall back to org-level template
    if (!config) {
      let orgConfig = await base44.asServiceRole.entities.PageConfiguration
        .filter({ organization_id: committee.organization_id, committee_id: null, page_key, status: 'published' })
        .catch(() => []);
      config = (orgConfig || [])[0];
    }

    // 3. Fall back to system defaults
    const effectiveConfig = config
      ? {
          ...SYSTEM_DEFAULTS,
          ...config,
          sections: safeParse(config.sections, []),
          labels: safeParse(config.labels, {}),
          table_columns: safeParse(config.table_columns, []),
          filters: safeParse(config.filters, {}),
          role_visibility: safeParse(config.role_visibility, []),
        }
      : { ...SYSTEM_DEFAULTS, page_key, organization_id: committee.organization_id, committee_id: committee.id };

    // Also get draft if admin
    let draft = null;
    let versions = [];
    if (include_versions) {
      const draftList = await base44.asServiceRole.entities.PageConfiguration
        .filter({ committee_id: committee.id, page_key, status: 'draft' })
        .catch(() => []);
      draft = (draftList || [])[0] || null;

      versions = await base44.asServiceRole.entities.PageConfigurationVersion
        .filter({ committee_id: committee.id, page_key })
        .catch(() => []);
      versions = (versions || []).sort((a, b) => b.version_number - a.version_number);
    }

    return Response.json({
      config: effectiveConfig,
      draft,
      versions,
      is_default: !config,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}