import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// UpdateActionProgress — updates execution progress on an action.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, progress_percent, status, blocker, notes } = body;

    if (!action_id) return Response.json({ error: 'action_id is required' }, { status: 400 });

    const action = await base44.asServiceRole.entities.Action.get(action_id);
    if (!action) return Response.json({ error: 'Action not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: action.committee_id, capability: 'read' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const updateData = {};
    if (progress_percent !== undefined) updateData.progress_percent = Math.min(100, Math.max(0, progress_percent));
    if (status) updateData.status = status;
    if (blocker !== undefined) updateData.blocker = blocker;
    if (notes) updateData.compliance_notes = notes;

    // Auto-set overdue if past deadline
    if (action.deadline && status !== 'closed' && status !== 'verified') {
      const now = new Date().toISOString().split('T')[0];
      if (action.deadline < now && status !== 'completed') {
        updateData.status = 'overdue';
      }
    }

    await base44.asServiceRole.entities.Action.update(action_id, updateData);

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'action.progress', entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: `Progress updated: ${progress_percent !== undefined ? progress_percent + '%' : 'status change'}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', action_id, updates: updateData, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}