import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fingerprintRef } from '../../shared/fileAccessPolicy.ts';

/**
 * LIJAN™ — audit trail for sensitive file activity.
 *
 * This function RECORDS. It cannot grant access: it mints no link, returns no
 * file reference and reads no file content, so calling it never widens anyone's
 * permissions — access is only ever issued by RequestFileAccess after its own
 * policy decision.
 *
 * Written: actor, action, safe reference (fingerprint — never the path), entity
 * and committee, decision, safe reason, timestamp, correlation id, link TTL.
 * Never written: signed link, access token, file content, session secrets.
 */

const ALLOWED_ACTIONS = ['upload', 'preview', 'download', 'share', 'print', 'legacy_detected'];

const clamp = (value: unknown, max: number) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
};

export default async function (req: Request): Promise<Response> {
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

    const rawRef = clamp(body.file_ref, 500);
    const entityType = clamp(body.entity_type, 80) || 'File';
    const entityId = clamp(body.entity_id, 120);
    const title = clamp(body.title, 240);
    if (!rawRef && !entityId) {
      return Response.json({ error: 'A file reference or record is required' }, { status: 400 });
    }

    // The stored path is not itself written: only a fingerprint of it.
    const refFingerprint = await fingerprintRef(rawRef);
    const isLegacy = action === 'legacy_detected';

    const record = await base44.asServiceRole.entities.AuditEvent.create({
      action: isLegacy ? 'file_legacy_pending_migration' : `file_${action}`,
      entity_type: entityType,
      entity_id: entityId || `ref:${refFingerprint}`,
      entity_title: title || 'Document',
      actor_user_id: user.id,
      actor_name: user.full_name,
      actor_email: user.email,
      description: isLegacy
        ? `Legacy public link on a sensitive field flagged for migration (ref:${refFingerprint})`
        : `File ${action}: ${title || 'document'} (ref:${refFingerprint}${body.expires_in ? `, ttl:${Number(body.expires_in)}s` : ''})`,
      old_value: clamp(body.reason, 120) || null,
      new_value: isLegacy ? 'flagged' : 'recorded',
      committee_id: clamp(body.committee_id, 120) || null,
      authority_context: clamp(body.committee_id, 120) || null,
      correlation_id: clamp(body.correlation_id, 60) || null,
    });

    return Response.json({ logged: true, id: record?.id || null, decision: 'recorded', grants_access: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}