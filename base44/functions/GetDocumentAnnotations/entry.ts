import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolvePrincipal, authorizeRead, refusalBody, refusalStatus } from '../../shared/governedReadPolicy.ts';
import {
  ANNOTATION_CONTRACT_VERSION, currentVersionOf, versionChange, noteContinuity, visibleNotes,
} from '../../shared/annotationContinuity.ts';

// GetDocumentAnnotations — the governed read behind the notes panel of a committee document (S15).
//
// It returns, for ONE document the caller may read: the versions and what changed between them (by
// content fingerprint), the caller's OWN notes (private or shared) and colleagues' SHARED notes, each
// with where it stands against the version in force. Another person's private note is never loaded
// by the query, never counted and never mentioned. A source that cannot be read is named, never
// returned as an empty list.

const arr = (r: any) => (Array.isArray(r) ? r : (r && r.items) || []);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const { document_id, showcase_token } = body || {};
    if (!document_id) return Response.json({ error: 'document_id is required' }, { status: 400 });

    const callerUser = await base44.auth.me().catch(() => null);
    const principal: any = await resolvePrincipal({ sr, body: { showcase_token }, callerUser });

    const document: any = await sr.entities.Document.get(document_id).catch(() => null);
    if (!document) return Response.json(refusalBody('not_found'), { status: 404 });

    const allowed: any = await authorizeRead({ base44, sr, principal, record: document });
    if (!allowed.allowed) return Response.json(refusalBody(allowed.reason), { status: refusalStatus(allowed.reason) });

    // Notes are personal to a real account. A showcase persona has no notes of its own.
    if (principal.kind !== 'user') {
      return Response.json({ status: 'unavailable_in_exploration', contract_version: ANNOTATION_CONTRACT_VERSION, document_id });
    }
    const me = principal.user.id;
    const unread_sources: any[] = [];
    const read = async (source: string, fn: () => Promise<any>) => {
      try { return arr(await fn()); } catch (e) { unread_sources.push({ source, reason: (e as Error).message || 'read_failed' }); return null; }
    };

    const versions = await read('DocumentVersion', () => sr.entities.DocumentVersion.filter({ document_id }, { sort: 'version_number', limit: 50 }));
    const rows = await read('Annotation', () => sr.entities.Annotation.filter(
      { document_id, status: { $ne: 'deleted' }, $or: [{ author_user_id: me }, { is_private: false }] },
      { sort: '-created_at', limit: 200 },
    ));

    const list = versions || [];
    const byId = Object.fromEntries(list.map((v: any) => [v.id, v]));
    const current = currentVersionOf(document, list);
    const version_changes = list.slice(1).map((v: any, i: number) => versionChange(list[i], v));

    const notes = visibleNotes(rows || [], me).map((n: any) => ({
      id: n.id, body: n.body, anchor_text: n.anchor_text || null, page_number: n.page_number || null,
      is_private: n.is_private !== false, mine: n.author_user_id === me,
      author_name: n.author_name || null, author_role: n.author_role || null,
      version_number: n.version_number ?? byId[n.document_version_id]?.version_number ?? null,
      document_version_id: n.document_version_id || null,
      carried_from_annotation_id: n.carried_from_annotation_id || null,
      reanchor_state: n.reanchor_state || 'original', status: n.status, created_at: n.created_at,
      continuity: noteContinuity(n, byId, current),
    }));

    return Response.json({
      status: 'ok',
      contract_version: ANNOTATION_CONTRACT_VERSION,
      document_id,
      current_version: current ? { id: current.id, version_number: current.version_number } : null,
      versions: list.map((v: any) => ({ id: v.id, version_number: v.version_number, status: v.status, has_fingerprint: !!v.content_hash, uploaded_at: v.uploaded_at || v.created_date || null })),
      version_changes,
      notes,
      counts: { mine: notes.filter((n: any) => n.mine).length, shared_by_others: notes.filter((n: any) => !n.mine).length },
      unread_sources,
      complete: unread_sources.length === 0,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}