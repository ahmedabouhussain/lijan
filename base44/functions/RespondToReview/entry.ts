import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';

// RespondToReview — reviewer submits their verdict on a review request.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { review_request_id, verdict, comments, comments_ar } = body;

    if (!review_request_id || !verdict || !['approved', 'approved_with_comments', 'return_for_revision', 'rejected'].includes(verdict)) {
      return Response.json({ error: 'review_request_id and a valid verdict are required' }, { status: 400 });
    }

    // The review request is the trusted target: it carries the committee, the document version and
    // the reviewer it is addressed to. `review.respond` is a real right, and the verdict must come
    // from the reviewer the request names (the chair may act for the committee).
    const auth = await authorizeCommand(base44, {
      capability: 'review.respond',
      target_type: 'ReviewRequest',
      target_id: review_request_id,
      ...requestClaims(body),
    });
    if (!auth.allowed) return refusalResponse(auth);
    const reviewRequest = auth.target;

    if (reviewRequest.reviewer_user_id
      && reviewRequest.reviewer_user_id !== auth.user.id
      && auth.effective_role !== 'chair') {
      return Response.json({
        error: 'This review is addressed to another reviewer',
        code: 'not_named_reviewer',
        policy_version: auth.policy_version,
        correlation_id: auth.correlation_id,
      }, { status: 403 });
    }

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