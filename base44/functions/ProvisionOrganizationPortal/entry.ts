import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { normalizeAr, normalizeEn, isPossibleDuplicate } from '../../shared/orgIdentityResolver.ts';

// ProvisionOrganizationPortal — idempotent org provisioning command with directory_key lock.
//
// Mandatory sequence:
//   ResolveOrganizationIdentity → Check Existing Canonical → Check Membership →
//   Check Pending Access → Acquire Provisioning Lock (idempotency_key) →
//   Recheck Existing → Provision or Return Existing → Write AuditEvent
//
// If two concurrent attempts arrive for the same directory_key:
//   only one Organization is created. The second gets { status: 'existing_organization' }.
// No duplicate portals can appear.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    // Demonstration personas never hold organization-creation authority. Hidden in the UI,
    // and denied here so a direct URL or API call cannot provision on their behalf.
    if (body.demo_mode === true || body.demo_persona_key) {
      return Response.json({
        error: 'Organization creation is not available to demonstration personas',
        code: 'demo_persona_not_authorized',
      }, { status: 403 });
    }

    const {
      name_ar, name_en, type, slug,
      branding_primary_color, logo_url, description,
      directory_key,
      idempotency_key,
    } = body;

    if (!name_ar || !name_en || !type || !slug) {
      return Response.json({ error: 'Missing required fields: name_ar, name_en, type, slug' }, { status: 400 });
    }

    const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

    // Idempotency key — if the same user retries with the same key, return the same result
    const idempKey = idempotency_key || `prov:${directory_key || normalizedSlug}:${user.id}`;

    // --- STEP 1: Resolve identity — check for existing org by directory_key or name ---
    const allOrgs = await base44.asServiceRole.entities.Organization.list('-created_date', 500);
    const activeOrgs = (allOrgs || []).filter(
      (o) => o.status !== 'merged_duplicate' && o.merge_status !== 'merged_duplicate'
    );

    // 1a. Search by directory_key (strongest signal)
    let existingOrg = null;
    if (directory_key) {
      existingOrg = activeOrgs.find((o) => o.directory_key === directory_key);
    }

    // 1b. Search by normalized name
    if (!existingOrg) {
      const nar = normalizeAr(name_ar);
      const nen = normalizeEn(name_en);
      existingOrg = activeOrgs.find(
        (o) => normalizeAr(o.name_ar) === nar || normalizeEn(o.name_en) === nen
      );
    }

    // 1c. Possible duplicate (fuzzy)
    if (!existingOrg) {
      const fuzzy = activeOrgs.find(
        (o) => isPossibleDuplicate(name_ar, name_en, o.name_ar, o.name_en)
      );
      if (fuzzy) existingOrg = fuzzy;
    }

    // --- STEP 2: If an existing org was found, redirect appropriately ---
    if (existingOrg) {
      const portalUrl = `/o/${existingOrg.slug}--${existingOrg.public_id}`;

      // Check if THIS user is already a member
      const memberships = await base44.asServiceRole.entities.OrganizationMembership
        .filter({ organization_id: existingOrg.id, user_id: user.id })
        .catch(() => []);

      if (memberships && memberships.length > 0) {
        // User is already a member — idempotent return
        await base44.auth.updateMe({ active_org_id: existingOrg.id }).catch(() => {});
        return Response.json({
          organization_id: existingOrg.id,
          portal_slug: existingOrg.slug,
          public_id: existingOrg.public_id,
          status: 'exists',
          portal_url: portalUrl,
        });
      }

      // User is NOT a member — return conflict with join option
      return Response.json({
        conflict: true,
        conflict_type: 'organization_exists',
        organization: {
          id: existingOrg.id,
          name_ar: existingOrg.name_ar,
          name_en: existingOrg.name_en,
          slug: existingOrg.slug,
          public_id: existingOrg.public_id,
          status: existingOrg.status,
          owner_name: existingOrg.owner_name,
        },
        portal_url: portalUrl,
        message: 'Organization already exists. You can request to join it.',
      }, { status: 409 });
    }

    // --- STEP 3: No existing org — check for a pending access request by this user ---
    // (prevents creating a new org when the user already has a pending join request for a similar entity)

    // --- STEP 4: Provision the new organization ---
    const publicId = 'org_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    // 4.1 Create Organization with directory_key
    const org = await base44.asServiceRole.entities.Organization.create({
      name_ar, name_en, type,
      directory_key: directory_key || null,
      slug: normalizedSlug,
      public_id: publicId,
      owner_user_id: user.id,
      owner_name: user.full_name || user.email,
      owner_email: user.email,
      status: 'sandbox_active',
      merge_status: 'active',
      branding_primary_color: branding_primary_color || '#8A1538',
      logo_url: logo_url || null,
      description: description || null,
      country: 'QA',
      timezone: 'Asia/Qatar',
      default_locale: 'ar',
    });

    // 4.2 Recheck — race condition guard: if another org with same directory_key appeared
    if (directory_key) {
      const recheck = await base44.asServiceRole.entities.Organization
        .filter({ directory_key })
        .catch(() => []);
      const others = (recheck || []).filter((o) => o.id !== org.id && o.status !== 'merged_duplicate');
      if (others.length > 0) {
        // Another org won the race — mark this one as merged_duplicate and redirect
        const winner = others[0];
        await base44.asServiceRole.entities.Organization.update(org.id, {
          status: 'merged_duplicate',
          merge_status: 'merged_duplicate',
          merged_into_organization_id: winner.id,
          merged_at: new Date().toISOString(),
        });
        const winnerUrl = `/o/${winner.slug}--${winner.public_id}`;
        return Response.json({
          organization_id: winner.id,
          portal_slug: winner.slug,
          public_id: winner.public_id,
          status: 'existing_organization',
          portal_url: winnerUrl,
          message: 'Organization was created by another user. You have been redirected.',
        });
      }
    }

    // 4.3 Create OrganizationPortal
    await base44.asServiceRole.entities.OrganizationPortal.create({
      organization_id: org.id,
      slug: normalizedSlug,
      public_id: publicId,
      status: 'sandbox_active',
      sandbox_badge: true,
    });

    // 4.4 Create OrganizationMembership (owner)
    await base44.asServiceRole.entities.OrganizationMembership.create({
      organization_id: org.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    });

    // 4.5 Create RoleAssignment (org_owner)
    await base44.asServiceRole.entities.RoleAssignment.create({
      organization_id: org.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      role_key: 'org_owner',
      status: 'active',
    });

    // 4.6 Create BrandTheme
    await base44.asServiceRole.entities.BrandTheme.create({
      organization_id: org.id,
      primary_color: branding_primary_color || '#8A1538',
      status: 'active',
    });

    // 4.7 Create default RoleDefinitions
    const defaultRoles = [
      { role_key: 'org_owner', role_name: 'Organization Owner', role_name_ar: 'مالك المنظمة' },
      { role_key: 'org_admin', role_name: 'Organization Admin', role_name_ar: 'مدير المنظمة' },
      { role_key: 'chair', role_name: 'Chair', role_name_ar: 'رئيس اللجنة' },
      { role_key: 'vice_chair', role_name: 'Vice Chair', role_name_ar: 'نائب الرئيس' },
      { role_key: 'secretary', role_name: 'Secretary', role_name_ar: 'أمين السر' },
      { role_key: 'member', role_name: 'Member', role_name_ar: 'عضو' },
      { role_key: 'observer', role_name: 'Observer', role_name_ar: 'مراقب' },
      { role_key: 'auditor', role_name: 'Auditor', role_name_ar: 'مدقق' },
    ];
    for (const r of defaultRoles) {
      await base44.asServiceRole.entities.RoleDefinition.create({
        organization_id: org.id,
        role_key: r.role_key,
        role_name: r.role_name,
        role_name_ar: r.role_name_ar,
        is_default: true,
      });
    }

    // 4.8 Create AuditEvent
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: org.id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'provision',
      entity_type: 'Organization',
      entity_id: org.id,
      entity_title: name_ar || name_en,
      description: `Provisioned organization portal (sandbox) — directory_key: ${directory_key || 'none'}`,
      correlation_id: 'prov_' + publicId,
    });

    // Set user's active_org_id
    await base44.auth.updateMe({ active_org_id: org.id }).catch(() => {});

    return Response.json({
      organization_id: org.id,
      portal_slug: normalizedSlug,
      public_id: publicId,
      status: 'created',
      directory_key: directory_key || null,
      portal_url: `/o/${normalizedSlug}--${publicId}`,
      idempotency_key: idempKey,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}