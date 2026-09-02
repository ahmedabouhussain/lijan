import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// ReviewMemoryRecord — Memory Review and Approval Workflow
// Transitions an AIOutputLedger (institutional_memory) record through:
//   under_review → approved | rejected | amended
// Only chair/vice_chair (minutes.approve capability) may approve/reject.
// Secretary (minutes.review) may mark under_review and amend.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { ledger_id, action, review_notes } = body;
    // action: 'mark_under_review' | 'approve' | 'reject' | 'amend'

    if (!ledger_id) return Response.json({ error: 'ledger_id is required' }, { status: 400 });
    if (!['mark_under_review', 'approve', 'reject', 'amend'].includes(action)) {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Fetch the ledger record first to get committee_id
    const record = await base44.asServiceRole.entities.AIOutputLedger.get(ledger_id).catch(() => null);
    if (!record) return Response.json({ error: 'Memory record not found' }, { status: 404 });

    const committee_id = record.committee_id;
    if (!committee_id) return Response.json({ error: 'Record has no committee context' }, { status: 400 });

    // Determine required capability based on action
    const capability = (action === 'mark_under_review' || action === 'amend')
      ? 'minutes.review'
      : 'minutes.approve';

    const auth = await resolveAuthority(base44, { committee_id, capability });
    if (!auth.allowed) {
      return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });
    }

    const now = new Date().toISOString();
    const reviewerName = auth.user.full_name || auth.user.email;

    let updateData;
    if (action === 'mark_under_review') {
      updateData = {
        status: 'under_review',
        reviewed_by_name: reviewerName,
        reviewed_by_user_id: auth.user.id,
        review_notes: review_notes || record.review_notes,
      };
    } else if (action === 'approve') {
      updateData = {
        status: 'approved',
        human_reviewed: true,
        approved: true,
        reviewed_by_name: reviewerName,
        reviewed_by_user_id: auth.user.id,
        reviewed_at: now,
        review_notes: review_notes || record.review_notes,
      };
    } else if (action === 'reject') {
      updateData = {
        status: 'rejected',
        human_reviewed: true,
        approved: false,
        reviewed_by_name: reviewerName,
        reviewed_by_user_id: auth.user.id,
        reviewed_at: now,
        review_notes: review_notes || 'مرفوض — Rejected',
      };
    } else {
      // amend — secretary amends content, resets to under_review
      updateData = {
        status: 'amended',
        human_reviewed: false,
        approved: false,
        reviewed_by_name: reviewerName,
        reviewed_by_user_id: auth.user.id,
        review_notes: review_notes || record.review_notes,
      };
    }

    const updated = await base44.asServiceRole.entities.AIOutputLedger.update(ledger_id, updateData);

    // Audit
    try {
      await base44.asServiceRole.entities.AuditEvent.create({
        organization_id: auth.organization_id,
        committee_id,
        actor_user_id: auth.user.id,
        actor_name: reviewerName,
        action: 'update',
        entity_type: 'AIOutputLedger',
        entity_id: ledger_id,
        description: `Memory record ${action}`,
        correlation_id: auth.correlation_id,
      });
    } catch {}

    return Response.json({
      status: 'ok',
      ledger_id,
      action,
      record: updated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}