import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// UploadDocumentVersion — uploads a new version of a document.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, document_id, file_url, file_name, file_size_bytes, content_hash, change_summary } = body;

    if (!committee_id || !file_url) {
      return Response.json({ error: 'committee_id, file_url are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'agenda.edit' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    let doc;
    let versionNumber = 1;

    if (document_id) {
      doc = await base44.asServiceRole.entities.Document.get(document_id);
      if (!doc || doc.committee_id !== committee_id) {
        return Response.json({ error: 'Document not found' }, { status: 404 });
      }
      const versions = await base44.asServiceRole.entities.DocumentVersion
        .filter({ document_id }).catch(() => []);
      versionNumber = Math.max(0, ...(versions || []).map(v => v.version_number || 0)) + 1;

      // Supersede previous current version
      const prevCurrent = (versions || []).filter(v => v.status === 'current');
      for (const v of prevCurrent) {
        await base44.asServiceRole.entities.DocumentVersion.update(v.id, { status: 'superseded' });
      }
    } else {
      // Create new document
      doc = await base44.asServiceRole.entities.Document.create({
        organization_id: auth.organization_id, committee_id,
        title: file_name || 'Untitled', document_type: 'other',
        classification: 'internal', status: 'draft',
      });
    }

    const version = await base44.asServiceRole.entities.DocumentVersion.create({
      organization_id: auth.organization_id, committee_id,
      document_id: doc.id, version_number: versionNumber,
      file_url, file_name: file_name || null, file_size_bytes: file_size_bytes || null,
      content_hash: content_hash || null,
      change_summary: change_summary || null,
      uploaded_by_name: auth.user.full_name || auth.user.email,
      uploaded_by_user_id: auth.user.id,
      uploaded_at: new Date().toISOString(),
      status: 'current',
    });

    // Update document to point to new version
    await base44.asServiceRole.entities.Document.update(doc.id, {
      current_version_id: version.id,
      current_version_number: versionNumber,
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'document.upload', entity_type: 'DocumentVersion', entity_id: version.id,
      entity_title: file_name || doc.title, description: `Version ${versionNumber} uploaded`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', document_id: doc.id, version, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}