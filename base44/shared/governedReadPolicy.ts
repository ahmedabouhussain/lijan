// LIJAN™ — governed read policy.
//
// ONE decision engine, used by two callers:
//   1. GetCommitteeRecord — the governed read path every detail surface reads through.
//   2. TestShowcaseIsolation — the mandatory isolation self test.
//
// It answers one question — "may this principal read this record, and which parts of it?" —
// and it derives every input from the server: the authenticated user's own records, or a
// server-issued showcase session. A payload never carries authority: organization_id,
// committee_id, role and every other client value are ignored, not merely distrusted.
//
// The service role is used to READ the records the decision is evaluated on. It is never
// used to hand back a record the decision refused, and a refusal is uniform: the same body
// and status answer "not allowed" and "does not exist".

import { resolveCapabilities } from './capabilityKernel.ts';
import { resolvePersonaCapabilities } from './committeeAuth.ts';
import { capabilitiesForRole } from './authorityKernel.ts';
import {
  verifyShowcaseSession,
  touchShowcaseSession,
  recordBelongsToSessionScope,
  dataClassOf,
  isShowcaseRecord,
  isShowcaseCommittee,
  SHOWCASE_REFUSAL,
} from './showcaseSession.ts';

export const GOVERNED_READ_TYPES = ['Meeting', 'Decision', 'MeetingMinutes', 'Document'];

export const READ_REFUSAL = {
  INVALID_REQUEST: 'invalid_request',
  UNSUPPORTED_TYPE: 'unsupported_type',
  NOT_FOUND: 'not_found',
  UNAUTHENTICATED: 'unauthenticated',
  NOT_A_MEMBER: 'not_a_member',
  NO_SEAT: 'no_seat',
  OUT_OF_SCOPE: 'out_of_scope',
  UNKNOWN_PERSONA: 'unknown_persona',
  WRITE_NOT_PERMITTED: 'write_not_permitted',
  /**
   * A REAL account asked for a record that belongs to a demonstration committee. This is not a
   * refusal in the "does not exist" family: the founder's decision is that the record IS reachable,
   * but only inside the isolated exploration session. The code is returned so the surface can offer
   * that one transition instead of an empty page. It is only ever returned for a committee that is
   * itself tagged as demonstration data — a production record never gets this answer.
   */
  SHOWCASE_SCOPE: 'showcase_scope',
};

const READ_REFUSAL_STATUS: Record<string, number> = {
  invalid_request: 400,
  unsupported_type: 400,
  unknown_persona: 400,
  unauthenticated: 401,
  no_session: 401,
  session_expired: 401,
  session_revoked: 401,
  not_a_member: 403,
  no_seat: 403,
  write_not_permitted: 403,
  showcase_scope: 403,
  not_found: 404,
  out_of_scope: 404,
};

/** The single refusal body. It never reveals whether a record, committee or membership exists. */
export function refusalBody(reason: string) {
  return { error: 'Record not available', code: reason || READ_REFUSAL.NOT_FOUND };
}

export function refusalStatus(reason: string) {
  return READ_REFUSAL_STATUS[reason] || 404;
}

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

const ROLE_PRIORITY: Record<string, number> = {
  chair: 1, vice_chair: 2, secretary: 3, committee_administrator: 4,
  member: 5, alternate: 6, observer: 7, advisor: 8,
};

/** Read rank carried by a committee office. Oversight (platform admin / organization admin) reads at officer rank. */
const ROLE_RANK: Record<string, number> = {
  chair: 5, vice_chair: 4, secretary: 4, committee_administrator: 3,
  member: 2, alternate: 1, observer: 1, advisor: 1,
};
const OVERSEER_RANK = 4;

function effectiveSeats(seats: any[]) {
  const today = new Date().toISOString().split('T')[0];
  return (seats || []).filter((m) => {
    if (m.term_start && today < m.term_start) return false;
    if (m.term_end && today > m.term_end) return false;
    return true;
  });
}

function highestRole(seats: any[]) {
  if (!seats || !seats.length) return 'observer';
  return [...seats].sort(
    (a, b) => (ROLE_PRIORITY[a.role] || 99) - (ROLE_PRIORITY[b.role] || 99),
  )[0].role;
}

export function rankForRole(role: string, oversight = false) {
  if (oversight) return Math.max(OVERSEER_RANK, ROLE_RANK[role] || 0);
  return ROLE_RANK[role] || 0;
}

/**
 * The read principal. A showcase token that fails verification does NOT degrade into a
 * user read — it is refused, so an expired or revoked session can never widen into a real
 * session. The caller passes the already-resolved authenticated user (or null).
 */
