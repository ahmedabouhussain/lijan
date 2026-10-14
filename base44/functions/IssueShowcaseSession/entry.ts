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

    // Retained compatibility endpoint delegates the explicit gateway, never mints here.
    const result = await base44.functions.invoke('EnterExploration', { persona_key: personaKey, entry_point: entryPoint });
    return Response.json(result.data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}