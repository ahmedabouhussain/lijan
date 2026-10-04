import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// AcknowledgeCommitteeChange — allows a member to acknowledge (or dispute) a change
// that affects them. Creates/updates a MemberAcknowledgement record.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { amendment_id, status, dispute_reason, escalation_reason } = body;

    if (!amendment_id || !status) {
      return Response.json({ error: 'amendment_id and status are required' }, { status: 400 });
    }

    const validStatuses = ['viewed', 'acknowledged', 'disputed', 'escalated'];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    // Authority on a TRUSTED target: the amendment record is the target, its committee is derived
    // from it, and acknowledging is a SEAT-BORNE self-service right — a person receives their own
    // receipt for a change that affects them. It was previously a write with no authority check at all.
    const auth = await authorizeCommand(base44, {
      capability: 'amendment.acknowledge',
      target_type: 'CommitteeAmendment',
      target_id: amendment_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const amendment = auth.target;
    const user = auth.user;

    // Find existing acknowledgement for this member
    const existing = await base44.asServiceRole.entities.MemberAcknowledgement
      .filter({ amendment_id, member_user_id: user.id })
      .catch(() => []);

    const now = new Date().toISOString();
    const updateData = {
      status,
      dispute_reason: status === 'disputed' ? dispute_reason : null,
      escalation_reason: status === 'escalated' ? escalation_reason : null,
      ...(status === 'viewed' ? { viewed_at: now } : {}),
      ...(status === 'acknowledged' ? { acknowledged_at: now, viewed_at: now } : {}),
    };

    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.MemberAcknowledgement.update(existing[0].id, updateData);
    } else {
      // Need organization_id — resolve from amendment
      await base44.asServiceRole.entities.MemberAcknowledgement.create({
        organization_id: amendment.organization_id,
        committee_id: amendment.committee_id,
        amendment_id,
        member_name: user.full_name || user.email,
        member_user_id: user.id,
        member_email: user.email,
        ...updateData,
        status,
      });
    }

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: amendment.organization_id, committee_id: amendment.committee_id,
      actor_user_id: user.id, actor_name: user.full_name || user.email, actor_email: user.email,
      action: `amendment.${status}`, entity_type: 'CommitteeAmendment', entity_id: amendment_id,
      entity_title: amendment.title_ar || amendment.title || 'Committee Amendment',
      description: `A seat recorded '${status}' on the change that affects it`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', amendment_id, acknowledgement: status, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}