export async function resolvePrincipal({ sr, body, callerUser }: {
  sr: any;
  body: any;
  callerUser: any;
}) {
  const token = typeof body?.showcase_token === 'string' ? body.showcase_token.trim() : '';
  if (token) {
    const verdict = await verifyShowcaseSession(sr, token);
    if (!verdict.ok) return { kind: 'anonymous', reason: verdict.reason || SHOWCASE_REFUSAL.NO_SESSION };
    await touchShowcaseSession(sr, verdict.session);
    return {
      kind: 'showcase',
      user: callerUser || null,
      session: verdict.session,
      persona: verdict.persona,
      scope: verdict.scope,
    };
  }
  if (callerUser) return { kind: 'user', user: callerUser };
  return { kind: 'anonymous', reason: READ_REFUSAL.UNAUTHENTICATED };
}

/**
 * The decision. `record` is the record being opened; the committee is resolved from that
 * record — never from the request — so changing committee_id or organization_id in a
 * payload cannot move the read.
 */
export async function authorizeRead({ base44, sr, principal, record, writeIntent = false }: {
  base44: any;
  sr: any;
  principal: any;
  record: any;
  writeIntent?: boolean;
}) {
  const deny = (reason: string) => ({ allowed: false, reason });

  if (!principal || principal.kind === 'anonymous') {
    return deny(principal?.reason || READ_REFUSAL.UNAUTHENTICATED);
  }
  // This gate is a read gate. A write attempt is refused here regardless of who asks, and in
  // the showcase it is refused by contract until the isolated sandbox scope is in force.
  if (writeIntent) return deny(READ_REFUSAL.WRITE_NOT_PERMITTED);

  const committee = record?.committee_id
    ? await sr.entities.Committee.get(record.committee_id).catch(() => null)
    : null;
  if (!committee) return deny(READ_REFUSAL.NOT_FOUND);

  if (principal.kind === 'showcase') {
    const session = principal.session;
    if (!recordBelongsToSessionScope(record, committee, session)) {
      // Covers both directions: a production record, another persona's dataset, or a
      // committee outside the session's allowed scope.
      return deny(READ_REFUSAL.OUT_OF_SCOPE);
    }
    const seats = arr(await sr.entities.CommitteeMembership
      .filter({ committee_id: committee.id, user_id: principal.persona.user_id, status: 'active' })
      .catch(() => []));
    const active = effectiveSeats(seats);
    if (!active.length) return deny(READ_REFUSAL.NO_SEAT);

    const resolved = await resolvePersonaCapabilities(base44, principal.persona, committee);
    const role = resolved.role || highestRole(active);
    if (!role) return deny(READ_REFUSAL.NO_SEAT);

    return {
      allowed: true,
      committee,
      role,
      read_rank: rankForRole(role),
      capabilities: resolved.capabilities || {},
      authority: capabilitiesForRole(role),
      actor: {
        kind: 'persona',
        id: principal.persona.user_id,
        name: principal.persona.name_ar || principal.persona.name_en || null,
        persona_key: principal.persona.key,
      },
      is_demo_mode: true,
      data_class: dataClassOf(record, committee),
      showcase: {
        session_id: session.id,
        persona_key: session.persona_key,
        persona_id: session.persona_id,
        dataset: session.dataset,
        data_class: session.data_class,
        allowed_committee_public_ids: session.allowed_committee_public_ids || [],
        write_scope: session.write_scope || 'none',
        expires_at: session.expires_at,
      },
    };
  }

  // ── Authenticated user ──────────────────────────────────────────────────────────────
  const user = principal.user;
  const isPlatformAdmin = user.role === 'admin';

  // A real principal may never read a demonstration record — not even an administrator. The
  // demonstration is entered through its own session, or not at all.
  //   • a demonstration COMMITTEE answers showcase_scope, so the surface can offer the one
  //     transition into the exploration session and reopen the same record inside it;
  //   • a record that merely carries a tag its committee does not (a mis-tag) stays invisible:
  //     there is nothing to offer, so the refusal is uniform.
  if (isShowcaseCommittee(committee)) {
    return deny(READ_REFUSAL.SHOWCASE_SCOPE);
  }
  if (isShowcaseRecord(record)) {
    return deny(READ_REFUSAL.NOT_FOUND);
  }

  const [orgSeats, seats] = await Promise.all([
    sr.entities.OrganizationMembership
      .filter({ user_id: user.id, status: 'active' })
      .catch(() => []),
    sr.entities.CommitteeMembership
      .filter({ committee_id: committee.id, user_id: user.id, status: 'active' })
      .catch(() => []),
  ]);

  const orgRows = arr(orgSeats);
  const orgIds = orgRows.map((s: any) => s.organization_id);
  const ownsOrg = orgIds.includes(committee.organization_id);
  const isOrgAdmin = orgRows.some((s: any) => s.role === 'owner' || s.role === 'admin');
  const participates = (committee.participating_organization_ids || [])
    .some((id: string) => orgIds.includes(id));

  const active = effectiveSeats(arr(seats));
  const allowed = active.length > 0
    || isPlatformAdmin
    || (isOrgAdmin && ownsOrg)
    || (participates && orgRows.length > 0);
  if (!allowed) return deny(READ_REFUSAL.NOT_A_MEMBER);

  const role = active.length ? highestRole(active) : 'observer';
  return {
    allowed: true,
    committee,
    role,
    read_rank: rankForRole(role, isPlatformAdmin || isOrgAdmin),
    capabilities: resolveCapabilities({
      user,
      orgMembership: orgRows.find((s: any) => s.organization_id === committee.organization_id) || null,
      committeeMemberships: active,
      isPlatformAdmin,
    }),
    authority: capabilitiesForRole(role),
    actor: { kind: 'user', id: user.id, name: user.full_name || user.email || null },
    is_demo_mode: false,
    data_class: 'production',
    showcase: null,
  };
}

