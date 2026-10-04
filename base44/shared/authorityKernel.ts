// authorityKernel.ts — THE single authorization decision source for LIJAN™.
//
// ONE capability catalogue, ONE pure evaluator, ONE fact resolver. The command path
// (commandGuard → resolveAuthority) and the read path (committeeAuth / governedReadPolicy) both
// consume this file, so they can never disagree about what a seat may do.
//
// Contract (fixed):
//   • FAIL-CLOSED. Any failure to establish a fact (identity, committee, seat, recusal, grant,
//     delegation) is a refusal (`authority_unavailable`), never a fallback role or an allow.
//   • No scope without a trusted target: the committee is derived server-side from a loaded record
//     (record → parent → committee → organization). A bare committee_id is refused (`no_scope`).
//   • ROLE = a template/ceiling. AuthorityGrant = an explicit restriction on top. Denial wins.
//   • Vice-Chair acts as Chair ONLY under an active, in-scope delegation from the sitting Chair.
//   • Recusal is matched by identifiers only (person / seat). A recusal that carries no identifier
//     cannot be attributed and therefore blocks the vote family for the whole committee.
//   • Platform admin is a read ceiling, never business authority.
//   • The policy version is chosen by the server. A different version claimed by a client is refused.

/**
 * Policy provenance. This rule set is an ENGINEERING RECOMMENDATION — no institutional instrument
 * has approved it. It is therefore classified PROVISIONAL_SHOWCASE_POLICY: it may not be cited as
 * evidence of legal compliance, and on a real (non-showcase) committee every SENSITIVE capability
 * is refused until an owner approves an institutional policy.
 */
export const AUTHORITY_POLICY = Object.freeze({
  version: "authz-1.1.0",
  classification: "PROVISIONAL_SHOWCASE_POLICY",
  source: "engineering_recommendation",
  institutional_owner: null,
  institutionally_approved: false,
  legal_compliance_evidence: false,
  applies_in_full_to: "showcase_committees_only",
});
export const AUTHORITY_POLICY_VERSION = AUTHORITY_POLICY.version;

const SEATED = ["chair", "vice_chair", "secretary", "committee_administrator", "member", "alternate", "observer", "advisor"];
const VOTING = ["chair", "vice_chair", "member"];
const OFFICERS = ["chair", "secretary"];
const ADMINISTRATION = ["chair", "secretary", "committee_administrator"];

/**
 * entry(roles, family, opts)
 *   delegable   — may be transferred Chair → Vice-Chair by an active delegation
 *   sensitive   — legal / institutional effect; refused on real committees under a provisional policy
 *   bound_roles — roles that may use it ONLY on a record bound to themselves (e.g. the assignee)
 *   why         — why the act is not delegable
 *   legacy      — umbrella name kept for display surfaces only; no command may require it
 */
const entry = (roles, family, opts = {}) => Object.freeze({
  roles: Object.freeze([...roles]),
  family,
  delegable: opts.delegable === true,
  sensitive: opts.sensitive === true,
  bound_roles: Object.freeze([...(opts.bound_roles || [])]),
  why_not_delegable: opts.why || null,
  legacy: opts.legacy === true,
  read_only: opts.read_only === true,
});

