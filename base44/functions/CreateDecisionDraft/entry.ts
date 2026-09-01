import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// CreateDecisionDraft — creates a draft decision inside a committee.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, meeting_id, title, title_ar, proposal, legal_basis, alternatives, owner_name, deadline } = body;

    if (!committee_id || !title) {
      return Response.json({ error: 'committee_id, title are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'agenda.propose' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const decisionNumber = `DEC-${Date.now().toString(36)}`;

    const decision = await base44.asServiceRole.entities.Decision.create({
      organization_id: auth.organization_id,
      committee_id, meeting_id: meeting_id || null,
      decision_number: decisionNumber,
      title, title_ar: title_ar || null,
      proposal: proposal || null,
      legal_basis: legal_basis || null,
      alternatives: alternatives || null,
      owner_name: owner_name || null,
      deadline: deadline || null,
      vote_for: 0, vote_against: 0, vote_abstain: 0,
      status: 'draft',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'decision.draft', entity_type: 'Decision', entity_id: decision.id,
      entity_title: title, description: `Decision draft created: ${decisionNumber}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', decision, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}