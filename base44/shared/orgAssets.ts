// orgAssets.ts — LIJAN™ central institutional asset resolution.
//
// ONE place decides which institutional mark a screen may render:
//   approved + active registry asset → its in-app stored path
//   otherwise                        → the organization's own approved logo_url
//   otherwise                        → null (the caller renders a neutral letter mark)
//
// Logos are NEVER fetched from an external host at render time. The registry stores the
// asset inside the app (`stored_path`) and records where it came from (`source_url`) for audit.

/** Build an organization_id → approved mark index for a set of organizations. */
export async function buildOrgAssetIndex(sr: any, organizationIds: any[]) {
  const ids = [...new Set((organizationIds || []).filter(Boolean))] as string[];
  const index: Record<string, any> = {};
  if (ids.length === 0) return index;

  const assets = await sr.entities.OrganizationAsset
    .filter({ organization_id: { $in: ids }, verification_status: 'approved', is_active: true })
    .catch(() => []);

  for (const asset of assets || []) {
    const current = index[asset.organization_id];
    // Highest version wins, so a re-issued mark supersedes the previous one.
    if (!current || (asset.version || 0) > (current.version || 0)) {
      index[asset.organization_id] = asset;
    }
  }
  return index;
}

/** Resolve the renderable mark for one organization: registry first, organization record second. */
export function resolveOrgMark(organization: any, assetIndex: Record<string, any> = {}) {
  if (!organization) return null;
  const asset = assetIndex[organization.id];
  return asset?.stored_path || organization.logo_url || null;
}