export const CAPABILITY_CATALOG = Object.freeze({
  // ── Read family (no write may ever be authorised by these) ──
  "read": entry([...SEATED, "auditor"], "read", { read_only: true }),
  "audit.read": entry(["chair", "vice_chair", "secretary", "committee_administrator", "auditor"], "read", { read_only: true }),
  "report.export": entry(["chair", "vice_chair", "secretary", "auditor"], "read", { read_only: true }),
  "decision.view": entry(["chair", "vice_chair", "secretary", "committee_administrator", "member", "advisor"], "read", { read_only: true }),
  "decision.comment": entry(["chair", "vice_chair", "secretary", "committee_administrator", "member", "advisor"], "read"),
  "decision.review": entry(["chair", "vice_chair", "secretary"], "read"),
  "decision.acknowledge": entry(["chair", "vice_chair", "secretary", "member"], "read"),
  "comment.shared": entry(["chair", "vice_chair", "member", "advisor"], "read"),

  // ── Committee lifecycle ──
  "committee.activate": entry(["chair"], "lifecycle", { delegable: true, sensitive: true }),
  "committee.suspend": entry(["chair"], "lifecycle", { sensitive: true, why: "Suspension changes the committee's legal standing; it stays with the sitting Chair." }),
  "committee.close": entry(["chair"], "lifecycle", { sensitive: true, why: "Closure ends the mandate; it cannot be exercised by a delegate." }),
  "committee.transition_status": entry(["chair"], "lifecycle", { sensitive: true, why: "A status transition can end or suspend the mandate." }),
  "committee.renew": entry(["chair"], "lifecycle", { sensitive: true, why: "Renewal extends the mandate itself." }),
  "committee.extend_term": entry(["chair"], "lifecycle", { sensitive: true, why: "A term extension changes the mandate period." }),

  // ── Membership & delegation ──
  "membership.invite": entry(OFFICERS, "membership", { sensitive: true }),
  "membership.end": entry(["chair"], "membership", { sensitive: true, why: "Ending a membership changes the composition of the body." }),
  "membership.activate_alternate": entry(OFFICERS, "membership", { sensitive: true }),
  "delegation.grant": entry(["chair"], "membership", { sensitive: true, why: "A delegate may not re-delegate." }),
  "notify.affected_members": entry(OFFICERS, "membership"),
  "amendment.acknowledge": entry(SEATED, "membership"),

  // ── Amendments & founding instruments ──
  "amendment.propose": entry(OFFICERS, "amendment"),
  "amendment.transition": entry(OFFICERS, "amendment", { sensitive: true }),
  "amendment.approve": entry(["chair"], "amendment", { sensitive: true, why: "Approving an amendment changes the formation of record." }),
  "instrument.upload": entry(ADMINISTRATION, "instrument"),
  "instrument.extract": entry(ADMINISTRATION, "instrument"),
  "instrument.confirm_fields": entry(OFFICERS, "instrument", { sensitive: true }),
  "instrument.apply_to_draft": entry(["chair"], "instrument", { sensitive: true, why: "Applying an instrument rewrites the committee of record." }),

  // ── Meetings & agenda ──
  "meeting.schedule": entry(OFFICERS, "meeting"),
  "meeting.cancel": entry(OFFICERS, "meeting"),
  "meeting.start": entry(["chair"], "meeting", { delegable: true }),
  "meeting.adjourn": entry(["chair"], "meeting", { delegable: true }),
  "agenda.propose": entry(["chair", "vice_chair", "secretary", "member"], "meeting"),
  "agenda.edit": entry(ADMINISTRATION, "meeting"),
  "agenda.approve": entry(["chair"], "meeting", { delegable: true }),
  "agenda.evaluate_readiness": entry(ADMINISTRATION, "meeting"),
  "meeting_pack.publish": entry(OFFICERS, "meeting"),
  "attendance.respond": entry(SEATED, "meeting"),
  "attendance.certify": entry(OFFICERS, "meeting", { sensitive: true }),

  // ── Minutes & institutional memory ──
  "minutes.draft": entry(OFFICERS, "minutes"),
  "minutes.review": entry(["chair", "vice_chair", "secretary"], "minutes"),
  "minutes.approve": entry(["chair"], "minutes", { delegable: true, sensitive: true }),
  "memory.compile": entry(OFFICERS, "minutes"),
  "memory.generate_closure": entry(["chair"], "minutes", { why: "Closure memory belongs to the sitting Chair." }),
  "memory.review": entry(OFFICERS, "minutes"),
  "memory.approve": entry(["chair"], "minutes", { sensitive: true, why: "Approving the memory of record is the Chair's personal attestation." }),

  // ── Decisions & voting ──
  "decision.propose": entry(["chair", "vice_chair", "secretary", "member"], "decision"),
  "decision.approve": entry(["chair"], "decision", { delegable: true, sensitive: true }),
  "decision.issue": entry(["chair"], "decision", { delegable: true, sensitive: true }),
  "decision.execute": entry(["chair"], "decision", { sensitive: true, why: "Execution of record stays with the Chair." }),
  "decision.sign_image": entry(["chair"], "decision", { sensitive: true, why: "A signature is personal to the signatory." }),
  "decision.digital_sign": entry([], "decision", { sensitive: true, why: "No approved identity provider, trust service or legal instrument exists." }),
  "vote.call": entry(["chair"], "decision", { delegable: true }),
  "vote.certify": entry(["chair"], "decision", { delegable: true, sensitive: true }),
  "vote.cast": entry(VOTING, "decision"),
  "decision.vote": entry(VOTING, "decision"),

  // ── Execution ──
  "action.update_progress": entry([...ADMINISTRATION, "member"], "execution", { bound_roles: ["member"] }),
  "action.request_extension": entry([...ADMINISTRATION, "member"], "execution", { bound_roles: ["member"] }),
  "action.review_extension": entry(OFFICERS, "execution"),
  "action.close": entry(OFFICERS, "execution", { sensitive: true }),
  "action.escalate": entry(ADMINISTRATION, "execution"),
  "notice.retry": entry(ADMINISTRATION, "execution"),

  // ── Integrity (always self-only: the record is written for the acting seat) ──
  "conflict.declare": entry(SEATED, "integrity"),
  "recusal.record": entry(SEATED, "integrity"),

  // ── Documents, reviews & reports ──
  "document.create": entry(ADMINISTRATION, "document"),
  "document.create_version": entry(ADMINISTRATION, "document"),
  "review.request": entry(OFFICERS, "document"),
  "review.respond": entry(SEATED, "document"),
  "report.generate": entry(OFFICERS, "document"),

  // ── Legacy umbrella names: display surfaces only, never a command gate ──
  "committee.manage": entry(["chair"], "legacy", { legacy: true }),
  "action.admin": entry(ADMINISTRATION, "legacy", { legacy: true, delegable: true }),
  "escalation.approve": entry(["chair"], "legacy", { legacy: true, delegable: true }),
});

