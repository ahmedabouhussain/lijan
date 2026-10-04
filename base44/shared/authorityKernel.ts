// authorityKernel.ts — THE single authorization decision source for LIJAN™.
//
// Policy version travels with every decision so a refusal can always be traced to the rule set
// that produced it. ONE pure evaluator answers "may this seat perform this act", and ONE
// database-backed resolver feeds it the facts. Nothing else in the platform decides authority:
// the command path (resolveAuthority) and the showcase read path (committeeAuth) both consume
// capabilitiesForRole / evaluateActionPolicy from here.
//
// Contract (fixed):
//   • ROLE = a template/ceiling, never a decision grant on its own.
//   • AuthorityGrant = an explicit, bounded ADDITION or RESTRICTION on top of the ceiling.
//   • A DENIAL always wins over a permission, and no grant can exceed the institutional ceiling.
//   • Vice-Chair acts as Chair ONLY under an active, in-scope delegation.
//   • Scope is DERIVED from the target record (record → committee → organization). Client-supplied
//     organization_id / committee_id / role / *_id / is_admin / can_* are never an authority source.
//   • Recusal is matched by identifiers. A legacy name match may only ever DENY, never permit, and
//     it is reported as such in the decision context.
//   • FAIL-CLOSED: if a fact the decision depends on cannot be established (a recusal set or an
//     authority grant that cannot be read), the act is REFUSED. A fact that cannot be read is never
//     treated as a fact that is absent.
//   • Every decision reports `scope_provenance`, so a surface can tell whether the scope came from
//     the target record itself or from a committee lookup hint.

export const AUTHORITY_POLICY_VERSION = "authz-1.2.0-rc.1";

/**
 * The build record of the policy in force. A security-material change never keeps the previous
 * version name, and evidence produced under an older version is never carried forward — the
 * previous version's results are INVALIDATED and must be re-run against this one.
 * `source_hash` is computed and written by scripts/authority-policy-manifest.mjs, never by hand.
 */
export const AUTHORITY_POLICY_BUILD = {
  version: "authz-1.2.0-rc.1",
  supersedes: "authz-1.1.0",
  change_class: "security",
  changes: [
    "trusted-target coverage extended to every writing command (no committee lookup hint)",
    "capabilities named for the acts that had no operational right: meeting.adjourn, meeting.cancel, agenda.propose, memory.compile",
    "compare-and-swap transition claim on the critical writes (one material effect per transition)",
    "decision.issue gate accepts issued/executing so a repeated issue stays an idempotent result",
    "fail-closed when the recusal set cannot be read",
    "fail-closed when the authority grant cannot be read",
    "scope provenance reported on every decision",
    "command guard: trusted target, parent-chain agreement, related-scope containment",
    "scope derived from the target record, never from the request",
    "seat-borne self-service rights separated from office capabilities",
  ],
  invalidates_prior_evidence: true,
};

/** Read-only ceiling for platform admins: administration is not operational authority. */
export const ADMIN_READ_CEILING = ["read", "audit.read", "report.export", "committee.view", "decision.view"];

/** Capabilities that carry an operational consequence and therefore require a real right. */
export const OPERATIONAL_CAPABILITIES = [
  "conflict.declare", "recusal.record",
  "committee.activate", "committee.manage", "committee.close",
  "meeting.schedule", "meeting.start", "meeting.adjourn", "meeting.cancel",
  "agenda.edit", "agenda.approve", "agenda.propose", "memory.compile",
  "vote.call", "vote.certify", "vote.cast",
  "minutes.draft", "minutes.review", "minutes.approve",
  "attendance.certify", "attendance.respond", "action.admin", "action.progress",
  "action.close", "escalation.approve", "review.respond", "amendment.notify",
  "agenda.evaluate", "instrument.extract",
  "decision.review", "decision.approve", "decision.issue", "decision.vote",
  "decision.sign_image", "decision.digital_sign", "decision.execute",
];

/** Capabilities blocked for a member who is recused from the committee. */
const RECUSAL_BLOCKED = [
  "vote.cast", "vote.call", "vote.certify", "decision.vote",
  "decision.approve", "decision.issue", "decision.sign_image", "decision.digital_sign",
];

