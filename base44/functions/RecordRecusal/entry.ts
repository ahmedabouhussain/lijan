import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// RecordRecusal — records a formal recusal from a committee matter.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, reason, agenda_item_id, decision_id, start_time, end_time } = body;

    if (!committee_id || !reason) {
      return Response.json({ error: 'committee_id, reason are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'read' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const recusal = await base44.asServiceRole.entities.Recusal.create({
      organization_id: auth.organization_id,
      committee_id,
      member_id: auth.membership?.id || null,
      member_name: auth.user.full_name || auth.user.email,
      agenda_item_id: agenda_item_id || null,
      decision_id: decision_id || null,
      reason,
      start_time: start_time || new Date().toISOString(),
      end_time: end_time || null,
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'recusal.record', entity_type: 'Recusal', entity_id: recusal.id,
      description: `Recusal recorded: ${reason}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', recusal, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}