/** Read ceiling for platform administrators and organisation oversight. */
export const ADMIN_READ_CEILING = ["read", "audit.read", "report.export", "decision.view"];

/** The vote family a recusal blocks. */
export const RECUSAL_BLOCKED = [
  "vote.cast", "decision.vote", "vote.call", "vote.certify",
  "decision.approve", "decision.issue", "decision.sign_image", "decision.digital_sign",
];

export const DELEGABLE_CAPABILITIES = Object.keys(CAPABILITY_CATALOG).filter((c) => CAPABILITY_CATALOG[c].delegable);
export const SENSITIVE_CAPABILITIES = Object.keys(CAPABILITY_CATALOG).filter((c) => CAPABILITY_CATALOG[c].sensitive);
export const READ_ONLY_CAPABILITIES = Object.keys(CAPABILITY_CATALOG).filter((c) => CAPABILITY_CATALOG[c].read_only);
export const LEGACY_CAPABILITIES = Object.keys(CAPABILITY_CATALOG).filter((c) => CAPABILITY_CATALOG[c].legacy);

/** Only a Vice-Chair seat may receive chair authority, and only the delegable subset. */
const DELEGATE_ROLES = ["vice_chair"];

export function capabilitiesForRole(role, { delegationActive = false, delegationScope = null } = {}) {
  if (!role) return [];
  const caps = Object.keys(CAPABILITY_CATALOG).filter((c) => CAPABILITY_CATALOG[c].roles.includes(role));
  if (delegationActive && DELEGATE_ROLES.includes(role)) {
    const transferable = delegationScope && delegationScope.length
      ? DELEGABLE_CAPABILITIES.filter((c) => delegationScope.includes(c))
      : DELEGABLE_CAPABILITIES;
    for (const c of transferable) if (!caps.includes(c)) caps.push(c);
  }
  return caps;
}

export function isOperationalCapability(capability) {
  const e = CAPABILITY_CATALOG[capability];
  return !!e && !e.read_only;
}

/**
 * Recusal, by identifiers only. Pure.
 * A recusal tied to one decision / agenda item applies only when the act targets that item.
 * A recusal with no identifier at all is UNRESOLVED and blocks the vote family for everyone.
 */
