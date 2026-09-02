import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeAr, normalizeEn, isPossibleDuplicate, extractDomain, type IdentityResolution } from '../../shared/orgIdentityResolver.ts';

// ResolveOrganizationIdentity — determines whether an organization can be provisioned
// or already exists, before any write operation.
//
// Resolution chain:
//   1. Search by directory_key (canonical)
//   2. Search by normalized Arabic name
//   3. Search by normalized English name
//   4. Detect possible duplicates
//   5. Check current user's membership
//   6. Check pending access requests
//
// Returns a decisive result BEFORE any creation.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { directory_key, name_ar, name_en, official_email } = body;

    if (!name_ar && !name_en && !directory_key) {
      return Response.json({ error: 'directory_key or name_ar/name_en is required' }, { status: 400 });
    }

    // Fetch ALL organizations (service role bypasses RLS) — exclude merged duplicates
    const allOrgs = await base44.asServiceRole.entities.Organization.list('-created_date', 500);
    const activeOrgs = (allOrgs || []).filter(
      (o) => o.status !== 'merged_duplicate' && o.merge_status !== 'merged_duplicate'
    );

    // --- 1. Search by directory_key (canonical) ---
    let matchedOrg = null;
    if (directory_key) {
      matchedOrg = activeOrgs.find((o) => o.directory_key === directory_key);
    }

    // --- 2. Search by normalized names ---
    if (!matchedOrg && name_ar) {
      const normalizedAr = normalizeAr(name_ar);
      matchedOrg = activeOrgs.find((o) => normalizeAr(o.name_ar) === normalizedAr);
    }
    if (!matchedOrg && name_en) {
      const normalizedEn = normalizeEn(name_en);
      matchedOrg = activeOrgs.find((o) => normalizeEn(o.name_en) === normalizedEn);
    }

    // --- 3. Detect possible duplicates (fuzzy) ---
    const possibleDuplicates = [];
    if (!matchedOrg && (name_ar || name_en)) {
      for (const o of activeOrgs) {
        if (isPossibleDuplicate(name_ar, name_en, o.name_ar, o.name_en)) {
          possibleDuplicates.push({
            id: o.id,
            name_ar: o.name_ar,
            name_en: o.name_en,
            slug: o.slug,
            public_id: o.public_id,
            status: o.status,
            portal_url: `/o/${o.slug}--${o.public_id}`,
          });
        }
      }
    }

    // --- 4. If we found an existing org, check membership + access requests ---
    if (matchedOrg) {
      const portalUrl = `/o/${matchedOrg.slug}--${matchedOrg.public_id}`;

      // Check membership
      const memberships = await base44.asServiceRole.entities.OrganizationMembership
        .filter({ organization_id: matchedOrg.id, user_id: user.id })
        .catch(() => []);
      const membership = memberships && memberships.length > 0 ? memberships[0] : null;

      if (membership) {
        const res: IdentityResolution = {
          result: 'membership_exists',
          directory_key: matchedOrg.directory_key,
          organization: {
            id: matchedOrg.id,
            name_ar: matchedOrg.name_ar,
            name_en: matchedOrg.name_en,
            slug: matchedOrg.slug,
            public_id: matchedOrg.public_id,
            status: matchedOrg.status,
            owner_name: matchedOrg.owner_name,
            portal_url: portalUrl,
          },
          membership: { role: membership.role, status: membership.status },
        };
        return Response.json(res);
      }

      // Check pending access request
      const accessRequests = await base44.asServiceRole.entities.OrganizationAccessRequest
        .filter({ organization_id: matchedOrg.id, requester_user_id: user.id })
        .catch(() => []);
      const pendingRequest = (accessRequests || []).find(
        (r) => r.status === 'pending_review' || r.status === 'pending_email_verification'
      );

      if (pendingRequest) {
        const res: IdentityResolution = {
          result: 'access_request_pending',
          directory_key: matchedOrg.directory_key,
          organization: {
            id: matchedOrg.id,
            name_ar: matchedOrg.name_ar,
            name_en: matchedOrg.name_en,
            slug: matchedOrg.slug,
            public_id: matchedOrg.public_id,
            status: matchedOrg.status,
            owner_name: matchedOrg.owner_name,
            portal_url: portalUrl,
          },
          access_request: { id: pendingRequest.id, status: pendingRequest.status },
        };
        return Response.json(res);
      }

      // Existing org, user not a member, no pending request
      const isVerified = matchedOrg.status === 'official_active' || matchedOrg.verified_at;
      const res: IdentityResolution = {
        result: isVerified ? 'existing_verified' : 'existing_unverified',
        directory_key: matchedOrg.directory_key,
        organization: {
          id: matchedOrg.id,
          name_ar: matchedOrg.name_ar,
          name_en: matchedOrg.name_en,
          slug: matchedOrg.slug,
          public_id: matchedOrg.public_id,
          status: matchedOrg.status,
          owner_name: matchedOrg.owner_name,
          portal_url: portalUrl,
        },
      };
      return Response.json(res);
    }

    // --- 5. Possible duplicates found but no exact match ---
    if (possibleDuplicates.length > 0) {
      const res: IdentityResolution = {
        result: 'possible_duplicate',
        possible_duplicates: possibleDuplicates,
      };
      return Response.json(res);
    }

    // --- 6. Available — no existing org found ---
    const res: IdentityResolution = {
      result: 'available',
      directory_key: directory_key || undefined,
    };
    return Response.json(res);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}