/** What a delegation of chair authority may transfer — never a blanket role swap. */
export const DELEGABLE_CAPABILITIES = [
  "agenda.approve", "meeting.start", "meeting.adjourn", "meeting.cancel",
  "vote.call", "vote.certify",
  "minutes.approve", "decision.approve", "decision.issue",
  "escalation.approve", "action.admin", "action.close", "committee.activate",
];

/**
 * Decision rights are separated deliberately:
 *   vote ≠ approve ≠ issue, and a signature IMAGE is not a DIGITAL signature.
 * `decision.digital_sign` is granted to NOBODY until an approved policy names the identity
 * provider, the trust service and the legal instrument behind it.
 */
const ROLE_BASELINE = {
  chair: [
    "committee.activate", "committee.manage", "committee.close",
    "meeting.schedule", "meeting.start", "meeting.adjourn", "meeting.cancel",
    "memory.compile", "agenda.edit", "agenda.approve",
    "vote.call", "vote.certify", "vote.cast",
    "minutes.draft", "minutes.review", "minutes.approve",
    "attendance.certify", "attendance.respond", "action.admin", "action.progress",
    "action.close",
    "escalation.approve", "amendment.notify", "agenda.evaluate", "instrument.extract",
    "decision.view", "decision.comment", "decision.propose", "decision.review",
    "decision.approve", "decision.issue", "decision.vote", "decision.acknowledge",
    "decision.sign_image", "decision.execute", "review.respond",
    "comment.shared", "read", "audit.read", "report.export",
  ],
  vice_chair: [
    "agenda.propose", "attendance.respond", "action.progress", "review.respond",
    "decision.view", "decision.comment", "decision.propose",
    "decision.review", "decision.vote", "decision.acknowledge", "comment.shared",
    "read", "audit.read", "report.export",
  ],
  secretary: [
    "meeting.schedule", "meeting.cancel", "memory.compile",
    "agenda.edit", "agenda.propose", "agenda.evaluate",
    "minutes.draft", "minutes.review", "attendance.certify", "attendance.respond",
    "action.admin", "action.progress", "amendment.notify", "instrument.extract",
    "review.respond",
    "decision.view", "decision.comment", "decision.review", "decision.acknowledge",
    "read", "audit.read", "report.export",
  ],
  committee_administrator: [
    "agenda.edit", "agenda.evaluate", "memory.compile", "action.admin", "action.progress",
    "attendance.certify", "attendance.respond", "amendment.notify", "instrument.extract",
    "decision.view", "decision.comment", "read", "audit.read",
  ],
  member: [
    "agenda.propose", "attendance.respond", "action.progress",
    "decision.view", "decision.comment", "decision.propose",
    "decision.vote", "decision.acknowledge", "comment.shared", "read",
  ],
  alternate: ["read", "attendance.respond"],
  observer: ["read"],
  advisor: ["read", "comment.shared", "decision.view", "decision.comment"],
  auditor: ["read", "audit.read", "report.export"],
};

/**
 * A declaration is personal, never an office: whoever holds a seat may declare their OWN conflict or
 * record their OWN recusal, and the command writes the acting seat's identity — never a named person.
 * These two are derived from the seat's read right rather than repeated across every role list.
 *
 * Self-service rights are listed here so the set stays ONE list: each is a personal act bound to the
 * actor's own record, never a right over another person's record.
 */
const SELF_SERVICE_CAPABILITIES = ["conflict.declare", "recusal.record"];

export function capabilitiesForRole(role, { delegationActive = false } = {}) {
  const base = ROLE_BASELINE[role] ? [...ROLE_BASELINE[role]] : [];
  if (base.includes("read")) for (const cap of SELF_SERVICE_CAPABILITIES) base.push(cap);
  if (!delegationActive) return base;
  for (const cap of DELEGABLE_CAPABILITIES) if (!base.includes(cap)) base.push(cap);
  return base;
}

export function isOperationalCapability(capability) {
  return OPERATIONAL_CAPABILITIES.includes(capability);
}

/**
 * The ONE decision. Pure — no I/O — so the same call can be exercised by tests and by commands.
 */