export function evaluateRecusal(recusals, { userId = null, seatId = null, decisionIds = [], agendaItemIds = [], now = new Date().toISOString() } = {}) {
  let unresolved = false;
  for (const r of recusals || []) {
    if (r.status && r.status !== "active") continue;
    if (r.start_time && now < r.start_time) continue;
    if (r.end_time && now > r.end_time) continue;
    if (r.decision_id || r.agenda_item_id) {
      const hit = (r.decision_id && decisionIds.includes(r.decision_id))
        || (r.agenda_item_id && agendaItemIds.includes(r.agenda_item_id));
      if (!hit) continue;
    }
    const persons = [r.member_user_id, r.person_id, r.user_id, r.member_id].filter(Boolean);
    const seats = [r.membership_id, r.seat_id, r.committee_membership_id, r.member_id].filter(Boolean);
    if (persons.length === 0 && seats.length === 0) { unresolved = true; continue; }
    if (userId && persons.includes(userId)) return { active: true, unresolved, matched_by: "person_id" };
    if (seatId && seats.includes(seatId)) return { active: true, unresolved, matched_by: "membership_id" };
  }
  return { active: false, unresolved, matched_by: null };
}

/**
 * The ONE decision. Pure — no I/O — so tests and commands exercise exactly the same rules.
 */
export function evaluateActionPolicy({
  role = null,
  capability,
  delegationActive = false,
  delegationScope = null,
  recusalActive = false,
  recusalUnresolved = false,
  grant = null,
  isPlatformAdmin = false,
  committeeClass = "real",
  multipleSeats = false,
} = {}) {
  const base = { capability: capability || null, policy_version: AUTHORITY_POLICY_VERSION, policy_classification: AUTHORITY_POLICY.classification, effective_role: role || null };
  const deny = (code, reason, extra = {}) => ({ ...base, allowed: false, code, reason, ...extra });

  if (capability === "committee.view") capability = "read";
  const cat = capability ? CAPABILITY_CATALOG[capability] : null;
  if (!cat) return deny("unknown_capability", "The requested act is not part of the authority catalogue");

  if (isPlatformAdmin) {
    return ADMIN_READ_CEILING.includes(capability)
      ? { ...base, allowed: true, code: null, reason: null, cap_source: "admin_read_ceiling" }
      : deny("admin_not_operational", "Platform administration does not carry operational committee authority");
  }

  if (multipleSeats) return deny("ambiguous_seat", "More than one active seat is held in this committee; authority cannot be attributed");
  if (!role) return deny("no_seat", "No committee seat is held in this committee");

  if (grant && grant.record_state === "out_of_validity") return deny("grant_out_of_validity", "Authority grant is outside its validity window", { grant_status: "out_of_validity" });
  if (grant && grant.conflict_status === "declared") return deny("conflict_declared", "A conflict of interest is declared for this seat", { grant_status: "conflict_declared" });

  if (RECUSAL_BLOCKED.includes(capability)) {
    if (recusalActive) return deny("recused", "The acting seat is recused from this matter");
    if (recusalUnresolved) return deny("recusal_identity_unresolved", "A recusal in this committee cannot be attributed to a seat; the vote family is suspended until it is");
  }

  const held = capabilitiesForRole(role, { delegationActive, delegationScope });
  if (!held.includes(capability)) {
    return deny("role_missing_capability", `Role '${role}' does not hold capability '${capability}'`, { delegation_applied: delegationActive });
  }

  if (grant) {
    const denied = Array.isArray(grant.denied_actions) ? grant.denied_actions : [];
    if (denied.includes(capability)) return deny("grant_denied", "The authority grant explicitly denies this action", { grant_status: "permitted_subset" });
    const permitted = Array.isArray(grant.permitted_actions) ? grant.permitted_actions : [];
    if (permitted.length > 0 && !permitted.includes(capability)) return deny("not_in_grant", "Action is outside the authority granted to this seat", { grant_status: "permitted_subset" });
  }

  if (cat.sensitive && committeeClass !== "showcase" && !AUTHORITY_POLICY.institutionally_approved) {
    return deny("institutional_policy_required", "This act has institutional effect and no approved institutional authority policy exists for this committee", { sensitive: true });
  }

  const delegated = delegationActive && !CAPABILITY_CATALOG[capability].roles.includes(role);
  return {
    ...base,
    allowed: true,
    code: null,
    reason: null,
    cap_source: delegated ? "delegation" : "role_baseline",
    grant_status: grant ? ((grant.permitted_actions || []).length ? "permitted_subset" : "unpopulated_no_restriction") : "no_grant",
    delegation_applied: delegated,
    bound_roles: cat.bound_roles,
  };
}

// ─────────────────────────────── fact resolution ───────────────────────────────

class AuthorityUnavailable extends Error {
  constructor(fact) { super(`authority fact unavailable: ${fact}`); this.fact = fact; }
}

