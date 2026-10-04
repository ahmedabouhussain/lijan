/**
 * LIJAN™ — governed file access policy.
 *
 * ONE decision engine, used by two callers:
 *   1. RequestFileAccess  — the server gate that serves a private governance file.
 *   2. TestFileAccessPolicy — the synthetic-identity self test.
 *
 * This module NEVER mints a link. It answers a single question ("may this actor
 * receive this file, for this action?") and the gate only signs after an allow.
 * A deny and a missing record are reported with the same shape, so a refusal
 * never discloses whether a file exists.
 */

export const LINK_TTL_SECONDS = 300;

/** Fields that hold a governed (non-public) file reference. */
export const PRIVATE_FILE_FIELDS = new Set([
  'signature_image_url',
  'file_url',
  'file_uri',
  'storage_key',
  'document_file_url',
  'instrument_file_url',
  'zip_file_uri',
  'evidence_url',
  'output_url',
]);

/** Fields that hold an approved public brand/identity asset — rendered directly, never signed. */
export const PUBLIC_ASSET_FIELDS = new Set([
  'logo_url',
  'logo',
  'brand_logo_url',
  'icon_url',
  'cover_image_url',
  'header_image_url',
]);

const ROLE_RANK: Record<string, number> = {
  chair: 5,
  vice_chair: 4,
  secretary: 4,
  committee_administrator: 3,
  member: 2,
  alternate: 1,
  observer: 1,
  advisor: 1,
};

/** Minimum committee role rank allowed to open a file of each classification. */
const MIN_ROLE_FOR_CLASSIFICATION: Record<string, number> = {
  public: 1,
  internal: 1,
  confidential: 1,
  restricted: 3,
  highly_restricted: 4,
};

const CLASSIFICATION_RANK: Record<string, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
  restricted: 3,
  highly_restricted: 4,
};

export type AccessDecision = 'allow' | 'deny' | 'not_governed';

export interface AccessVerdict {
  decision: AccessDecision;
  /** Safe, non-disclosing reason code — the only thing written to the audit trail. */
  reason: string;
  /** Presentation state for the client when the file is simply not a governed file. */
  state?: 'public_asset' | 'legacy_pending_migration';
  required_role?: string;
  classification?: string;
}

export interface ActorDescriptor {
  kind: 'user' | 'anonymous' | 'synthetic';
  user_id?: string;
  email?: string;
  active_org_id?: string;
  platform_role?: string;
  memberships?: Array<{
    committee_id: string;
    role?: string;
    status?: string;
    user_id?: string;
    user_email?: string;
  }>;
}

const isHttpRef = (value?: string) =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

/** A stable, non-reversible handle for a stored reference (never the path itself). */
export async function fingerprintRef(value?: string): Promise<string> {
  if (!value) return '';
  const bytes = new TextEncoder().encode(value.trim());
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
}

/**
 * The decision itself. Order is deliberate and each step is a documented refusal:
 * identity → field → file → legacy → organization scope → committee membership →
 * role against classification → purpose.
 */
export function evaluateAccess(input: {
  actor: ActorDescriptor;
  refField?: string;
  refValue?: string;
  record?: Record<string, any> | null;
  classification?: string;
  action?: string;
  purpose?: string;
}): AccessVerdict {
  const { actor, refField, refValue, record, action } = input;
  const classification = input.classification || record?.classification || 'internal';

  // 1. Identity — an anonymous caller never receives a signed governance link.
  if (!actor || actor.kind === 'anonymous' || !actor.user_id) {
    return { decision: 'deny', reason: 'unauthenticated' };
  }

  // 2. Field — an approved public asset is not a governed file.
  if (refField && PUBLIC_ASSET_FIELDS.has(refField)) {
    return { decision: 'not_governed', reason: 'public_asset', state: 'public_asset' };
  }
  if (!refField || (!PRIVATE_FILE_FIELDS.has(refField) && !refField.startsWith('file_'))) {
    return { decision: 'deny', reason: 'unsupported_field' };
  }

  // 3. The record must exist and actually carry a file.
  if (!record || !refValue || !String(refValue).trim()) {
    return { decision: 'deny', reason: 'not_found_or_empty' };
  }

  // 4. A legacy public link is never handed back for a sensitive field: it is a
  //    migration finding, not an access path.
  if (isHttpRef(refValue)) {
    return { decision: 'not_governed', reason: 'legacy_public_link', state: 'legacy_pending_migration' };
  }

  const isPlatformAdmin = actor.platform_role === 'admin';

  // 5. Organization scope.
  if (!isPlatformAdmin) {
    const recordOrg = record.organization_id;
    if (recordOrg && actor.active_org_id && recordOrg !== actor.active_org_id) {
      return { decision: 'deny', reason: 'out_of_scope', classification };
    }
    if (recordOrg && !actor.active_org_id) {
      return { decision: 'deny', reason: 'out_of_scope', classification };
    }
  }

  // 6. Committee membership — an active seat in THIS committee.
  const committeeId = record.committee_id;
  let membershipRole = '';
  if (!isPlatformAdmin && committeeId) {
    const seats = (actor.memberships || []).filter((m) => m.committee_id === committeeId);
    const identityMatches = (m: any) =>
      (m.user_id && actor.user_id && m.user_id === actor.user_id) ||
      (m.user_email && actor.email && String(m.user_email).toLowerCase() === String(actor.email).toLowerCase());
    const active = seats.find((m) => identityMatches(m) && (m.status || 'active') === 'active');
    if (active) {
      membershipRole = active.role || 'member';
    } else if (seats.some((m) => identityMatches(m))) {
      // The seat exists but is recused, resigned or inactive.
      return { decision: 'deny', reason: 'membership_not_active', classification };
    } else {
      return { decision: 'deny', reason: 'not_a_member', classification };
    }
  }

  // 7. Role against classification.
  const held = isPlatformAdmin ? 5 : ROLE_RANK[membershipRole] ?? 0;
  const needed = MIN_ROLE_FOR_CLASSIFICATION[classification] ?? 1;
  if (held < needed) {
    const requiredRole = classification === 'highly_restricted' ? 'chair' : 'committee_administrator';
    return { decision: 'deny', reason: 'insufficient_role', required_role: requiredRole, classification };
  }

  // 8. Sharing a confidential-or-above file requires a stated purpose.
  if (action === 'share' && (CLASSIFICATION_RANK[classification] ?? 1) >= 2 && !input.purpose) {
    return { decision: 'deny', reason: 'purpose_required', classification };
  }

  return { decision: 'allow', reason: isPlatformAdmin ? 'platform_admin' : `member_${membershipRole}`, classification };
}

/** Human-readable, locale-neutral explanation key for a refusal (client maps it). */
export const REASON_KEYS = [
  'unauthenticated',
  'unsupported_field',
  'not_found_or_empty',
  'legacy_public_link',
  'out_of_scope',
  'membership_not_active',
  'not_a_member',
  'insufficient_role',
  'purpose_required',
  'not_found_or_denied',
] as const;