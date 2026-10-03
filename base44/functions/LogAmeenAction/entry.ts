import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveUserCapabilities } from '../../shared/committeeAuth.ts';
import { resolveSandboxPersona, resolveScope } from '../../shared/ameenScopeResolver.ts';

// LogAmeenAction — explicit audit trail for every «أمين» consultation.
//
// Records who asked, in which scope, and under which authority context, so the
// assistant is never a silent channel. One event per consultation turn.
// Sandbox consultations are recorded as such and never as governed activity.

const MAX_QUESTION = 240;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      org_ref,
      committee_ref,
      context_key,
      question,
      demo_mode,
      demo_persona_key,
    } = body || {};

    const isSandbox = demo_mode === true && resolveSandboxPersona(demo_persona_key) !== null;

    const { organization, committee } = await resolveScope(base44, {
      orgRef: org_ref,
      committeeRef: committee_ref,
    });

    const targetOrgId = committee?.organization_id || organization?.id || null;

    // Only record consultations the actor is actually party to — an audit trail
    // must not become a place where outsiders can write against any scope.
    const allowed = await isPartyToScope(base44, user, { committee, targetOrgId, isSandbox });
    if (!allowed) {
      return Response.json({ logged: false, reason: 'out_of_scope' }, { status: 403 });
    }

    const excerpt = String(question || '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION);
    const scopeKey = context_key || (committee ? 'committee' : 'general');

    const event = await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: targetOrgId,
      committee_id: committee?.id || null,
      actor_user_id: user.id,
      actor_name: user.full_name,
      actor_email: user.email,
      action: 'ai_query',
      entity_type: 'Ameen',
      entity_id: committee?.id || organization?.id || null,
      entity_title:
        committee?.name_ar || committee?.name_en ||
        organization?.name_ar || organization?.name_en || null,
      description: excerpt
        ? `Ameen consultation (${scopeKey}) — ${excerpt}`
        : `Ameen consultation (${scopeKey})`,
      new_value: isSandbox ? 'SANDBOX' : 'LIVE',
      authority_context: `ameen:${isSandbox ? 'sandbox' : 'live'}:${scopeKey}`,
    });

    return Response.json({ logged: true, id: event.id, sandbox: isSandbox });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function isPartyToScope(base44, user, { committee, targetOrgId, isSandbox }) {
  // Sandbox consultations run under the demo persona, which holds no real office.
  if (isSandbox) return true;

  if (user.role === 'admin') return true;

  if (committee) {
    const capabilities = await resolveUserCapabilities(base44, user, committee);
    return !!capabilities?.effective_committee_role;
  }

  if (targetOrgId) {
    const rows = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: targetOrgId, user_id: user.id, status: 'active' })
      .catch(() => []);
    return !!(rows && rows.length > 0);
  }

  return false;
}