import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// LogInstitutionalExport — the audit trail for every file the Institutional Export Engine
// produces. It records WHO exported WHAT, in which format and language, for which body —
// never the signed download link, never the file bytes.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      product_type, format, language, organization_id, committee_id,
      organization_name, committee_name, classification, item_count, purpose,
      content_hash, quality_ok, missing_assets, engine_version,
    } = body || {};

    if (!product_type || !format) {
      return Response.json({ error: 'product_type and format are required' }, { status: 400 });
    }

    const actorLabel = user.full_name || user.email || 'system';
    const entry = await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: organization_id || null,
      committee_id: committee_id || null,
      actor_user_id: user.id,
      actor_name: actorLabel,
      action: 'create',
      entity_type: 'InstitutionalExport',
      entity_id: null,
      entity_title: `${product_type} · ${format} · ${language}`,
      description: `تصدير مؤسسي: ${product_type} (${format}/${language})${item_count != null ? ` — ${item_count} بند` : ''}${purpose ? ` — ${purpose}` : ''}`,
      old_value: null,
      new_value: JSON.stringify({
        product_type, format, language, organization_name, committee_name,
        classification, item_count, purpose, content_hash, quality_ok,
        missing_assets, engine_version,
      }),
      correlation_id: null,
    }).catch(() => null);

    return Response.json({ logged: true, id: entry?.id || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}