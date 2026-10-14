import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveUserCapabilities, resolvePersonaCapabilities } from '../../shared/committeeAuth.ts';
import { resolveAmeenSources, resolveClassificationCeiling } from '../../shared/ameenContextKernel.ts';
import {
  resolveScope,
  resolveSandboxCommitteeRole,
  resolveSandboxOrganizationRole,
  isSandboxCommittee,
  isSandboxOrganization,
  describeOrganization,
  describeCommittee,
} from '../../shared/ameenScopeResolver.ts';
import { resolveDemoPersona } from '../../shared/demoPersonas.ts';
import { verifyShowcaseSession } from '../../shared/showcaseSession.ts';
import { assessScopeInForce, assessSeatStanding, assessShowcaseSession, assessRetrieval } from '../../shared/ameenRetrievalGuard.ts';
import { DR_HAMAD_COMMITTEES, DR_HAMAD_AMEEN_GENERAL, DR_HAMAD_PERSONA } from '../../shared/drHamadDataset.ts';
import { drHamadContextPath } from '../../shared/drHamadExperience.ts';

// ResolveAmeenContext — server-verified context for the single assistant «أمين».
// The client says WHERE the user is; this function decides WHO they are there,
// what role they hold, and which scope / boundaries apply.
// Platform Admin does NOT gain operational committee authority.
//
// Exploration (sandbox) sessions resolve against the REQUESTED governed persona and that
// persona's sandbox records only — never another persona, never the founder's identity.

