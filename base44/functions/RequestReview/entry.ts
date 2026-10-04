import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';

// RequestReview — secretary sends a document/version for review by designated reviewers.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, document_id, document_version_id, reviewer_name, reviewer_user_id, review_note, deadline } = body;

    if (!committee_id || !document_id || !reviewer_name) {
      return Response.json({ error: 'committee_id, document_id, and reviewer_name are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: the review request is anchored to the DOCUMENT it reviews, and
    // the version it names must belong to the same committee (the guard enforces both).
    const auth = await authorizeCommand(base44, {
      capability: 'minutes.draft',
      target_type: 'Document',
      target_id: document_id,
      mode: 'create',
      related: document_version_id ? [{ type: 'DocumentVersion', ids: [document_version_id] }] : [],
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const reviewRequest = await base44.asServiceRole.entities.ReviewRequest.create({
      organization_id: auth.organization_id,
      committee_id,
      document_id,
      document_version_id,
      requested_by_name: auth.user.full_name || auth.user.email,
      requested_by_user_id: auth.user.id,
      reviewer_name,
      reviewer_user_id: reviewer_user_id || null,
      review_note,
      deadline,
      status: 'pending',
      requested_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'create', entity_type: 'ReviewRequest', entity_id: reviewRequest.id,
      entity_title: `Review request to ${reviewer_name}`,
      description: `Review requested from ${reviewer_name}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', review_request_id: reviewRequest.id, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}