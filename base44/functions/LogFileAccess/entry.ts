import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// LIJAN™ — audit trail for sensitive file access.
//
// Records that a stored governance file was uploaded, previewed, downloaded or shared:
// who did it, for which record, and when. The audit row deliberately holds NO signed link
// and no document content — only the fact of access.

const ALLOWED_ACTIONS = ['upload', 'preview', 'download', 'share'];

const clamp = (value, max) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
};

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = clamp(body.action, 24);
    if (!action || !ALLOWED_ACTIONS.includes(action)) {
      return Response.json({ error: 'Unsupported file action' }, { status: 400 });
    }

    const fileRef = clamp(body.file_ref, 500);
    if (!fileRef) {
      return Response.json({ error: 'Missing file reference' }, { status: 400 });
    }

    const title = clamp(body.title, 240);

    const record = await base44.asServiceRole.entities.AuditEvent.create({
      action: `file_${action}`,
      entity_type: clamp(body.entity_type, 80) || 'File',
      entity_id: clamp(body.entity_id, 120) || fileRef,
      entity_title: title || 'Document',
      actor_user_id: user.id,
      actor_name: user.full_name,
      actor_email: user.email,
      description: `File ${action}: ${title || 'document'}`,
      authority_context: clamp(body.committee_id, 120) || null,
    });

    return Response.json({ logged: true, id: record?.id || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}