const DR_HAMAD_KEY = 'DR_HAMAD_MAJEEGHEER';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { org_ref, committee_ref, context_key, demo_mode, demo_persona_key, showcase_token } = body || {};

    const { organization, committee } = await resolveScope(base44, {
      orgRef: org_ref,
      committeeRef: committee_ref,
    });

    if (demo_mode === true || showcase_token) {
      const session = await verifyShowcaseSession(base44.asServiceRole, showcase_token, { committeeId: committee?.id });
      if (!session.ok) return Response.json({ error: 'Record not available', code: 'no_session' }, { status: 401 });
      if (demo_persona_key && session.persona.key !== demo_persona_key) return Response.json({ error: 'Record not available', code: 'not_found' }, { status: 404 });
      return await resolveSandboxContext({
        base44,
        organization,
        committee,
        context_key,
        demo_persona_key: session.persona.key,
        showcase_token,
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

    // ── The authority must still be ALIVE before «أمين» reads (ameen-retrieval-guard-1.0.0, D-092) ──
    // A seat is only required where the retrieval RESTS on a seat: platform and organization oversight
    // are not seat-rested, and are never denied by a seat check. Unknown standing is a refusal, not an
    // assumption — and the exploration session, when one is presented, is verified here too.
    const seatRested = !!committee && !!role && !isPlatformAdmin && !isOrgAdmin;
    const scopeInForce = committee ? assessScopeInForce(committee) : null;
    const standing = seatRested
      ? await assessSeatStanding(base44.asServiceRole, {
          committee_id: committee.id,
          user_id: user.id,
          at: new Date().toISOString(),
        })
      : null;
    const session = await assessShowcaseSession(base44.asServiceRole, body?.showcase_token, committee?.id || null);
    const retrieval = assessRetrieval({ scope: scopeInForce, standing, session });
    if (!retrieval.ok) {
      return Response.json({
        verified: true,
        access_denied: true,
        reason: 'retrieval_not_in_force',
        retrieval,
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
 * Only a registered governed persona, and only that persona's sandbox-flagged records.
 */
async function resolveSandboxContext({ base44, organization, committee, context_key, demo_persona_key, showcase_token }) {
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

  const persona = resolveDemoPersona(demo_persona_key);
  if (!persona) return denied();

  const isDrHamad = persona.key === DR_HAMAD_KEY;
  const personaDescriptor = {
    key: persona.key,
    persona_id: persona.persona_id || null,
    name_ar: persona.name_ar,
    name_en: persona.name_en,
    primary_org_ar: persona.primary_org_ar,
    primary_org_en: persona.primary_org_en,
    dataset: persona.dataset,
  };

  if (committee) {
    if (!isSandboxCommittee(committee, persona)) return denied();

    // ── A demonstration scope must also still be LIVE (ameen-retrieval-guard-1.0.0, D-092): a revoked
    // exploration session stops reading immediately, and a closed committee is history, not a scope.
    // The persona's own standing is resolved from its governed persona contract, so only these two
    // live facts are checked here — and they are named, not silent.
    const scopeInForce = assessScopeInForce(committee);
    const session = await assessShowcaseSession(base44.asServiceRole, showcase_token, committee?.id || null);
    const retrieval = assessRetrieval({ scope: scopeInForce, standing: null, session });
    if (!retrieval.ok) {
      return Response.json({
        verified: true,
        access_denied: true,
        reason: 'retrieval_not_in_force',
        retrieval,
        demo: true,
        context_key: context_key || 'committee',
        role: null,
        capabilities: null,
        allowed_sources: [],
        classification_ceiling: null,
      });
    }

    const resolved = await resolvePersonaCapabilities(base44, persona, committee);
    const def = isDrHamad
      ? (DR_HAMAD_COMMITTEES.find((c) => c.public_id === committee.public_id) || null)
      : null;

    return Response.json({
      verified: true,
      access_denied: false,
      demo: true,
      context_key: context_key || 'committee',
      role: resolved.role,
      persona: personaDescriptor,
      organization: describeOrganization(organization),
      committee: describeCommittee(committee),
      capabilities: resolved.capabilities,
      authority_context: resolved.authority_context,
      allowed_sources: resolved.role
        ? resolveAmeenSources({
            role: resolved.role,
            isCommitteeScope: true,
            isOrgAdmin: false,
            isPlatformAdmin: false,
          })
        : [],
      classification_ceiling: resolveClassificationCeiling({ committee, organization }),
      // «أمين» speaks from the selected committee and the current role only.
      ameen_message_ar: def ? def.ameen_ar : null,
      ameen_message_en: def ? def.ameen_en : null,
      role_label_ar: def ? (def.role_label_ar || null) : null,
      role_label_en: def ? (def.role_label_en || null) : null,
      context_path: def ? drHamadContextPath(committee.public_id, 'ar') : null,
      context_path_en: def ? drHamadContextPath(committee.public_id, 'en') : null,
      classification_label_ar: def
        ? (def.classification === 'source_based_demonstration'
            ? 'محتوى مستند إلى مواد مصدرية'
            : def.synthetic_role ? 'دور تجريبي افتراضي' : 'بيانات تجريبية')
        : null,
      classification_label_en: def
        ? (def.classification === 'source_based_demonstration'
            ? 'Source-based demonstration content'
            : def.synthetic_role ? 'Synthetic demonstration role' : 'Synthetic demonstration data')
        : null,
      synthetic_role: def ? def.synthetic_role === true : false,
    });
  }

  if (!isSandboxOrganization(organization, persona)) return denied();

  const role = await resolveSandboxOrganizationRole(base44, organization, persona);

  return Response.json({
    verified: true,
    access_denied: false,
    demo: true,
    context_key: context_key || 'general',
    role,
    persona: personaDescriptor,
    organization: describeOrganization(organization),
    committee: null,
    capabilities: null,
    allowed_sources: ['committee_profile'],
    classification_ceiling: resolveClassificationCeiling({ committee: null, organization }),
    ameen_message_ar: isDrHamad ? DR_HAMAD_AMEEN_GENERAL.ar : null,
    ameen_message_en: isDrHamad ? DR_HAMAD_AMEEN_GENERAL.en : null,
    context_path: isDrHamad
      ? {
          parts: [DR_HAMAD_PERSONA.primary_org_ar],
          role_label: null,
          owns_primary: true,
          synthetic_role: false,
        }
      : null,
    context_path_en: isDrHamad
      ? {
          parts: [DR_HAMAD_PERSONA.primary_org_en],
          role_label: null,
          owns_primary: true,
          synthetic_role: false,
        }
      : null,
  });
}