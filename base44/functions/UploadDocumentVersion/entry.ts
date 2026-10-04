import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';

// UploadDocumentVersion — uploads a new version of a document.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { committee_id, document_id, file_url, file_name, file_size_bytes, content_hash, change_summary } = body;

    if (!committee_id || !file_url) {
      return Response.json({ error: 'committee_id, file_url are required' }, { status: 400 });
    }

    // Authority on a TRUSTED target: a new version belongs to the DOCUMENT it versions; a brand-new
    // document is anchored to the committee RECORD. Either way the scope is derived, never received.
    const auth = await authorizeCommand(base44, {
      capability: 'agenda.edit',
      target_type: document_id ? 'Document' : 'Committee',
      target_id: document_id || committee_id,
      mode: 'create',
      claimed_committee_id: committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    // Exclusivity on VERSION CREATION: two simultaneous uploads would both read the same maximum and
    // both claim the same version number. The version slot is claimed first, so one upload wins the
    // slot and the other is told the slot is taken instead of overwriting the current version.
    const claim = await claimTransition(base44, {
      key: `document.version:${document_id || committee_id}`,
      command: 'UploadDocumentVersion',
      entity_type: document_id ? 'Document' : 'Committee',
      entity_id: document_id || committee_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'Another version of this document is being recorded');

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

    await completeTransition(base44, claim.claim_id, { result_ref: String(versionNumber) });

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