// ── Projection ────────────────────────────────────────────────────────────────────────
// A role gets the fields it needs, not the bundle. Personal handles go to officers and to
// the person themselves; a file reference is withheld where the actor's rank is below the
// record's classification, so a link is never handed out ahead of the file gate.

const CONTACT_FIELDS = [
  'user_email', 'user_id', 'owner_user_id', 'uploaded_by_user_id', 'generated_by_user_id',
  'reviewer_user_id', 'requested_by_user_id', 'recipient_email', 'recipient_user_id',
  'actor_email', 'ip_address', 'user_agent',
];
const FILE_FIELDS = [
  'file_url', 'file_uri', 'storage_key', 'avatar_url', 'signature_image_url',
  'evidence_url', 'output_url', 'instrument_file_url', 'document_file_url',
];
const SECRET_FIELDS = ['token', 'showcase_token'];
// Personal handles that never travel into a showcase session, whatever the persona's rank: the
// demonstration is public, and the people who provisioned it are real.
const SHOWCASE_WITHHELD_FIELDS = ['actor_email', 'user_email', 'recipient_email', 'issued_to_email', 'ip_address', 'user_agent'];
const OFFICER_RANK = 4;
const CLASS_MIN_RANK: Record<string, number> = { restricted: 3, highly_restricted: 4 };

export function projectRecord(record: any, ctx: { rank: number; actorId?: string; showcase?: boolean }) {
  const withheld = { contact: 0, file_refs: 0, secret: 0 };
  if (!record || typeof record !== 'object') return { values: record, withheld };

  const values = { ...record };
  for (const field of SECRET_FIELDS) {
    if (field in values) {
      delete values[field];
      withheld.secret += 1;
    }
  }
  if (ctx.showcase) {
    for (const field of SHOWCASE_WITHHELD_FIELDS) {
      if (field in values && values[field] != null) {
        delete values[field];
        withheld.contact += 1;
      }
    }
  }

  const officer = (ctx.rank || 0) >= OFFICER_RANK;
  for (const field of CONTACT_FIELDS) {
    if (field in values && values[field] != null && !officer && values[field] !== ctx.actorId) {
      delete values[field];
      withheld.contact += 1;
    }
  }

  const required = CLASS_MIN_RANK[values.classification] || 0;
  if ((ctx.rank || 0) < required) {
    for (const field of FILE_FIELDS) {
      if (values[field]) {
        delete values[field];
        withheld.file_refs += 1;
      }
    }
  }
  return { values, withheld };
}

/** Minimum read rank for a related collection. Absent keys are always returned. */
const RELATED_MIN_RANK: Record<string, number> = {
  votes: 2,
  review_requests: 2,
  review_responses: 3,
};

export function gateRelated(bundle: any, ctx: { rank: number; actorId?: string; showcase?: boolean }) {
  const values: Record<string, any> = {};
  const withheldKeys: string[] = [];
  const rank = ctx.rank || 0;

  for (const [key, value] of Object.entries(bundle || {})) {
    const minimum = RELATED_MIN_RANK[key];
    if (minimum && rank < minimum) {
      // A party to a review keeps sight of the responses on their own request.
      if (key === 'review_responses' && ctx.actorId) {
        const involved = (values.review_requests || []).some(
          (r: any) => r.reviewer_user_id === ctx.actorId || r.requested_by_user_id === ctx.actorId,
        );
        if (involved) {
          values[key] = value;
          continue;
        }
      }
      withheldKeys.push(key);
      continue;
    }
    values[key] = value;
  }
  return { values, withheld_keys: withheldKeys };
}

/** Project every record inside the returned bundle with the same rules. */
export function projectBundle(bundle: any, ctx: { rank: number; actorId?: string; showcase?: boolean }) {
  const values: Record<string, any> = {};
  const totals = { contact: 0, file_refs: 0, secret: 0 };

  for (const [key, value] of Object.entries(bundle || {})) {
    if (Array.isArray(value)) {
      values[key] = value.map((row) => {
        const projected = projectRecord(row, ctx);
        totals.contact += projected.withheld.contact;
        totals.file_refs += projected.withheld.file_refs;
        totals.secret += projected.withheld.secret;
        return projected.values;
      });
      continue;
    }
    if (value && typeof value === 'object') {
      const projected = projectRecord(value, ctx);
      totals.contact += projected.withheld.contact;
      totals.file_refs += projected.withheld.file_refs;
      totals.secret += projected.withheld.secret;
      values[key] = projected.values;
      continue;
    }
    values[key] = value;
  }
  return { values, withheld: totals };
}