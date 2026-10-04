import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { dispatchNotification } from '../../shared/notificationEngine.ts';

// CloseAction — closes an action after evidence verification.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action_id, evidence_url, compliance_notes } = body;

    if (!action_id) return Response.json({ error: 'action_id is required' }, { status: 400 });

    const action = await base44.asServiceRole.entities.Action.get(action_id);
    if (!action) return Response.json({ error: 'Action not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: action.committee_id, capability: 'action.admin' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    // Evidence verification gate — cannot close based on percentage alone
    if (!evidence_url && !action.evidence_url) {
      return Response.json({ error: 'Action cannot be closed without verified evidence' }, { status: 400 });
    }

    if (action.progress_percent < 100) {
      return Response.json({ error: 'Action progress must be 100% before closure' }, { status: 400 });
    }

    await base44.asServiceRole.entities.Action.update(action_id, {
      status: 'verified',
      evidence_url: evidence_url || action.evidence_url,
      compliance_verified: true,
      compliance_notes: compliance_notes || 'Evidence verified and action closed',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: action.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'action.close', entity_type: 'Action', entity_id: action_id,
      entity_title: action.title,
      description: `Action closed with verified evidence`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify the action owner that their action has been closed/verified
    if (action.owner_user_id && action.owner_user_id !== auth.user.id) {
      try {
        const deepLink = `/o/${auth.organization_id}/c/${action.committee_id}/actions`;
        await dispatchNotification(base44, {
          organization_id: auth.organization_id,
          committee_id: action.committee_id,
          recipient_user_id: action.owner_user_id,
          recipient_name: action.owner_name || '',
          event_type: 'action_reminder',
          context: {
            action_title: action.title,
            status: 'verified',
            actor_name: auth.user.full_name || auth.user.email,
            message: `تم إغلاق الإجراء الخاص بك بعد التحقق من الأدلة`,
            deep_link: deepLink,
          },
          source_entity_type: 'Action',
          source_entity_id: action_id,
          source_title: action.title,
          priority: 'normal',
          correlation_id: auth.correlation_id,
          actor_name: auth.user.full_name || auth.user.email,
          deep_link: deepLink,
        });
      } catch {}
    }

    return Response.json({ status: 'ok', action_id, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}