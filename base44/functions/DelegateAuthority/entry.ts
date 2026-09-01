import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// DelegateAuthority — governed authority delegation.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, from_member_name, to_member_name, to_user_id, scope, reason, start_date, end_date } = body;

    if (!committee_id || !from_member_name || !to_member_name) {
      return Response.json({ error: 'committee_id, from_member_name, to_member_name are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.manage' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const delegation = await base44.asServiceRole.entities.Delegation.create({
      organization_id: auth.organization_id,
      committee_id,
      from_member_name,
      from_role: auth.effective_role,
      to_member_name,
      to_user_id: to_user_id || null,
      to_role: 'member',
      scope: scope || 'Full committee authority',
      reason: reason || null,
      start_date: start_date || new Date().toISOString().split('T')[0],
      end_date: end_date || null,
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'delegate', entity_type: 'Delegation', entity_id: delegation.id,
      entity_title: `${from_member_name} → ${to_member_name}`,
      description: `Authority delegated: ${scope || 'full scope'}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', delegation, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}