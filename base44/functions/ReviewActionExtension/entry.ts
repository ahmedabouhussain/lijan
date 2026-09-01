import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ReviewActionExtension — secretary/chair approves or rejects an action extension request.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, decision, review_notes } = body;

    if (!action_id || !decision || !['approved', 'rejected'].includes(decision)) {
      return Response.json({ error: 'action_id and decision (approved/rejected) are required' }, { status: 400 });
    }

    const action = await base44.asServiceRole.entities.Action.get(action_id);
    if (!action) return Response.json({ error: 'Action not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: action.committee_id, capability: 'action.admin' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    if (action.extension_status !== 'requested') {
      return Response.json({ error: 'No pending extension request to review' }, { status: 400 });
    }

    const updateData = {
      extension_status: decision,
      extension_reviewed_by: auth.user.full_name || auth.user.email,
    };

    if (decision === 'approved' && action.extension_new_deadline) {
      updateData.deadline = action.extension_new_deadline;
    }

    await base44.asServiceRole.entities.Action.update(action_id, updateData);

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: decision === 'approved' ? 'approve' : 'reject',
      entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: `Extension ${decision}${decision === 'approved' ? ` — deadline updated to ${action.extension_new_deadline}` : ''}${review_notes ? ` (${review_notes})` : ''}`,
      old_value: 'requested', new_value: decision,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', action_id, extension_status: decision, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}