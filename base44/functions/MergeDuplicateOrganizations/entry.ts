import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeAr, normalizeEn, isPossibleDuplicate } from '../../shared/orgIdentityResolver.ts';

// MergeDuplicateOrganizations — merges duplicate Organization records into a canonical one.
//
// Non-destructive: duplicates are marked as merged_duplicate (not deleted).
// - Reassigns OrganizationMembership records to the canonical org
// - Reassigns Committee records to the canonical org
// - Reassigns CommitteeMembership records
// - Preserves all audit trail history
// - Old portal URLs redirect to the canonical portal
//
// If called with { auto: true }, it auto-detects duplicates by directory_key or name similarity
// and merges them, choosing the canonical org by:
//   1. Has the correct directory_key
//   2. Has active committees
//   3. Is verified/active
//   4. Oldest record

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Only platform admins can merge
    if (user.role !== 'admin') {
      return Response.json({ error: 'Only platform admins can merge organizations' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { auto, canonical_organization_id, duplicate_organization_ids } = body;

    let canonicalId = canonical_organization_id;
    let duplicateIds: string[] = duplicate_organization_ids || [];

    // --- AUTO mode: detect duplicates ---
    if (auto) {
      const allOrgs = await base44.asServiceRole.entities.Organization.list('-created_date', 500);
      const activeOrgs = (allOrgs || []).filter(
        (o) => o.status !== 'merged_duplicate' && o.merge_status !== 'merged_duplicate'
      );

      // Group by directory_key
      const byDirKey: Record<string, any[]> = {};
      for (const o of activeOrgs) {
        if (o.directory_key) {
          if (!byDirKey[o.directory_key]) byDirKey[o.directory_key] = [];
          byDirKey[o.directory_key].push(o);
        }
      }

      // Find groups with more than one org
      const duplicateGroups: any[][] = [];
      for (const key of Object.keys(byDirKey)) {
        if (byDirKey[key].length > 1) {
          duplicateGroups.push(byDirKey[key]);
        }
      }

      // Also find name-based duplicates (no directory_key but same name)
      const noDirKey = activeOrgs.filter((o) => !o.directory_key);
      const used = new Set<string>();
      for (const o of noDirKey) {
        if (used.has(o.id)) continue;
        const group = [o];
        for (const o2 of noDirKey) {
          if (o2.id === o.id || used.has(o2.id)) continue;
          if (isPossibleDuplicate(o.name_ar, o.name_en, o2.name_ar, o2.name_en)) {
            group.push(o2);
            used.add(o2.id);
          }
        }
        if (group.length > 1) {
          used.add(o.id);
          duplicateGroups.push(group);
        }
      }

      const results = [];
      for (const group of duplicateGroups) {
        // Choose canonical: most committees → verified → oldest
        let canonical = group[0];
        let maxCommittees = -1;
        for (const o of group) {
          const committees = await base44.asServiceRole.entities.Committee
            .filter({ organization_id: o.id })
            .catch(() => []);
          const count = (committees || []).length;
          if (count > maxCommittees) {
            maxCommittees = count;
            canonical = o;
          }
        }
        const dups = group.filter((o) => o.id !== canonical.id);
        const mergeResult = await performMerge(base44, canonical, dups, user);
        results.push(mergeResult);
      }

      return Response.json({
        status: 'auto_merge_complete',
        groups_processed: duplicateGroups.length,
        results,
      });
    }

    // --- MANUAL mode: merge specified duplicates into specified canonical ---
    if (!canonicalId || duplicateIds.length === 0) {
      return Response.json({ error: 'canonical_organization_id and duplicate_organization_ids are required' }, { status: 400 });
    }

    const canonical = await base44.asServiceRole.entities.Organization.get(canonicalId);
    if (!canonical) return Response.json({ error: 'Canonical organization not found' }, { status: 404 });

    const duplicates = [];
    for (const dupId of duplicateIds) {
      const dup = await base44.asServiceRole.entities.Organization.get(dupId).catch(() => null);
      if (dup) duplicates.push(dup);
    }

    const result = await performMerge(base44, canonical, duplicates, user);
    return Response.json({ status: 'merge_complete', ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function performMerge(base44, canonical, duplicates, user) {
  const canonicalUrl = `/o/${canonical.slug}--${canonical.public_id}`;
  const mergedIds = [];

  for (const dup of duplicates) {
    // 1. Reassign OrganizationMembership
    const dupMemberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: dup.id })
      .catch(() => []);

    for (const m of (dupMemberships || [])) {
      // Check if user already has a membership in canonical org
      const existingInCanonical = await base44.asServiceRole.entities.OrganizationMembership
        .filter({ organization_id: canonical.id, user_id: m.user_id })
        .catch(() => []);

      if (existingInCanonical && existingInCanonical.length > 0) {
        // User already in canonical — just delete the duplicate membership
        await base44.asServiceRole.entities.OrganizationMembership.delete(m.id).catch(() => {});
      } else {
        // Move membership to canonical
        await base44.asServiceRole.entities.OrganizationMembership.update(m.id, {
          organization_id: canonical.id,
        });
      }
    }

    // 2. Reassign Committees
    const dupCommittees = await base44.asServiceRole.entities.Committee
      .filter({ organization_id: dup.id })
      .catch(() => []);
    for (const c of (dupCommittees || [])) {
      await base44.asServiceRole.entities.Committee.update(c.id, {
        organization_id: canonical.id,
      });
    }

    // 3. Reassign CommitteeMembership (by committee_id lookup already moved committees)
    // CommitteeMembership references committee_id, so moving the committee is enough.

    // 4. Reassign other records that reference organization_id
    const entitiesToReassign = ['Document', 'Decision', 'Action', 'Meeting', 'AuditEvent', 'PageConfiguration', 'RoleDefinition', 'BrandTheme', 'OrganizationPortal'];
    for (const entityName of entitiesToReassign) {
      const records = await base44.asServiceRole.entities[entityName]
        .filter({ organization_id: dup.id })
        .catch(() => []);
      for (const r of (records || [])) {
        await base44.asServiceRole.entities[entityName].update(r.id, {
          organization_id: canonical.id,
        }).catch(() => {});
      }
    }

    // 5. Mark the duplicate as merged (non-destructive)
    await base44.asServiceRole.entities.Organization.update(dup.id, {
      status: 'merged_duplicate',
      merge_status: 'merged_duplicate',
      merged_into_organization_id: canonical.id,
      merged_at: new Date().toISOString(),
    });

    // 6. Audit event
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: canonical.id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'update',
      entity_type: 'Organization',
      entity_id: dup.id,
      entity_title: dup.name_ar || dup.name_en,
      description: `Merged duplicate organization into ${canonical.name_ar || canonical.name_en}`,
      correlation_id: 'merge_' + dup.id,
    });

    mergedIds.push(dup.id);
  }

  return {
    canonical_organization_id: canonical.id,
    canonical_name: canonical.name_ar || canonical.name_en,
    canonical_portal_url: canonicalUrl,
    merged_organization_ids: mergedIds,
    merged_count: mergedIds.length,
  };
}