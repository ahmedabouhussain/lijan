import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveUserCapabilities } from '../../shared/committeeAuth.ts';
import { resolveAmeenSources, resolveClassificationCeiling } from '../../shared/ameenContextKernel.ts';

// ResolveAmeenContext — server-verified context for the single assistant «أمين».
// The client says WHERE the user is; this function decides WHO they are there,
// what role they hold, and which sources / classification ceiling apply.
// Platform Admin does NOT gain operational committee authority.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { org_ref, committee_ref, context_key } = body || {};

    // ── Resolve organization (public_id → slug → id) ──
    let organization = null;
    if (org_ref) {
      const publicId = String(org_ref).split('--').pop();
      const byPublic = await base44.asServiceRole.entities.Organization
        .filter({ public_id: publicId }).catch(() => []);
      organization = (byPublic || [])[0] || null;

      if (!organization) {
        const bySlug = await base44.asServiceRole.entities.Organization
          .filter({ slug: org_ref }).catch(() => []);
        organization = (bySlug || [])[0] || null;
      }
      if (!organization) {
        organization = await base44.asServiceRole.entities.Organization
          .get(org_ref).catch(() => null);
      }
    }

    // ── Resolve committee (public_id → slug → id) ──
    let committee = null;
    if (committee_ref) {
      const publicId = String(committee_ref).split('--').pop();
      const byPublic = await base44.asServiceRole.entities.Committee
        .filter({ public_id: publicId }).catch(() => []);
      committee = (byPublic || [])[0] || null;

      if (!committee) {
        const bySlug = await base44.asServiceRole.entities.Committee
          .filter({ slug: committee_ref }).catch(() => []);
        committee = (bySlug || [])[0] || null;
      }
      if (!committee) {
        committee = await base44.asServiceRole.entities.Committee
          .get(committee_ref).catch(() => null);
      }
    }

    if (committee && !organization) {
      organization = await base44.asServiceRole.entities.Organization
        .get(committee.organization_id).catch(() => null);
    }

    const targetOrgId = committee?.organization_id || organization?.id || null;

    // ── Active organization membership (server-verified) ──
    let orgMembership = null;
    if (targetOrgId) {
      const list = await base44.asServiceRole.entities.OrganizationMembership
        .filter({ organization_id: targetOrgId, user_id: user.id, status: 'active' })
        .catch(() => []);
      orgMembership = (list || [])[0] || null;
    }

    const isPlatformAdmin = user.role === 'admin';
    const isOrgAdmin = !!(orgMembership && (orgMembership.role === 'owner' || orgMembership.role === 'admin'));

    // ── Committee role + capabilities (effective-dated memberships) ──
    let capabilities = null;
    let role = null;
    if (committee) {
      capabilities = await resolveUserCapabilities(base44, user, committee);
      role = capabilities?.effective_committee_role || null;
    } else if (isOrgAdmin) {
      role = 'org_admin';
    } else if (isPlatformAdmin) {
      role = 'platform_admin';
    }

    // ── Deny when the user has no relationship to the requested scope ──
    const hasRelationship = committee ? !!role : (!!orgMembership || isPlatformAdmin);
    if (!hasRelationship) {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id: targetOrgId,
        committee_id: committee?.id || null,
        actor_user_id: user.id,
        actor_name: user.full_name,
        actor_email: user.email,
        action: 'deny_access',
        entity_type: committee ? 'Committee' : 'Organization',
        entity_id: committee?.id || organization?.id || null,
        entity_title:
          committee?.name_ar || committee?.name_en ||
          organization?.name_ar || organization?.name_en || null,
        description: 'Ameen context denied — no active relationship to the requested scope',
        authority_context: `context:${context_key || 'unknown'}`,
      }).catch(() => {});

      return Response.json({
        verified: true,
        access_denied: true,
        context_key: context_key || 'general',
        role: null,
        capabilities: null,
        allowed_sources: [],
        classification_ceiling: null,
      });
    }

    const scopeRole = committee ? role : (isOrgAdmin ? 'org_admin' : role);

    return Response.json({
      verified: true,
      access_denied: false,
      context_key: context_key || (committee ? 'committee' : 'general'),
      role: scopeRole,
      organization: organization
        ? {
            id: organization.id,
            name_ar: organization.name_ar,
            name_en: organization.name_en,
            type: organization.type,
            status: organization.status,
          }
        : null,
      committee: committee
        ? {
            id: committee.id,
            public_id: committee.public_id,
            name_ar: committee.name_ar,
            name_en: committee.name_en,
            type: committee.type,
            status: committee.status,
            classification: committee.classification,
            organization_id: committee.organization_id,
          }
        : null,
      capabilities: capabilities || null,
      allowed_sources: resolveAmeenSources({
        role: scopeRole,
        isCommitteeScope: !!committee,
        isOrgAdmin,
        isPlatformAdmin,
      }),
      classification_ceiling: resolveClassificationCeiling({ committee, organization }),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}