import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// TransitionAmendmentStatus — governed status transitions for committee amendments.
// Handles: submit (draft→pending_approval), return (→returned), reject (→rejected),
// schedule (→scheduled with future effective_date), cancel (→cancelled).
// Only approved amendments may become effective (handled by ApproveCommitteeAmendment).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { amendment_id, transition, effective_date, review_notes, reviewed_by_name } = body;

    if (!amendment_id || !transition) {
      return Response.json({ error: 'amendment_id and transition are required' }, { status: 400 });
    }

    const amendment = await base44.asServiceRole.entities.CommitteeAmendment.get(amendment_id);
    if (!amendment) return Response.json({ error: 'Amendment not found' }, { status: 404 });

    // Authority on a TRUSTED target: the committee is derived from the AMENDMENT record itself.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'CommitteeAmendment',
      target_id: amendment.id,
      claimed_committee_id: amendment.committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const validTransitions = {
      submit: { from: ['draft', 'returned'], to: 'pending_approval' },
      return: { from: ['pending_approval', 'secretary_review', 'governance_review', 'legal_review'], to: 'returned' },
      reject: { from: ['draft', 'pending_approval', 'returned', 'secretary_review', 'governance_review', 'legal_review'], to: 'rejected' },
      schedule: { from: ['approved'], to: 'scheduled' },
      cancel: { from: ['draft', 'returned', 'pending_approval'], to: 'cancelled' },
    };

    const rule = validTransitions[transition];
    if (!rule) return Response.json({ error: `Unknown transition: ${transition}` }, { status: 400 });
    if (!rule.from.includes(amendment.status)) {
      return Response.json({ error: `Cannot ${transition} amendment in status '${amendment.status}'` }, { status: 400 });
    }

    const updates = {
      status: rule.to,
      reviewed_by_name: reviewed_by_name || auth.user.full_name || auth.user.email,
      notes: review_notes ? `${amendment.notes || ''}\n${review_notes}`.trim() : amendment.notes,
    };

    if (transition === 'schedule' && effective_date) {
      updates.effective_date = effective_date;
    }

    await base44.asServiceRole.entities.CommitteeAmendment.update(amendment_id, updates);

    const transitionLabels = {
      submit: 'إرسال للاعتماد', return: 'إرجاع للتصحيح', reject: 'رفض',
      schedule: 'جدولة للنفاذ المستقبلي', cancel: 'إلغاء',
    };

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: amendment.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'update', entity_type: 'CommitteeAmendment', entity_id: amendment_id,
      entity_title: amendment.description || amendment.amendment_type,
      description: `${transitionLabels[transition]}: ${amendment.amendment_type}`,
      old_value: amendment.status, new_value: rule.to,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', amendment_id, new_status: rule.to });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}