async function fact(name, promise) {
  try { return await promise; } catch (_e) { throw new AuthorityUnavailable(name); }
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

function coversToday(row, from = "start_date", to = "end_date") {
  const today = todayISO();
  if (row[from] && today < String(row[from]).slice(0, 10)) return false;
  if (row[to] && today > String(row[to]).slice(0, 10)) return false;
  return true;
}

function seatCoversToday(m) { return coversToday(m, "term_start", "term_end"); }

/** A showcase committee is a provisioned demonstration body; everything else is real. */
export function classifyCommittee(committee) {
  return committee && committee.is_demo_data === true && typeof committee.demo_dataset === "string" && committee.demo_dataset.length > 0
    ? "showcase" : "real";
}

function parseDelegationScope(scope) {
  if (Array.isArray(scope)) return scope.filter((c) => DELEGABLE_CAPABILITIES.includes(c));
  if (typeof scope !== "string") return null;
  const list = scope.split(/[,\s]+/).filter((c) => DELEGABLE_CAPABILITIES.includes(c));
  return list.length ? list : null;
}

/**
 * Resolve the effective authority for ONE act on ONE trusted target.
 *
 * opts.record        — REQUIRED. The server-loaded target scope ({ committee_id, organization_id, ... }).
 *                      Produced by commandGuard.authorizeCommand; never built from request fields.
 * opts.committee_id  — the committee the CLIENT claims. Only compared; a contradiction is refused.
 * opts.recusal_scope — { decision_ids, agenda_item_ids } of the target, for item-level recusal.
 */
export async function resolveAuthority(base44, opts = {}) {
  const { capability, record = null, recusal_scope = null } = opts;
  const sr = base44.asServiceRole;
  const correlation_id = generateCorrelationId();
  const decision = (extra) => ({ correlation_id, policy_version: AUTHORITY_POLICY_VERSION, policy_classification: AUTHORITY_POLICY.classification, capability: capability || null, ...extra });

  const user = await base44.auth.me().catch(() => null);
  if (!user) return decision({ allowed: false, status: 401, code: "unauthenticated", reason: "Unauthorized", user: null });

  if (!record || typeof record.committee_id !== "string" || !record.committee_id) {
    return decision({ allowed: false, user, status: 400, code: "no_scope", reason: "No trusted target scope was supplied for this act" });
  }
  const committeeId = record.committee_id;

  const claimed = opts.committee_id || null;
  if (claimed && claimed !== committeeId) {
    await sr.entities.AuditEvent.create({
      organization_id: record.organization_id || null, committee_id: committeeId,
      actor_user_id: user.id, actor_name: user.full_name || user.email, actor_email: user.email,
      action: "authority.scope_mismatch", entity_type: record.type || "Committee", entity_id: record.id || committeeId,
      description: "A request carried a committee scope that differs from the target record's own scope; the request was refused.",
      correlation_id, authority_context: `policy:${AUTHORITY_POLICY_VERSION}`,
    }).catch(() => null);
    return decision({ allowed: false, user, status: 403, code: "scope_mismatch", reason: "The requested scope does not match the target record's scope", committee_id: committeeId });
  }

  try {
    let committee;
    try {
      committee = await sr.entities.Committee.get(committeeId);
    } catch (e) {
      if (e && e.status === 404) return decision({ allowed: false, user, status: 404, code: "committee_not_found", reason: "Committee not found" });
      throw new AuthorityUnavailable("committee");
    }
    if (!committee) return decision({ allowed: false, user, status: 404, code: "committee_not_found", reason: "Committee not found" });
    const organizationId = committee.organization_id;
    const committeeClass = classifyCommittee(committee);
    const isPlatformAdmin = user.role === "admin";

    if (isPlatformAdmin) {
      const verdict = evaluateActionPolicy({ capability, isPlatformAdmin: true, committeeClass });
      return decision({
        ...verdict, user, organization_id: organizationId, committee_id: committeeId, committee, committee_class: committeeClass,
        effective_role: "platform_admin", status: verdict.allowed ? 200 : 403,
        authority_context: "platform_admin_read_only", membership: null, capabilities: ADMIN_READ_CEILING,
      });
    }

    const seats = (await fact("membership", sr.entities.CommitteeMembership
      .filter({ committee_id: committeeId, user_id: user.id, status: "active" }))) || [];
    const activeSeats = seats.filter(seatCoversToday);
    const seat = activeSeats.length === 1 ? activeSeats[0] : null;

    const recusals = (await fact("recusal", sr.entities.Recusal.filter({ committee_id: committeeId, status: "active" }))) || [];
    const recusal = evaluateRecusal(recusals, {
      userId: user.id,
      seatId: seat ? seat.id : null,
      decisionIds: (recusal_scope && recusal_scope.decision_ids) || [],
      agendaItemIds: (recusal_scope && recusal_scope.agenda_item_ids) || [],
    });

    const grant = seat ? await loadGrant(sr, user, committeeId) : null;
    const delegation = seat ? await resolveDelegation(sr, user, committeeId, seat) : null;
    const delegationActive = !!delegation || (grant ? grant.delegation_active === true : false);
    const delegationScope = delegation ? parseDelegationScope(delegation.scope) : null;

    const verdict = evaluateActionPolicy({
      role: seat ? seat.role : null,
      capability,
      delegationActive,
      delegationScope,
      recusalActive: recusal.active,
      recusalUnresolved: recusal.unresolved,
      grant,
      committeeClass,
      multipleSeats: activeSeats.length > 1,
    });

    // Organisation oversight without a seat: read ceiling only.
    if (!verdict.allowed && activeSeats.length === 0) {
      const orgRows = (await fact("organization_membership", sr.entities.OrganizationMembership
        .filter({ organization_id: organizationId, user_id: user.id, status: "active" }))) || [];
      const orgRole = orgRows[0] ? orgRows[0].role : null;
      if (orgRole === "owner" || orgRole === "admin") {
        const readOnly = ADMIN_READ_CEILING.includes(capability);
        return decision({
          allowed: readOnly, user, organization_id: organizationId, committee_id: committeeId, committee, committee_class: committeeClass,
          effective_role: "oversight", status: readOnly ? 200 : 403,
          reason: readOnly ? null : "Administrative oversight is read-only", code: readOnly ? null : "oversight_read_only",
          authority_context: "org_admin_oversight_read_only", capabilities: ADMIN_READ_CEILING, membership: null,
        });
      }
    }

    return decision({
      ...verdict,
      user,
      organization_id: organizationId,
      committee_id: committeeId,
      committee,
      committee_class: committeeClass,
      status: verdict.allowed ? 200 : 403,
      delegation: delegation ? { id: delegation.id, from_user_id: delegation.from_user_id || null, scope: delegationScope } : null,
      recusal_matched_by: recusal.matched_by,
      authority_context: `committee:${seat ? seat.role : "none"}`,
      capabilities: capabilitiesForRole(seat ? seat.role : null, { delegationActive, delegationScope }),
      membership: seat,
    });
  } catch (e) {
    if (e instanceof AuthorityUnavailable) {
      return decision({ allowed: false, user, status: 503, code: "authority_unavailable", reason: "Authority could not be established; the act was not performed", unavailable_fact: e.fact });
    }
    throw e;
  }
}

async function loadGrant(sr, user, committeeId) {
  const rows = (await fact("grant", sr.entities.AuthorityGrant.filter({ committee_id: committeeId, person_key: user.id }))) || [];
  const grant = rows[0] || null;
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
  };
}

/**
 * A delegation is usable only when it names this user, belongs to this committee, is active and
 * inside its dates, AND its grantor still holds the Chair seat today. Re-read on every act.
 */
async function resolveDelegation(sr, user, committeeId, seat) {
  if (!DELEGATE_ROLES.includes(seat.role)) return null;
  const rows = (await fact("delegation", sr.entities.Delegation
    .filter({ committee_id: committeeId, to_user_id: user.id, status: "active" }))) || [];
  const usable = rows.filter((d) => coversToday(d) && d.from_user_id);
  if (usable.length === 0) return null;
  const chairs = (await fact("delegation_grantor", sr.entities.CommitteeMembership
    .filter({ committee_id: committeeId, role: "chair", status: "active" }))) || [];
  const sittingChairIds = chairs.filter(seatCoversToday).map((c) => c.user_id).filter(Boolean);
  return usable.find((d) => sittingChairIds.includes(d.from_user_id)) || null;
}

function generateCorrelationId() {
  return "corr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}