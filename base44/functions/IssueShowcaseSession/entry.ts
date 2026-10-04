import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { issueShowcaseSession } from '../../shared/showcaseSession.ts';

// IssueShowcaseSession — mints the isolated showcase principal.
//
// This is the ONLY way into the exploration experience. The client sends a persona KEY (from the
// server roster) and nothing else: the persona's identity, its dataset and the committees it may
// open are all resolved on the server, and the returned token is a short-lived, revocable proof
// that never becomes a user session. A visitor may obtain one — the showcase is a public
// experience — but what it can reach is decided here, not by the caller.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const body = await req.json().catch(() => ({}));
    const personaKey = typeof body?.persona_key === 'string' ? body.persona_key.trim() : '';
    const entryPoint = typeof body?.entry_point === 'string' ? body.entry_point.slice(0, 120) : null;

    if (!personaKey) {
      return Response.json({ error: 'persona_key is required', code: 'invalid_request' }, { status: 400 });
    }

    // The visitor may be signed in or anonymous — either way this is a showcase principal only.
    const user = await base44.auth.me().catch(() => null);

    const issued = await issueShowcaseSession(sr, { personaKey, issuedTo: user, entryPoint });
    if (!issued.ok) {
      return Response.json({ error: 'Showcase not available', code: issued.reason }, { status: 404 });
    }

    await sr.entities.AuditEvent.create({
      action: 'showcase_session_issued',
      entity_type: 'ShowcaseSession',
      entity_id: issued.session_id,
      entity_title: issued.persona_key,
      actor_user_id: user?.id || 'anonymous',
      actor_name: user?.full_name || 'زائر',
      actor_email: user?.email || 'anonymous@visitor',
      description: `Showcase session issued for ${issued.persona_key}`,
      authority_context: `data_class:${issued.data_class}`,
      correlation_id: `showcase-${issued.session_id}`,
    }).catch(() => {});

    return Response.json({
      status: 'ok',
      showcase_token: issued.token,
      session_id: issued.session_id,
      persona_key: issued.persona_key,
      persona_id: issued.persona_id,
      dataset: issued.dataset,
      data_class: issued.data_class,
      allowed_scope_count: issued.allowed_scope_count,
      allowed_committee_public_ids: issued.allowed_committee_public_ids,
      write_scope: issued.write_scope,
      expires_at: issued.expires_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}