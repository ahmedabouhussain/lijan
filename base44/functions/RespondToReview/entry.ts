import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// RespondToReview — reviewer submits their verdict on a review request.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { review_request_id, verdict, comments, comments_ar } = body;

    if (!review_request_id || !verdict || !['approved', 'approved_with_comments', 'return_for_revision', 'rejected'].includes(verdict)) {
      return Response.json({ error: 'review_request_id and a valid verdict are required' }, { status: 400 });
    }

    const reviewRequest = await base44.asServiceRole.entities.ReviewRequest.get(review_request_id);
    if (!reviewRequest) return Response.json({ error: 'Review request not found' }, { status: 404 });

    const auth = await resolveAuthority(base44, { committee_id: reviewRequest.committee_id, capability: 'read' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const response = await base44.asServiceRole.entities.ReviewResponse.create({
      organization_id: auth.organization_id,
      committee_id: reviewRequest.committee_id,
      review_request_id,
      document_id: reviewRequest.document_id,
      document_version_id: reviewRequest.document_version_id,
      reviewer_name: auth.user.full_name || auth.user.email,
      reviewer_user_id: auth.user.id,
      verdict,
      comments,
      comments_ar,
      responded_at: new Date().toISOString(),
      status: 'submitted',
    });

    await base44.asServiceRole.entities.ReviewRequest.update(review_request_id, { status: 'responded' });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: reviewRequest.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: verdict === 'approved' ? 'approve' : (verdict === 'rejected' ? 'reject' : 'update'),
      entity_type: 'ReviewResponse', entity_id: response.id,
      entity_title: `Review response: ${verdict}`,
      description: `Review verdict: ${verdict}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', review_response_id: response.id, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}