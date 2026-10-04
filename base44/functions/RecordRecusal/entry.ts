import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// RecordRecusal — records a formal recusal from a committee matter.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, reason, agenda_item_id, decision_id, start_time, end_time } = body;

    if (!committee_id || !reason) {
      return Response.json({ error: 'committee_id, reason are required' }, { status: 400 });
    }

    // The committee itself is the trusted target of a self-recusal: only a person holding a seat in
    // it may record one, and the seat is resolved server-side.
    const auth = await authorizeCommand(base44, {
      capability: 'recusal.record',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const recusal = await base44.asServiceRole.entities.Recusal.create({
      organization_id: auth.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      member_id: auth.membership?.id || null,
      membership_id: auth.membership?.id || null,
      member_user_id: auth.user.id,
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