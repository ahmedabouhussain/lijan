// commandGuard.ts — the ONE entry point every material command uses to ask for authority.
//
// A command names WHAT it does (an exact capability from the catalogue) and WHICH existing record
// it acts on (target_type + target_id). For a create, the target is the trusted PARENT the new
// record will belong to (agenda item → meeting, version → document, meeting → committee, …).
// The guard loads that record server-side, walks its parent chain to the committee, checks every
// link agrees, checks any related records the command will touch, and only then asks the kernel.
//
// Nothing a client sends is a scope: committee_id / policy_version from the request are CLAIMS,
// compared against the derived truth and refused (and audited) on contradiction.
import { resolveAuthority, AUTHORITY_POLICY_VERSION, AUTHORITY_POLICY, CAPABILITY_CATALOG } from "./authorityKernel.ts";

/** How each target derives its committee: own committee_id, then every parent link must agree. */
const SCOPE_CHAIN = {
  Committee: { self: true, parents: [] },
  Meeting: { parents: [] },
  AgendaItem: { parents: [["meeting_id", "Meeting"]] },
  MeetingMinutes: { parents: [["meeting_id", "Meeting"]] },
  Decision: { parents: [["meeting_id", "Meeting"]] },
  Action: { parents: [["decision_id", "Decision"], ["meeting_id", "Meeting"]] },
  Document: { parents: [["decision_id", "Decision"]] },
  DocumentVersion: { parents: [["document_id", "Document"]] },
  ReviewRequest: { parents: [["document_id", "Document"]] },
  CommitteeAmendment: { parents: [] },
  CommitteeMembership: { parents: [] },
  FoundingInstrument: { parents: [] },
  AIOutputLedger: { parents: [] },
};

export const TRUSTED_TARGET_TYPES = Object.keys(SCOPE_CHAIN);
const MAX_RELATED = 200;

