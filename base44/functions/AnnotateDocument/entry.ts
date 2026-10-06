import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, requestClaims, refusalResponse } from '../../shared/commandGuard.ts';
import {
  ANNOTATION_CONTRACT_VERSION, ANNOTATION_CAPABILITIES, validateNoteInput, currentVersionOf,
  assessCreate, assessCarryForward, anchorDigest, refusal,
} from '../../shared/annotationContinuity.ts';

// AnnotateDocument — the ONE governed writer of document notes (annotation-continuity-1.0.0, S15).
//
//   create         a seated person writes their OWN note on the version in force (document.annotate)
//   carry_forward  the AUTHOR copies a note to the newer version in force; the original stays on its
//                  own version untouched, and the copy states whether its anchor could be verified
//   resolve        the AUTHOR marks their note resolved (annotation.own)
//
// Scope always comes from the record (DocumentVersion or Annotation → Document → committee), never
// from the payload. A private note is not audited by content, so its existence never surfaces in a
// register; a shared note's creation is audited without its text.

const arr = (r: any) => (Array.isArray(r) ? r : (r && r.items) || []);
const refuse = (r: any) => Response.json({ error: r.reason, error_ar: r.reason_ar, code: r.code, contract_version: ANNOTATION_CONTRACT_VERSION }, { status: r.status || 409 });

async function documentVersions(sr: any, document_id: string) {
  return arr(await sr.entities.DocumentVersion.filter({ document_id }, { sort: '-version_number', limit: 50 }));
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'create';
    const claims = requestClaims(body);
    const now = new Date().toISOString();

    if (action === 'create') {
      const auth: any = await authorizeCommand(base44, {
        capability: ANNOTATION_CAPABILITIES.create, target_type: 'DocumentVersion', target_id: body?.document_version_id, ...claims,
      });
      if (!auth.allowed) return refusalResponse(auth);
      const version = auth.target;
      const input = validateNoteInput(body);
      if (!input.ok) return refuse(input);
      const document = await sr.entities.Document.get(version.document_id);
      const current = currentVersionOf(document, await documentVersions(sr, version.document_id));
      const gate = assessCreate({ version, current });
      if (!gate.ok) return refuse(gate);

      const anchor = typeof body.anchor_text === 'string' && body.anchor_text.trim() ? body.anchor_text.trim() : null;
      const isPrivate = body.is_private !== false;
      const note = await sr.entities.Annotation.create({
        organization_id: version.organization_id || document.organization_id,
        committee_id: auth.trusted_target.derived_committee_id,
        document_id: version.document_id, document_version_id: version.id, version_number: version.version_number,
        author_user_id: auth.user.id, author_name: auth.user.full_name || auth.user.email, author_role: auth.effective_role || null,
        is_private: isPrivate, anchor_text: anchor, anchor_sha256: await anchorDigest(anchor),
        body: body.body.trim(), page_number: body.page_number ? Number(body.page_number) : null,
        reanchor_state: 'original', contract_version: ANNOTATION_CONTRACT_VERSION,
        created_at: now, updated_at: now, status: 'active',
      });
      if (!isPrivate) {
        await sr.entities.AuditEvent.create({
          organization_id: note.organization_id, committee_id: note.committee_id,
          actor_user_id: auth.user.id, actor_name: note.author_name, actor_email: auth.user.email,
          action: 'annotation.share', entity_type: 'Annotation', entity_id: note.id,
          description: `Shared note on document version ${version.version_number}`,
          correlation_id: auth.correlation_id, authority_context: auth.authority_context,
        }).catch(() => null);
      }
      return Response.json({ status: 'ok', action, annotation: note, contract_version: ANNOTATION_CONTRACT_VERSION, correlation_id: auth.correlation_id });
    }

    if (action === 'carry_forward' || action === 'resolve') {
      const auth: any = await authorizeCommand(base44, {
        capability: ANNOTATION_CAPABILITIES.own, target_type: 'Annotation', target_id: body?.annotation_id, ...claims,
      });
      if (!auth.allowed) return refusalResponse(auth);
      const note = auth.target;

      if (action === 'resolve') {
        if (note.status !== 'active') return refuse(refusal('not_active'));
        const updated = await sr.entities.Annotation.update(note.id, { status: 'resolved', resolved_at: now, updated_at: now });
        return Response.json({ status: 'ok', action, annotation: updated, contract_version: ANNOTATION_CONTRACT_VERSION, correlation_id: auth.correlation_id });
      }

      const versions = await documentVersions(sr, note.document_id);
      const document = await sr.entities.Document.get(note.document_id);
      const target = currentVersionOf(document, versions);
      const source = versions.find((v: any) => v.id === note.document_version_id) || null;
      const existing = arr(await sr.entities.Annotation.filter({ carried_from_annotation_id: note.id }, { limit: 20 }));
      const verdict: any = assessCarryForward({ note, source_version: source, target_version: target, existing });
      if (!verdict.ok) return refuse(verdict);
      if (verdict.idempotent) {
        return Response.json({ status: 'ok', action, idempotent: true, annotation_id: verdict.existing_id, reanchor_state: verdict.reanchor_state, contract_version: ANNOTATION_CONTRACT_VERSION });
      }
      const copy = await sr.entities.Annotation.create({
        organization_id: note.organization_id, committee_id: note.committee_id,
        document_id: note.document_id, document_version_id: target.id, version_number: target.version_number,
        author_user_id: note.author_user_id, author_name: note.author_name, author_role: auth.effective_role || note.author_role || null,
        is_private: note.is_private !== false, anchor_text: note.anchor_text || null, anchor_sha256: note.anchor_sha256 || null,
        body: note.body, page_number: note.page_number || null,
        carried_from_annotation_id: note.id, carried_from_version_id: source.id,
        reanchor_state: verdict.reanchor_state, contract_version: ANNOTATION_CONTRACT_VERSION,
        created_at: now, updated_at: now, status: 'active',
      });
      return Response.json({ status: 'ok', action, idempotent: false, annotation: copy, reanchor_state: verdict.reanchor_state, change: verdict.change, contract_version: ANNOTATION_CONTRACT_VERSION, correlation_id: auth.correlation_id });
    }

    return Response.json({ error: 'Unknown action', code: 'unknown_action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}