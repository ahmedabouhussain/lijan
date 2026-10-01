import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveUserCapabilities } from '../../shared/committeeAuth.ts';
import { resolveAmeenSources, resolveClassificationCeiling } from '../../shared/ameenContextKernel.ts';
import {
  DEMO_PERSONA_KEY,
  resolveScope,
  resolveSandboxCommitteeRole,
  resolveSandboxOrganizationRole,
  isSandboxCommittee,
  isSandboxOrganization,
  describeOrganization,
  describeCommittee,
} from '../../shared/ameenScopeResolver.ts';

// ResolveAmeenContext — server-verified context for the single assistant «أمين».
// The client says WHERE the user is; this function decides WHO they are there,
// what role they hold, and which sources / classification ceiling apply.
// Platform Admin does NOT gain operational committee authority.
//
// Sandbox sessions (the exploration experience) resolve against the sandbox persona
// and sandbox-flagged records only — the founder's real identity is never consulted.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { org_ref, committee_ref, context_key, demo_mode, demo_persona_key } = body || {};

    const { organization, committee } = await resolveScope(base44, {
      orgRef: org_ref,
      committeeRef: committee_ref,
    });

    if (demo_mode === true) {
      return await resolveSandboxContext({
        base44,
        organization,
        committee,
        context_key,
        demo_persona_key,
      });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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
        demo: false,
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
      demo: false,
      context_key: context_key || (committee ? 'committee' : 'general'),
      role: scopeRole,
      organization: describeOrganization(organization),
      committee: describeCommittee(committee),
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

/**
 * Sandbox scope — the exploration experience.
 * Only the approved demo persona, and only records flagged as sandbox data.
 */
async function resolveSandboxContext({ base44, organization, committee, context_key, demo_persona_key }) {
  const denied = () => Response.json({
    verified: true,
    access_denied: true,
    demo: true,
    context_key: context_key || 'general',
    role: null,
    capabilities: null,
    allowed_sources: [],
    classification_ceiling: null,
  });

  if (demo_persona_key !== DEMO_PERSONA_KEY) return denied();

  if (committee) {
    if (!isSandboxCommittee(committee)) return denied();

    const role = await resolveSandboxCommitteeRole(base44, committee);

    return Response.json({
      verified: true,
      access_denied: false,
      demo: true,
      context_key: context_key || 'committee',
      role,
      organization: describeOrganization(organization),
      committee: describeCommittee(committee),
      capabilities: null,
      allowed_sources: role
        ? resolveAmeenSources({
            role,
            isCommitteeScope: true,
            isOrgAdmin: false,
            isPlatformAdmin: false,
          })
        : [],
      classification_ceiling: resolveClassificationCeiling({ committee, organization }),
    });
  }

  if (!isSandboxOrganization(organization)) return denied();

  const role = await resolveSandboxOrganizationRole(base44, organization);

  return Response.json({
    verified: true,
    access_denied: false,
    demo: true,
    context_key: context_key || 'general',
    role,
    organization: describeOrganization(organization),
    committee: null,
    capabilities: null,
    allowed_sources: ['committee_profile'],
    classification_ceiling: resolveClassificationCeiling({ committee: null, organization }),
  });
}