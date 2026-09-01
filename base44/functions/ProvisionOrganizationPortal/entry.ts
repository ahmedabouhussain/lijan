import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// ProvisionOrganizationPortal — idempotent org provisioning command.
// Creates exactly once: Organization, OrganizationPortal, OrganizationMembership (owner),
// RoleAssignment (org_owner), BrandTheme, default RoleDefinitions, AuditEvent.
// Sets the creator's active_org_id context.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { name_ar, name_en, type, slug, branding_primary_color, logo_url, description, idempotency_key } = body;

    if (!name_ar || !name_en || !type || !slug) {
      return Response.json({ error: 'Missing required fields: name_ar, name_en, type, slug' }, { status: 400 });
    }

    const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

    // Idempotency + slug uniqueness check (case-insensitive)
    const existing = await base44.asServiceRole.entities.Organization
      .filter({ slug: normalizedSlug })
      .catch(() => []);
    if (existing && existing.length > 0) {
      const org = existing[0];
      if (org.owner_user_id === user.id) {
        // Idempotent retry — return existing
        return Response.json({
          organization_id: org.id,
          portal_slug: org.slug,
          public_id: org.public_id,
          status: 'exists',
          portal_url: `/o/${org.slug}--${org.public_id}`,
        });
      }
      return Response.json({ error: 'Slug already taken', field: 'slug' }, { status: 409 });
    }

    const publicId = 'org_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    // 1. Create Organization
    const org = await base44.asServiceRole.entities.Organization.create({
      name_ar, name_en, type,
      slug: normalizedSlug,
      public_id: publicId,
      owner_user_id: user.id,
      owner_name: user.full_name || user.email,
      owner_email: user.email,
      status: 'sandbox_active',
      branding_primary_color: branding_primary_color || '#8A1538',
      logo_url: logo_url || null,
      description: description || null,
      country: 'QA',
      timezone: 'Asia/Qatar',
      default_locale: 'ar',
    });

    // 2. Create OrganizationPortal
    await base44.asServiceRole.entities.OrganizationPortal.create({
      organization_id: org.id,
      slug: normalizedSlug,
      public_id: publicId,
      status: 'sandbox_active',
      sandbox_badge: true,
    });

    // 3. Create OrganizationMembership (owner)
    await base44.asServiceRole.entities.OrganizationMembership.create({
      organization_id: org.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      role: 'owner',
      status: 'active',
      joined_at: new Date().toISOString(),
    });

    // 4. Create RoleAssignment (org_owner)
    await base44.asServiceRole.entities.RoleAssignment.create({
      organization_id: org.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name || user.email,
      role_key: 'org_owner',
      status: 'active',
    });

    // 5. Create BrandTheme
    await base44.asServiceRole.entities.BrandTheme.create({
      organization_id: org.id,
      primary_color: branding_primary_color || '#8A1538',
      status: 'active',
    });

    // 6. Create default RoleDefinitions
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

    // 7. Create AuditEvent
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: org.id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'provision',
      entity_type: 'Organization',
      entity_id: org.id,
      entity_title: name_ar || name_en,
      description: 'Provisioned organization portal (sandbox)',
      correlation_id: 'prov_' + publicId,
    });

    // Set user's active_org_id context (RLS layer — not authorization)
    await base44.auth.updateMe({ active_org_id: org.id }).catch(() => {});

    return Response.json({
      organization_id: org.id,
      portal_slug: normalizedSlug,
      public_id: publicId,
      status: 'created',
      portal_url: `/o/${normalizedSlug}--${publicId}`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}