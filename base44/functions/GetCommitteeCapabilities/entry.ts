import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveCapabilities } from '../../shared/capabilityKernel.ts';
import { resolvePersonaCapabilities } from '../../shared/committeeAuth.ts';
import { resolveDemoPersona } from '../../shared/demoPersonas.ts';

// GetCommitteeCapabilities — resolves explicit backend-governed capabilities
// for the authenticated user within a specific committee context.
// Platform Admin does NOT automatically gain operational committee authority.
//
// In exploration mode (demo_mode + demo_persona_key) the capabilities are resolved for the
// governed demonstration persona inside that ONE committee: Chair powers never carry into
// another committee, the Committee Secretary can never approve a decision, and the
// Vice-Chair cannot exercise Chair powers without an active delegation.

const KNOWN_DEMO_PERSONA = 'DR_HAMAD_MAJEEGHEER';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, public_id, demo_mode, demo_persona_key } = body || {};

    const demoMode = demo_mode === true;

    // Resolve committee
    let committee;
    if (public_id) {
      const list = await base44.asServiceRole.entities.Committee.filter({ public_id }).catch(() => []);
      committee = (list || [])[0];
    } else if (committee_id) {
      committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    }
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    if (demoMode) {
      // A persona is required and must be a registered one — never a fallback.
      const persona = resolveDemoPersona(demo_persona_key);
      if (!persona) {
        return Response.json({ error: 'Unknown or missing demo persona', code: 'unknown_persona' }, { status: 400 });
      }
      // Only records of that persona's governed dataset are reachable.
      if (committee.is_demo_data !== true || committee.demo_dataset !== persona.dataset) {
        return Response.json({
          error: 'Committee not found in this exploration scope',
          code: 'out_of_scope',
          committee_id: committee.id,
        }, { status: 404 });
      }

      const resolved = await resolvePersonaCapabilities(base44, persona, committee);
      return Response.json({
        committee_id: committee.id,
        committee_public_id: committee.public_id || null,
        organization_id: committee.organization_id,
        demo: true,
        persona_key: demo_persona_key,
        role: resolved.role,
        capabilities: resolved.capabilities,
        authority_context: resolved.authority_context,
        is_demo_mode: true,
      });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Org membership
    const orgMemberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: committee.organization_id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const orgMembership = (orgMemberships || [])[0];

    // Committee memberships (effective-dated)
    const cmMemberships = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id: committee.id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const now = new Date().toISOString().split('T')[0];
    const activeMemberships = (cmMemberships || []).filter((m) => {
      if (m.term_start && now < m.term_start) return false;
      if (m.term_end && now > m.term_end) return false;
      return true;
    });

    const capabilities = resolveCapabilities({
      user,
      orgMembership,
      committeeMemberships: activeMemberships,
      isPlatformAdmin: user.role === 'admin',
    });

    return Response.json({
      committee_id: committee.id,
      organization_id: committee.organization_id,
      capabilities,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}