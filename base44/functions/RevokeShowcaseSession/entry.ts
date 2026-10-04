import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { revokeShowcaseSession } from '../../shared/showcaseSession.ts';

// RevokeShowcaseSession — ends an exploration session for good.
//
// Held by the session itself: possessing the token is what authorises ending it, which is exactly
// the right authority for "leave the showcase" and for Reset Showcase. A revoked token stops
// working immediately and can never be exchanged for a user session.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.showcase_token === 'string' ? body.showcase_token.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 80) : 'exit';

    if (!token) {
      return Response.json({ error: 'showcase_token is required', code: 'invalid_request' }, { status: 400 });
    }

    const result = await revokeShowcaseSession(sr, token, reason);

    if (result.revoked) {
      await sr.entities.AuditEvent.create({
        action: 'showcase_session_revoked',
        entity_type: 'ShowcaseSession',
        entity_id: result.session_id,
        entity_title: reason,
        description: `Showcase session ended (${reason})`,
        authority_context: 'data_class:synthetic_showcase',
      }).catch(() => {});
    }

    return Response.json({ status: 'ok', revoked: result.revoked, session_id: result.session_id || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}