import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ProcessEscalation — escalates an overdue action to the next authority level.
const ESCALATION_CHAIN = ['none', 'reminder', 'priority_reminder', 'owner_secretary', 'chair', 'escalation_authority'];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, escalation_note } = body;

    if (!action_id) return Response.json({ error: 'action_id is required' }, { status: 400 });

    const action = await base44.asServiceRole.entities.Action.get(action_id);
    if (!action) return Response.json({ error: 'Action not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: action.committee_id, capability: 'action.admin' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const currentLevel = ESCALATION_CHAIN.indexOf(action.escalation_level || 'none');
    const nextLevel = Math.min(currentLevel + 1, ESCALATION_CHAIN.length - 1);
    const nextEscalation = ESCALATION_CHAIN[nextLevel];

    await base44.asServiceRole.entities.Action.update(action_id, {
      escalation_level: nextEscalation,
      last_reminder_at: new Date().toISOString(),
      reminder_count: (action.reminder_count || 0) + 1,
      status: action.status === 'overdue' ? 'overdue' : (nextEscalation === 'escalation_authority' ? 'blocked' : action.status),
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'escalate', entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: `Escalation: ${action.escalation_level || 'none'} → ${nextEscalation}${escalation_note ? ` (${escalation_note})` : ''}`,
      old_value: action.escalation_level || 'none', new_value: nextEscalation,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', action_id, new_escalation_level: nextEscalation, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}