function correlation() {
  return "corr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** Request fields that may only ever be compared, never used as scope. */
export function requestClaims(body) {
  const b = body || {};
  return {
    claimed_committee_id: typeof b.committee_id === "string" && b.committee_id ? b.committee_id : null,
    claimed_policy_version: typeof b.policy_version === "string" && b.policy_version ? b.policy_version : null,
  };
}

async function auditTamper(sr, { user, committee_id, organization_id, action, entity_type, entity_id, correlation_id, description }) {
  if (!user) return;
  await sr.entities.AuditEvent.create({
    organization_id: organization_id || null, committee_id: committee_id || null,
    actor_user_id: user.id, actor_name: user.full_name || user.email, actor_email: user.email,
    action, entity_type, entity_id: entity_id || null, description,
    correlation_id, authority_context: `policy:${AUTHORITY_POLICY_VERSION}`,
  }).catch(() => null);
}

/**
 * opts:
 *   capability             exact act (must exist in the catalogue; legacy umbrella names refused)
 *   target_type, target_id the existing record acted on — or, with mode 'create', the trusted parent
 *   mode                   'existing' | 'create'
 *   allowed_states         record[state_field] values the act requires
 *   actor_field            record field naming the user a bound role must be (e.g. owner_user_id)
 *   related                [{ type, ids }] other records the command touches — all must share scope
 *   claimed_committee_id, claimed_policy_version — from requestClaims(body)
 *   audit                  false only inside Test* functions (no tamper audit writes)
 */
export async function authorizeCommand(base44, opts = {}) {
  const {
    capability, target_type, target_id, mode = "existing",
    allowed_states = null, state_field = "status", actor_field = null, related = [],
    claimed_committee_id = null, claimed_policy_version = null, audit = true,
  } = opts;
  const sr = base44.asServiceRole;
  const correlation_id = correlation();
  const refuse = (status, code, reason, extra = {}) => ({
    allowed: false, status, code, reason, capability: capability || null,
    policy_version: AUTHORITY_POLICY_VERSION, policy_classification: AUTHORITY_POLICY.classification,
    correlation_id, trusted_target: null, ...extra,
  });

  const cat = capability ? CAPABILITY_CATALOG[capability] : null;
  if (!cat) return refuse(400, "invalid_capability", "The act is not part of the authority catalogue");
  if (cat.legacy) return refuse(400, "legacy_capability", "Umbrella capabilities cannot authorise a command");
  if (claimed_policy_version && claimed_policy_version !== AUTHORITY_POLICY_VERSION) {
    return refuse(409, "policy_version_conflict", "The policy version is chosen by the server");
  }

  const chain = SCOPE_CHAIN[target_type];
  if (!chain || typeof target_id !== "string" || !target_id) {
    return refuse(400, "no_scope", "No trusted target was named for this act");
  }

  let record;
  try {
    record = await sr.entities[target_type].get(target_id);
  } catch (e) {
    if (e && e.status === 404) return refuse(404, "target_not_found", "The target record does not exist");
    return refuse(503, "authority_unavailable", "Authority could not be established; the act was not performed");
  }
  if (!record) return refuse(404, "target_not_found", "The target record does not exist");

  let committeeId = chain.self ? record.id : (record.committee_id || null);
  const parentsChecked = [];
  const decisionIds = target_type === "Decision" ? [record.id] : [];
  const agendaItemIds = target_type === "AgendaItem" ? [record.id] : [];
  if (record.decision_id) decisionIds.push(record.decision_id);
  if (record.agenda_item_id) agendaItemIds.push(record.agenda_item_id);

  for (const [field, type] of chain.parents) {
    const pid = record[field];
    if (!pid) continue;
    let parent;
    try {
      parent = await sr.entities[type].get(pid);
    } catch (e) {
      if (e && e.status === 404) return refuse(409, "scope_chain_broken", "A parent of the target record no longer exists");
      return refuse(503, "authority_unavailable", "Authority could not be established; the act was not performed");
    }
    if (!committeeId) committeeId = parent.committee_id || null;
    else if (parent.committee_id && parent.committee_id !== committeeId) {
      const user = await base44.auth.me().catch(() => null);
      if (audit) await auditTamper(sr, { user, committee_id: committeeId, organization_id: record.organization_id, action: "authority.scope_chain_inconsistent", entity_type: target_type, entity_id: record.id, correlation_id, description: `The ${type} parent of this ${target_type} belongs to a different committee; the act was refused.` });
      return refuse(409, "scope_chain_inconsistent", "The target record's parent chain does not agree on its committee");
    }
    parentsChecked.push(type);
  }
  if (!committeeId) return refuse(400, "no_scope", "No committee scope could be derived from the target record");

  for (const rel of related || []) {
    const ids = [...new Set((rel.ids || []).filter((x) => typeof x === "string" && x))];
    if (ids.length === 0) continue;
    if (ids.length > MAX_RELATED) return refuse(400, "too_many_related", "Too many related records in one act");
    if (!SCOPE_CHAIN[rel.type]) return refuse(400, "no_scope", "A related record type has no trusted scope");
    let rows;
    try {
      rows = await sr.entities[rel.type].filter({ id: { $in: ids } }, { limit: MAX_RELATED });
    } catch (_e) {
      return refuse(503, "authority_unavailable", "Authority could not be established; the act was not performed");
    }
    const items = Array.isArray(rows) ? rows : (rows && rows.items) || [];
    const outside = items.length !== ids.length || items.some((r) => r.committee_id !== committeeId);
    if (outside) {
      const user = await base44.auth.me().catch(() => null);
      if (audit) await auditTamper(sr, { user, committee_id: committeeId, organization_id: record.organization_id, action: "authority.related_out_of_scope", entity_type: target_type, entity_id: record.id, correlation_id, description: `A ${rel.type} set referenced by this act includes records outside the committee; the whole act was refused.` });
      // Never reveal WHICH ids were refused.
      return refuse(403, "related_out_of_scope", "One or more referenced records are outside this committee");
    }
    if (rel.type === "Decision") decisionIds.push(...ids);
    if (rel.type === "AgendaItem") agendaItemIds.push(...ids);
  }

  const auth = await resolveAuthority(base44, {
    capability,
    record: { committee_id: committeeId, organization_id: record.organization_id || null, id: record.id, type: target_type },
    committee_id: claimed_committee_id,
    recusal_scope: { decision_ids: decisionIds, agenda_item_ids: agendaItemIds },
  });
  const trusted_target = { type: target_type, id: record.id, mode, parents_checked: parentsChecked, derived_committee_id: committeeId };
  if (!auth.allowed) return { ...auth, trusted_target, target: null };

  if (allowed_states && !allowed_states.includes(record[state_field])) {
    return { ...auth, allowed: false, status: 409, code: "state_not_permitted", reason: `This act is not permitted while the record is '${record[state_field] || "unset"}'`, trusted_target, target: null };
  }

  if (cat.bound_roles.includes(auth.effective_role)) {
    if (!actor_field || !record[actor_field] || record[actor_field] !== auth.user.id) {
      return { ...auth, allowed: false, status: 403, code: "not_bound_to_actor", reason: "This seat may act only on records assigned to it", trusted_target, target: null };
    }
  }

  return { ...auth, trusted_target, target: record };
}

/** The one refusal shape every command returns. */
export function refusalResponse(auth) {
  return Response.json({
    error: auth.reason || "Forbidden",
    code: auth.code || null,
    policy_version: auth.policy_version || AUTHORITY_POLICY_VERSION,
    correlation_id: auth.correlation_id || null,
  }, { status: auth.status || 403 });
}