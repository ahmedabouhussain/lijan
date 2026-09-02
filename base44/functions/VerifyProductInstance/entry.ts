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

    // Fetch committee context (public-safe fields only)
    let committee = null;
    if (product.committee_id) {
      try {
        const c = await base44.asServiceRole.entities.Committee.get(product.committee_id);
        committee = {
          name_ar: c.name_ar,
          name_en: c.name_en,
          mandate: c.mandate,
          type: c.type,
        };
      } catch { /* committee not found */ }
    }

    // Fetch signatures (public-safe fields only)
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
          signature_image_url: s.signature_image_url,
          signature_text: s.signature_text,
          signed_at: s.signed_at,
        }));
      } catch { /* signatures not found */ }
    }

    return Response.json({
      product: {
        id: product.id,
        title: product.title || product.title_ar,
        product_type: product.product_type,
        classification: product.classification,
        status: product.status,
        verified: true,
        generated_at: product.generated_at,
        generated_by_name: product.generated_by_name,
        approved_by_name: product.approved_by_name,
        approved_at: product.approved_at,
        export_format: product.export_format,
      },
      committee,
      signatures,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}