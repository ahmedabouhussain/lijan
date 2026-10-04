// LIJAN™ — Showcase session kernel.
//
// The exploration experience is a PRINCIPAL, not a mode flag. It is issued here, on the
// server, and it is the only thing that authorises a showcase read:
//   • short-lived (SHOWCASE_TTL_MINUTES) — an abandoned tab stops being a way in;
//   • bound to ONE persona from the server roster — the client names a key, never a role;
//   • bound to a server-resolved committee scope — a link may not widen it;
//   • bound to ONE dataset — showcase reads can never resolve a production record;
//   • revocable and re-issuable — Reset/Exit revoke it server-side;
//   • carried as an unguessable token whose state lives in a server record, so it can be
//     expired or revoked at any moment instead of trusting a client-held claim.
//
// A showcase token is NEVER a user session: it cannot be exchanged for one, it is not
// accepted where a user is required, and it does not read a real user's active organization.

import { resolveDemoPersona } from './demoPersonas.ts';

export const SHOWCASE_DATA_CLASS = 'synthetic_showcase';
export const SHOWCASE_TTL_MINUTES = 120;
/** Writes inside the showcase are gated by the sandbox contract; until it is in force, none. */
export const SHOWCASE_WRITE_SCOPE = 'none';

/** Non-disclosing refusal codes. The same code answers "not allowed" and "does not exist". */
export const SHOWCASE_REFUSAL = {
  NO_SESSION: 'no_session',
  UNKNOWN: 'no_session',
  EXPIRED: 'session_expired',
  REVOKED: 'session_revoked',
  OUT_OF_SCOPE: 'out_of_scope',
  NO_SEAT: 'no_seat',
  UNKNOWN_PERSONA: 'unknown_persona',
};

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

/** 192 bits of randomness — the token is a capability, so it must not be guessable. */
export function randomShowcaseToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * The committees a persona may open — resolved from the server roster and the tagged
 * demonstration committees only. The client contributes the persona KEY and nothing else.
 */
export async function resolvePersonaScope(sr: any, personaKey: string) {
  const persona = resolveDemoPersona(personaKey);
  if (!persona) return { ok: false, reason: SHOWCASE_REFUSAL.UNKNOWN_PERSONA };

  const listed = Object.keys(persona.presentation?.committees || {});
  const rows = arr(await sr.entities.Committee
    .filter({ demo_dataset: persona.dataset, is_demo_data: true })
    .catch(() => []));
  const allowed = rows.filter(
    (c: any) => c.is_demo_data === true
      && c.demo_dataset === persona.dataset
      && (listed.length ? listed.includes(c.public_id) : true),
  );
  if (!allowed.length) return { ok: false, reason: SHOWCASE_REFUSAL.OUT_OF_SCOPE };

  return {
    ok: true,
    persona,
    dataset: persona.dataset,
    principal_id: persona.user_id,
    committee_ids: allowed.map((c: any) => c.id),
    committee_public_ids: allowed.map((c: any) => c.public_id),
  };
}

export async function issueShowcaseSession(sr: any, options: {
  personaKey: string;
  issuedTo?: any;
  entryPoint?: string | null;
}) {
  const scope = await resolvePersonaScope(sr, options.personaKey);
  if (!scope.ok) return scope;

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + SHOWCASE_TTL_MINUTES * 60 * 1000).toISOString();

  const session = await sr.entities.ShowcaseSession.create({
    token: randomShowcaseToken(),
    status: 'active',
    persona_key: scope.persona.key,
    persona_id: scope.persona.persona_id,
    principal_id: scope.principal_id,
    dataset: scope.dataset,
    data_class: SHOWCASE_DATA_CLASS,
    allowed_committee_ids: scope.committee_ids,
    allowed_committee_public_ids: scope.committee_public_ids,
    issued_to_user_id: options.issuedTo?.id || null,
    issued_to_email: options.issuedTo?.email || null,
    issued_at: issuedAt.toISOString(),
    expires_at: expiresAt,
    write_scope: SHOWCASE_WRITE_SCOPE,
    entry_point: options.entryPoint || null,
    correlation_id: `showcase-${issuedAt.getTime().toString(36)}`,
  });

  return {
    ok: true,
    token: session.token,
    session_id: session.id,
    expires_at: expiresAt,
    persona_key: scope.persona.key,
    persona_id: scope.persona.persona_id,
    dataset: scope.dataset,
    data_class: SHOWCASE_DATA_CLASS,
    allowed_committee_public_ids: scope.committee_public_ids,
    allowed_scope_count: scope.committee_ids.length,
    write_scope: SHOWCASE_WRITE_SCOPE,
  };
}