export function evaluateActionPolicy({
  role = null,
  capability,
  delegationActive = false,
  recusalActive = false,
  recusalLegacyNameMatch = false,
  grant = null,
  isPlatformAdmin = false,
} = {}) {
  const base = { capability: capability || null, policy_version: AUTHORITY_POLICY_VERSION, effective_role: role || null };

  if (!capability) return { ...base, allowed: false, reason: "No capability requested", code: "invalid_capability" };

  // 'committee.view' is a legacy synonym of read: normalised here so the one command that used it
  // keeps working, without gaining anything it did not already hold.
  if (capability === "committee.view") capability = "read";

  if (isPlatformAdmin) {
    const readCeiling = ADMIN_READ_CEILING.includes(capability);
    return {
      ...base,
      allowed: readCeiling,
      reason: readCeiling ? null : "Platform administration does not carry operational committee authority",
      code: readCeiling ? null : "admin_not_operational",
      cap_source: readCeiling ? "admin_read_ceiling" : null,
    };
  }

  // An existing grant that is out of validity or carries a declared conflict removes the seat's
  // authority entirely — it is never silently ignored.
  if (grant && grant.record_state === "out_of_validity") {
    return { ...base, allowed: false, reason: "Authority grant is outside its validity window", code: "grant_out_of_validity", grant_status: "out_of_validity" };
  }
  if (grant && grant.conflict_status === "declared") {
    return { ...base, allowed: false, reason: "A conflict of interest is declared for this seat", code: "conflict_declared", grant_status: "conflict_declared" };
  }

  if (recusalActive && RECUSAL_BLOCKED.includes(capability)) {
    return {
      ...base,
      allowed: false,
      reason: "Member is recused from this committee",
      code: "recused",
      recusal_legacy_name_match: recusalLegacyNameMatch === true,
    };
  }

  if (!role) {
    return { ...base, allowed: false, reason: "No committee seat is held in this committee", code: "no_seat" };
  }

  const granted = capabilitiesForRole(role, { delegationActive });
  if (!granted.includes(capability)) {
    return {
      ...base,
      allowed: false,
      reason: `Role '${role}' does not hold capability '${capability}'`,
      code: "role_missing_capability",
      delegation_applied: delegationActive,
    };
  }

  // Grant layer: explicit denial wins; an explicit list narrows; an addition may only add within
  // the delegable envelope, never above the institutional ceiling.
  if (grant) {
    const denied = Array.isArray(grant.denied_actions) ? grant.denied_actions : [];
    if (denied.includes(capability)) {
      return { ...base, allowed: false, reason: "The authority grant explicitly denies this action", code: "grant_denied", grant_status: "permitted_subset" };
    }
    const permitted = Array.isArray(grant.permitted_actions) ? grant.permitted_actions : [];
    const additions = Array.isArray(grant.additions) ? grant.additions : [];
    if (!granted.includes(capability) && additions.includes(capability) && DELEGABLE_CAPABILITIES.includes(capability)) {
      return { ...base, allowed: true, reason: null, code: null, cap_source: "grant_addition", grant_status: "extended" };
    }
    if (!granted.includes(capability) && permitted.length > 0 && !permitted.includes(capability)) {
      return { ...base, allowed: false, reason: "Action is outside the authority granted to this seat", code: "not_in_grant", grant_status: "permitted_subset" };
    }
    return {
      ...base,
      allowed: true,
      reason: null,
      code: null,
      cap_source: delegationActive ? "role_baseline_delegated" : "role_baseline",
      grant_status: permitted.length === 0 ? "unpopulated_no_restriction" : "permitted_subset",
    };
  }

  return {
    ...base,
    allowed: true,
    reason: null,
    code: null,
    cap_source: delegationActive ? "role_baseline_delegated" : "role_baseline",
    grant_status: "no_grant",
    delegation_applied: delegationActive,
  };
}

