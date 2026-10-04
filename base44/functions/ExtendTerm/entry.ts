import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// ExtendTerm — extends a committee's term end date with documented justification.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, new_term_end, reason } = body;

    if (!committee_id || !new_term_end || !reason) {
      return Response.json({ error: 'committee_id, new_term_end, and reason are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: the committee record is the target itself.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'Committee',
      target_id: committee_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    if (new Date(new_term_end) <= new Date(committee.term_end)) {
      return Response.json({ error: 'New term end must be after the current term end' }, { status: 400 });
    }

    const oldTermEnd = committee.term_end;
    await base44.asServiceRole.entities.Committee.update(committee_id, {
      term_end: new_term_end,
      version: (committee.version || 1) + 1,
    });

    await base44.asServiceRole.entities.CommitteeLifecycleEvent.create({
      organization_id: auth.organization_id,
      committee_id,
      event_type: 'term_extended',
      actor_name: auth.user.full_name || auth.user.email,
      actor_user_id: auth.user.id,
      reason,
      occurred_at: new Date().toISOString(),
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'extend', entity_type: 'Committee', entity_id: committee_id,
      entity_title: committee.name_ar || committee.name_en,
      description: `Term extended from ${oldTermEnd} to ${new_term_end}: ${reason}`,
      old_value: oldTermEnd, new_value: new_term_end,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', committee_id, new_term_end, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}