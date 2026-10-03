// orgAssets.ts — LIJAN™ central institutional asset resolution.
//
// ONE place decides which institutional mark a screen may render:
//   approved + active registry asset → its in-app stored path
//   otherwise                        → the organization's own approved logo_url
//   otherwise                        → null (the caller renders a neutral letter mark)
//
// Logos are NEVER fetched from an external host at render time. The registry stores the
// asset inside the app (`stored_path`) and records where it came from (`source_url`) for audit.

/**
 * Build an organization_id → approved mark index for a set of organizations.
 *
 * Each institution resolves to a SLOT per background tone, so the primary (light ground) and the
 * reversed (dark ground) marks can both be active at once without one shadowing the other. Within a
 * slot the highest version wins, so a re-issued mark supersedes the previous one.
 */
export async function buildOrgAssetIndex(sr: any, organizationIds: any[]) {
  const ids = [...new Set((organizationIds || []).filter(Boolean))] as string[];
  const index: Record<string, { primary: any; on_dark: any }> = {};
  if (ids.length === 0) return index;

  const assets = await sr.entities.OrganizationAsset
    .filter({ organization_id: { $in: ids }, verification_status: 'approved', is_active: true })
    .catch(() => []);

  for (const asset of assets || []) {
    const slot = asset.variant === 'on_dark' ? 'on_dark' : 'primary';
    const entry = index[asset.organization_id] || { primary: null, on_dark: null };
    const current = entry[slot];
    if (!current || (asset.version || 0) > (current.version || 0)) entry[slot] = asset;
    index[asset.organization_id] = entry;
  }
  return index;
}

/** Resolve the renderable mark for one organization: registry first, organization record second. */
export function resolveOrgMark(organization: any, assetIndex: Record<string, any> = {}) {
  if (!organization) return null;
  const entry = assetIndex[organization.id];
  return entry?.primary?.stored_path || organization.logo_url || null;
}

/** Resolve the reversed mark for a dark ground, falling back to the primary mark. */
export function resolveOrgMarkOnDark(organization: any, assetIndex: Record<string, any> = {}) {
  if (!organization) return null;
  const entry = assetIndex[organization.id];
  return entry?.on_dark?.stored_path || resolveOrgMark(organization, assetIndex);
}