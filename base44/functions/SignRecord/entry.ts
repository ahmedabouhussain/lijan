import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// SignRecord — records an electronic signature on a governed document.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, document_type, document_id, document_title, signature_method, signature_text, signature_image_url, intent } = body;

    if (!committee_id || !document_type || !document_id || !signature_method || !intent) {
      return Response.json({ error: 'committee_id, document_type, document_id, signature_method, intent are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'decision.sign' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    // Check for recusal
    if (auth.effective_role && ['vote.cast', 'decision.sign'].some(c => true)) {
      const recusals = await base44.asServiceRole.entities.Recusal
        .filter({ committee_id, member_name: auth.user.full_name || auth.user.email, status: 'active' }).catch(() => []);
      if (recusals && recusals.length > 0) {
        return Response.json({ error: 'Cannot sign while recused from this committee' }, { status: 403 });
      }
    }

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