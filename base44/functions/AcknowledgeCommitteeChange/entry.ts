import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

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

    const amendment = await base44.asServiceRole.entities.CommitteeAmendment.get(amendment_id);
    if (!amendment) return Response.json({ error: 'Amendment not found' }, { status: 404 });

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

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

    return Response.json({ status: 'ok', amendment_id, acknowledgement: status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}