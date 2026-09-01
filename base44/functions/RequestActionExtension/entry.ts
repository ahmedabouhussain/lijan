import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// RequestActionExtension — action owner requests a deadline extension.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, new_deadline, reason } = body;

    if (!action_id || !new_deadline || !reason) {
      return Response.json({ error: 'action_id, new_deadline, and reason are required' }, { status: 400 });
    }

    const action = await base44.asServiceRole.entities.Action.get(action_id);
    if (!action) return Response.json({ error: 'Action not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: action.committee_id, capability: 'read' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    if (action.extension_status === 'requested') {
      return Response.json({ error: 'An extension request is already pending' }, { status: 400 });
    }

    if (new Date(new_deadline) <= new Date(action.deadline)) {
      return Response.json({ error: 'New deadline must be after the current deadline' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Action.update(action_id, {
      extension_status: 'requested',
      extension_reason: reason,
      extension_new_deadline: new_deadline,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'update', entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: `Extension requested: ${action.deadline} → ${new_deadline} (${reason})`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', action_id, extension_status: 'requested', correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}