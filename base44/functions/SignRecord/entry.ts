import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';

// SignRecord — records an electronic signature on a governed document.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, document_type, document_id, document_title, signature_method, signature_text, signature_image_url, intent } = body;

    if (!committee_id || !document_type || !document_id || !signature_method || !intent) {
      return Response.json({ error: 'committee_id, document_type, document_id, signature_method, intent are required' }, { status: 400 });
    }

    // The scope is DERIVED from the target record — record → committee → organization — and the
    // committee_id sent by the caller is only checked against it. Recusal is resolved (by
    // identifier) inside the guard, so no name comparison happens here.
    const targetEntity = { Document: 'Document', Decision: 'Decision', MeetingMinutes: 'MeetingMinutes', Action: 'Action' }[document_type];
    const target = targetEntity
      ? await base44.asServiceRole.entities[targetEntity].get(document_id).catch(() => null)
      : null;
    if (!target) {
      return Response.json({ error: 'The target record of this signature could not be resolved', code: 'scope_unresolvable' }, { status: 403 });
    }

    // Authority on a TRUSTED target: the guard loads the signed record itself and derives the
    // committee from it. A signature IMAGE is not a digital signature — `decision.digital_sign` is
    // held by nobody until an approved policy names the identity provider and the legal instrument.
    const auth = await authorizeCommand(base44, {
      capability: 'decision.sign_image',
      target_type: targetEntity,
      target_id: document_id,
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    // Exclusivity: one active signature per signer, per document, per intent. A second simultaneous
    // request loses the claim instead of writing a second material signature.
    const claim = await claimTransition(base44, {
      key: `decision.sign_image:${document_id}:${auth.user.id}:${intent}`,
      command: 'SignRecord',
      entity_type: targetEntity,
      entity_id: document_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'A signature for this record and intent is already recorded');

    const signature = await base44.asServiceRole.entities.Signature.create({
      organization_id: auth.organization_id,
      committee_id,
      document_type, document_id, document_title: document_title || null,
      signer_name: auth.user.full_name || auth.user.email,
      signer_user_id: auth.user.id,
      signer_role: auth.effective_role,
      signature_method,
      signature_text: signature_text || null,
      signature_image_url: signature_image_url || null,
      intent,
      signed_at: new Date().toISOString(),
      status: 'active',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'signature.sign', entity_type: 'Signature', entity_id: signature.id,
      entity_title: document_title || document_id,
      description: `Signed (${intent}) via ${signature_method} — non-qualified electronic signature`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', signature, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}