/** Statuses that make a delegation usable. */
const DELEGATION_ACTIVE_STATUSES = ["active"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function coversToday(row) {
  const today = todayISO();
  if (row.start_date && today < row.start_date) return false;
  if (row.end_date && today > row.end_date) return false;
  return true;
}

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Resolve the effective authority for ONE action.
 *
 * opts:
 *   capability   — required. The act being performed.
 *   record       — optional. When supplied, the committee is DERIVED from it and a conflicting
 *                  committee_id in the request is refused (and audited) instead of honoured.
 *   committee_id — a LOOKUP hint only. Ignored as an authority source when `record` is present.
 *   organization_id — accepted for backwards compatibility and IGNORED as an authority source;
 *                  the organization is always derived from the committee.
 */
export async function resolveAuthority(base44, opts = {}) {
  const { capability, record = null } = opts;
  const sr = base44.asServiceRole;
  const correlation_id = generateCorrelationId();
  const decision = (extra) => ({ correlation_id, policy_version: AUTHORITY_POLICY_VERSION, capability: capability || null, ...extra });

  const user = await base44.auth.me().catch(() => null);
  if (!user) return decision({ allowed: false, reason: "Unauthorized", code: "unauthenticated", status: 401, user: null });

  const claimedCommitteeId = opts.committee_id || null;
  const derivedCommitteeId = record && record.committee_id ? record.committee_id : null;
  const scopeProvenance = derivedCommitteeId ? "target_record" : "committee_lookup_hint";

  // A recusal or grant set that cannot be READ is not an empty set: the act is refused.
  const authorityUnavailable = (committeeId, organizationId) => decision({
    allowed: false, user, status: 503, code: "authority_unavailable",
    reason: "Authority could not be established; the act was not performed",
    committee_id: committeeId || null, organization_id: organizationId || null,
    scope_provenance: scopeProvenance,
  });

  if (derivedCommitteeId && claimedCommitteeId && derivedCommitteeId !== claimedCommitteeId) {
    await sr.entities.AuditEvent.create({
      organization_id: record.organization_id || null,
      committee_id: derivedCommitteeId,
      actor_user_id: user.id, actor_name: user.full_name || user.email, actor_email: user.email,
      action: "authority.scope_mismatch", entity_type: "Committee",
      entity_id: derivedCommitteeId,
      description: "A request carried a committee scope that differs from the target record's own scope; the request was refused.",
      correlation_id, authority_context: `policy:${AUTHORITY_POLICY_VERSION}`,
    }).catch(() => null);
    return decision({
      allowed: false, user, status: 403, code: "scope_mismatch",
      reason: "The requested scope does not match the target record's scope",
      committee_id: derivedCommitteeId, organization_id: record.organization_id || null,
      scope_provenance: scopeProvenance,
    });
  }

  const committeeId = derivedCommitteeId || claimedCommitteeId;
  if (!committeeId) {
    return decision({ allowed: false, user, status: 400, code: "no_scope", reason: "No committee scope could be derived for this action", scope_provenance: scopeProvenance });
  }

  const committee = await sr.entities.Committee.get(committeeId).catch(() => null);
  if (!committee) return decision({ allowed: false, user, status: 404, code: "committee_not_found", reason: "Committee not found", scope_provenance: scopeProvenance });
  // The organization is derived from the committee — never taken from the request.
  const organizationId = committee.organization_id;

  const isPlatformAdmin = user.role === "admin";
  const membership = isPlatformAdmin ? null : (await sr.entities.CommitteeMembership
    .filter({ committee_id: committeeId, user_id: user.id, status: "active" })
    .catch(() => []))[0] || null;

  const activeSeat = membership && coversToday(membership) ? membership : null;

  // Recusal by identifier first; a legacy name match may only ever deny.
  let recusalActive = false;
  let recusalLegacyNameMatch = false;
  if (activeSeat || isPlatformAdmin) {
    let recusals;
    try {
      recusals = await sr.entities.Recusal.filter({ committee_id: committeeId, status: "active" });
    } catch (_e) {
      return authorityUnavailable(committeeId, organizationId);
    }
    for (const rec of recusals || []) {
      const byId = [rec.user_id, rec.member_user_id, rec.person_id, rec.membership_id, rec.committee_membership_id]
        .filter(Boolean);
      if (byId.includes(user.id) || (activeSeat && byId.includes(activeSeat.id))) { recusalActive = true; break; }
      const byName = normalizeName(rec.member_name);
      if (byName && (byName === normalizeName(user.full_name) || byName === normalizeName(user.email))) {
        recusalActive = true; recusalLegacyNameMatch = true; break;
      }
    }
  }

  let grant = null;
  if (!isPlatformAdmin) {
    try {
      grant = await loadGrant(sr, user, committeeId);
    } catch (_e) {
      return authorityUnavailable(committeeId, organizationId);
    }
  }

  // An active delegation: either a Delegation record naming this user, or a grant whose own
  // delegation field is active. Both are re-read on EVERY action — a lapsed delegation stops
  // working immediately, even inside an already-open session.
  const delegation = isPlatformAdmin ? null : await resolveDelegation(sr, user, committeeId, activeSeat);
  const delegationActive = !!delegation || (grant ? grant.delegation_active === true : false);

  const verdict = evaluateActionPolicy({
    role: activeSeat ? activeSeat.role : null,
    capability,
    delegationActive,
    recusalActive,
    recusalLegacyNameMatch,
    grant,
    isPlatformAdmin,
  });

  // An org administrator without a seat keeps read-only oversight, as before.
  if (!verdict.allowed && !activeSeat && !isPlatformAdmin) {
    const orgMemberships = await sr.entities.OrganizationMembership
      .filter({ organization_id: organizationId, user_id: user.id, status: "active" })
      .catch(() => []);
    const orgRole = (orgMemberships || [])[0]?.role || null;
    if (orgRole === "owner" || orgRole === "admin") {
      const readOnly = ADMIN_READ_CEILING.includes(capability);
      return decision({
        allowed: readOnly, user, organization_id: organizationId, committee_id: committeeId,
        effective_role: "oversight", status: readOnly ? 200 : 403,
        reason: readOnly ? null : "Administrative oversight is read-only", code: readOnly ? null : "oversight_read_only",
        authority_context: "org_admin_oversight_read_only", scope_provenance: scopeProvenance,
        capabilities: [], membership: null, committee,
      });
    }
  }

  return decision({
    allowed: verdict.allowed,
    user,
    organization_id: organizationId,
    committee_id: committeeId,
    effective_role: isPlatformAdmin ? "platform_admin" : (activeSeat ? activeSeat.role : null),
    status: verdict.allowed ? 200 : 403,
    reason: verdict.reason,
    code: verdict.code,
    cap_source: verdict.cap_source || null,
    grant_status: verdict.grant_status || null,
    delegation_applied: delegationActive,
    delegation: delegation ? { id: delegation.id, from_user_id: delegation.from_user_id || null, scope: delegation.scope || null } : null,
    recusal_legacy_name_match: recusalLegacyNameMatch,
    authority_context: isPlatformAdmin ? "platform_admin_read_only" : `committee:${verdict.effective_role || "none"}`,
    scope_provenance: scopeProvenance,
    capabilities: capabilitiesForRole(verdict.effective_role, { delegationActive }),
    membership: activeSeat || null,
    committee,
  });
}

async function loadGrant(sr, user, committeeId) {
  const rows = await sr.entities.AuthorityGrant
    .filter({ committee_id: committeeId, person_key: user.id });
  const grant = (rows || [])[0] || null;
  if (!grant) return null;
  const inValidity = (!grant.validity_start || todayISO() >= grant.validity_start)
    && (!grant.validity_end || todayISO() <= grant.validity_end);
  return {
    id: grant.id,
    permitted_actions: grant.permitted_actions || [],
    denied_actions: grant.denied_actions || [],
    record_state: inValidity ? "in_validity" : "out_of_validity",
    conflict_status: grant.conflict_status || "none",
    delegation_active: grant.delegation_status === "active" && inValidity,
    purpose: grant.purpose || null,
  };
}

/**
 * Delegation must name the delegate, belong to this committee, be active, be inside its own dates,
 * and — when it carries a scope — that scope is read as an explicit capability list. No delegation
 * means no chair authority for a Vice-Chair.
 */
async function resolveDelegation(sr, user, committeeId, seat) {
  if (!seat) return null;
  const rows = await sr.entities.Delegation
    .filter({ committee_id: committeeId, to_user_id: user.id, status: { $in: DELEGATION_ACTIVE_STATUSES } })
    .catch(() => []);
  const usable = (rows || []).filter((d) => coversToday(d))[0] || null;
  if (!usable) return null;
  return usable;
}

function generateCorrelationId() {
  return "corr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}