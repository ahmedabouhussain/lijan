import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

/**
 * VerifyProductInstance — Section 5: QR Verification
 * Public endpoint (no auth required) for verifying the authenticity
 * of an institutional product via QR code scan.
 *
 * Returns only public-safe verification data — no sensitive org internals.
 * Only returns data for published/approved products; drafts are not verifiable.
 */
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const productId = body.product_id || body.id;

    if (!productId || typeof productId !== 'string') {
      return Response.json({ error: 'Product ID required' }, { status: 400 });
    }

    // Service-role read — bypasses RLS for public verification
    let product;
    try {
      product = await base44.asServiceRole.entities.ProductInstance.get(productId);
    } catch {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Only published/approved products are publicly verifiable
    const isVerified = product.status === 'published' || product.status === 'approved';
    if (!isVerified) {
      return Response.json({
        product: {
          id: product.id,
          title: product.title || product.title_ar,
          status: product.status,
          verified: false,
        },
      });
    }

    // Issuing body — identity only. Mandate text and internal typing are not public.
    let committee = null;
    if (product.committee_id) {
      try {
        const c = await base44.asServiceRole.entities.Committee.get(product.committee_id);
        committee = {
          name_ar: c.name_ar,
          name_en: c.name_en,
        };
      } catch { /* committee not found */ }
    }

    // Signatories — the fact of signing only. A signature image, its link and its
    // stored path are never part of public verification.
    let signatures = [];
    if (product.committee_id) {
      try {
        const sigs = await base44.asServiceRole.entities.Signature.filter({
          document_type: 'Document',
          document_id: productId,
          status: 'active',
        });
        signatures = (sigs || []).map((s) => ({
          signer_name: s.signer_name,
          signer_role: s.signer_role,
          signed_at: s.signed_at,
        }));
      } catch { /* signatures not found */ }
    }

    // Verification code and document fingerprint — safe, stable, non-reversible.
    const verificationCode = product.verification_code || `VRF-${String(productId).slice(-8).toUpperCase()}`;
    const fingerprint = product.document_fingerprint || null;
    const revoked = Boolean(product.revoked_at) || product.status === 'archived';

    return Response.json({
      product: {
        id: product.id,
        title: product.title || product.title_ar,
        title_ar: product.title_ar,
        product_type: product.product_type,
        status: product.status,
        verified: !revoked,
        revoked,
        revocation_reason: product.revocation_reason || null,
        verification_code: verificationCode,
        fingerprint,
        generated_at: product.generated_at,
        approved_at: product.approved_at,
        approved_by_name: product.approved_by_name,
      },
      committee,
      signatures,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}