/** Verify a token server-side. Every failure is a refusal — never a downgrade to a user session. */
export async function verifyShowcaseSession(sr: any, token: string, options: { committeeId?: string } = {}) {
  if (!token || typeof token !== 'string') return { ok: false, reason: SHOWCASE_REFUSAL.NO_SESSION };

  const rows = arr(await sr.entities.ShowcaseSession.filter({ token }).catch(() => []));
  const session = rows[0];
  if (!session) return { ok: false, reason: SHOWCASE_REFUSAL.UNKNOWN };
  if (session.status === 'revoked') return { ok: false, reason: SHOWCASE_REFUSAL.REVOKED };

  const expired = session.status === 'expired'
    || !session.expires_at
    || new Date(session.expires_at).getTime() <= Date.now();
  if (expired) {
    if (session.status === 'active') {
      await sr.entities.ShowcaseSession.update(session.id, { status: 'expired' }).catch(() => {});
    }
    return { ok: false, reason: SHOWCASE_REFUSAL.EXPIRED };
  }

  if (options.committeeId && !(session.allowed_committee_ids || []).includes(options.committeeId)) {
    return { ok: false, reason: SHOWCASE_REFUSAL.OUT_OF_SCOPE };
  }

  const persona = resolveDemoPersona(session.persona_key);
  if (!persona) return { ok: false, reason: SHOWCASE_REFUSAL.UNKNOWN_PERSONA };

  return {
    ok: true,
    session,
    persona,
    scope: {
      dataset: session.dataset,
      committee_ids: session.allowed_committee_ids || [],
      committee_public_ids: session.allowed_committee_public_ids || [],
      data_class: session.data_class || SHOWCASE_DATA_CLASS,
      write_scope: session.write_scope || SHOWCASE_WRITE_SCOPE,
    },
  };
}

export async function touchShowcaseSession(sr: any, session: any) {
  if (!session?.id) return;
  await sr.entities.ShowcaseSession
    .update(session.id, { last_seen_at: new Date().toISOString() })
    .catch(() => {});
}

export async function revokeShowcaseSession(sr: any, token: string, reason?: string) {
  const rows = token ? arr(await sr.entities.ShowcaseSession.filter({ token }).catch(() => [])) : [];
  const session = rows[0];
  if (!session) return { ok: true, revoked: false };
  if (session.status === 'active') {
    await sr.entities.ShowcaseSession.update(session.id, {
      status: 'revoked',
      revoked_at: new Date().toISOString(),
      revoke_reason: reason || 'exit',
    });
  }
  return { ok: true, revoked: true, session_id: session.id };
}

/** A record may carry its own demonstration tag. */
export function isShowcaseRecord(record: any): boolean {
  return !!record && record.is_demo_data === true;
}

/**
 * The tagging model: the COMMITTEE carries the demonstration tag (is_demo_data + demo_dataset)
 * and every record belonging to it inherits it. That makes the committee the scope boundary —
 * which is also where the allowed scope is checked, so a record can never be reached by being
 * linked from outside.
 */
export function isShowcaseCommittee(committee: any): boolean {
  return !!committee && committee.is_demo_data === true;
}

export function dataClassOf(record: any, committee: any): string {
  if (isShowcaseCommittee(committee)) return SHOWCASE_DATA_CLASS;
  return isShowcaseRecord(record) ? SHOWCASE_DATA_CLASS : 'production';
}

/**
 * The one rule that keeps the two worlds apart: a showcase session reads a record of ITS
 * dataset, inside ITS committee scope — and nothing else, in either direction. A record that
 * carries its own tag must agree with its committee; disagreement is a refusal, not a fallback.
 */
export function recordBelongsToSessionScope(record: any, committee: any, session: any): boolean {
  if (!committee || !session) return false;
  if (!isShowcaseCommittee(committee)) return false;
  if (committee.demo_dataset !== session.dataset) return false;
  if (!(session.allowed_committee_ids || []).includes(committee.id)) return false;
  if (record?.is_demo_data === false) return false;
  if (record?.demo_dataset && record.demo_dataset !== session.dataset) return false;
  return true;
}