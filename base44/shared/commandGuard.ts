// commandGuard.ts — the ONE way a command asks for authority on a TRUSTED target.
//
// A command names WHAT it does (an exact capability) and WHICH existing record it acts on
// (target_type + target_id) — or, for a create, the trusted PARENT the new record will belong to.
// The guard loads that record server-side, walks its parent chain to the committee, refuses if any
// link of that chain disagrees, checks every record the act will touch is inside the same committee,
// and only then asks the ONE kernel. Nothing a client sends is a scope: committee_id / policy_version
// from the request are CLAIMS, compared against the derived truth and refused on contradiction.
//
// It adds on top of the kernel: trusted target derivation, parent-chain consistency, related-record
// scope containment, permitted-state gating, and actor binding for seats that may act only on their
// own records.
import { resolveAuthority, OPERATIONAL_CAPABILITIES, AUTHORITY_POLICY_VERSION } from "./authorityKernel.ts";

/** How each target type reaches its committee. `self` = the record IS the committee. */
// The state lists this guard enforces are READ FROM the lifecycle contracts rather than written a
// second time by hand (authz-1.3.0). Two hand-written lists are exactly how the guard came to permit
// an issuance that the command itself then refused: the guard said draft|proposed, the command said
// approved. One declaration, consumed by both.
import { DECISION_TRANSITIONS } from './decisionLifecycle.ts';
import { AGENDA_TRANSITIONS, AGENDA_ARCHIVE, MINUTES_TRANSITIONS, MINUTES_EDITABLE_STATES } from './meetingLifecycle.ts';
// The evidence-acceptance gates come from the contract the evidence commands consume, so the guard
// cannot describe a rule the commands do not enforce (evidence-acceptance-1.0.0, authz-1.5.0).
import { EVIDENCE_STATE_GATES, EVIDENCE_ACTOR_EXCLUDED, EVIDENCE_REFUSALS } from './evidenceAcceptance.ts';
// Continuity acts (a person resigning their own seat, a named successor accepting a handover) are
// bound to the actor's OWN identity for every role. Read from the continuity contract so the guard
// and the commands can never disagree about which field carries that identity.
import { IDENTITY_BOUND_ACTIONS, CONTINUITY_REFUSALS } from './continuityContract.ts';
// A note is its author's: carrying it forward or resolving it is identity-bound (authz-1.7.0).
import { ANNOTATION_IDENTITY_BOUND } from './annotationContinuity.ts';
// A written-resolution response belongs to ONE eligible seat, and its state gates come from the same
// contract the circulation commands consume (circulation-approval-1.0.0, authz-1.8.0).
import { CIRCULATION_IDENTITY_BOUND, CIRCULATION_TRANSITIONS } from './circulationApproval.ts';
// EFFECTIVE TIME (material D, membership-effect-1.0.0): a seat's own effective facts decide whether it
// may still act. Read from the effective-time contract, never re-typed here.
import { standingAt, loadAppointmentEvents, EFFECT_REFUSALS, MEMBERSHIP_EFFECT_CONTRACT_VERSION, AUTHORIZED_CHOICES } from './membershipEffect.ts';

const SCOPE_CHAIN = {
  Committee: { self: true, parents: [] },
  Meeting: { parents: [] },
  AgendaItem: { parents: [["meeting_id", "Meeting"]] },
  MeetingMinutes: { parents: [["meeting_id", "Meeting"]] },
  Decision: { parents: [["meeting_id", "Meeting"]] },
  Action: { parents: [["decision_id", "Decision"], ["meeting_id", "Meeting"]] },
  Document: { parents: [["decision_id", "Decision"]] },
  DocumentVersion: { parents: [["document_id", "Document"]] },
  Annotation: { parents: [["document_version_id", "DocumentVersion"], ["document_id", "Document"]] },
  ReviewRequest: { parents: [["document_id", "Document"]] },
  CommitteeMembership: { parents: [] },
  CommitteeAmendment: { parents: [] },
  FoundingInstrument: { parents: [] },
  Vote: { parents: [["decision_id", "Decision"]] },
  Attendance: { parents: [["meeting_id", "Meeting"]] },
  AIOutputLedger: { parents: [] },
  // Structure and continuity records: the scope comes from the record's own committee_id. A
  // counterparty committee is deliberately NOT a parent link — a joint committee or a reporting
  // line may cross an institution boundary, and treating it as a parent would refuse a lawful
  // relationship or, worse, derive the wrong committee from it.
  CommitteeRelationship: { parents: [] },
  SeatAppointmentEvent: { parents: [["membership_id", "CommitteeMembership"]] },
  HandoverPack: { parents: [] },
  HandoverItem: { parents: [["pack_id", "HandoverPack"]] },
  // A written resolution reaches its committee through the decision it decides; a response reaches it
  // through the round it belongs to.
  CirculationRound: { parents: [["decision_id", "Decision"]] },
  CirculationResponse: { parents: [["round_id", "CirculationRound"]] },
  // The execution-extract route: a link and a question both hang off the ONE obligation they name, so
  // the committee is derived from that obligation's chain rather than from the request (authz-1.10.0).
  ActionExtractGrant: { parents: [["action_id", "Action"]] },
  ActionClarification: { parents: [["action_id", "Action"]] },
};

export const TRUSTED_TARGET_TYPES = Object.keys(SCOPE_CHAIN);

/** Acts permitted only while the record is in one of these states. */
export const PERMITTED_STATES = {
  "meeting.start": { field: "status", states: ["scheduled"] },
  "attendance.respond": { field: "status", states: ["scheduled", "in_progress"] },
  "action.progress": { field: "status", states: ["assigned", "in_progress", "blocked", "evidence_pending", "under_review", "overdue"] },
  "review.respond": { field: "status", states: ["pending", "accepted", "in_review", "overdue"] },
  "agenda.evaluate": { field: "status", states: ["pending", "deferred"] },
  "meeting.adjourn": { field: "status", states: ["in_progress"] },
  "meeting.cancel": { field: "status", states: ["scheduled", "in_progress"] },
  // Read from the contracts (decision-lifecycle-1.0.0 / meeting-lifecycle-1.0.0), not re-typed.
  // For vote.call this narrows nothing that worked: OpenVote already refused every state outside
  // draft|proposed. For decision.issue it corrects a real disagreement — the guard used to permit
  // draft|proposed and the command then refused them, so the guard was describing a rule that did not
  // exist. Approval is what issuance acts on, and issued/executing are the idempotent re-verification.
  "vote.call": { field: "status", states: [...DECISION_TRANSITIONS.open_vote.from] },
  "vote.certify": { field: "status", states: [...DECISION_TRANSITIONS.close_vote.from] },
  "minutes.approve": { field: "status", states: ["draft", "in_review"] },
  "decision.issue": { field: "status", states: [...DECISION_TRANSITIONS.issue.from, ...DECISION_TRANSITIONS.issue.idempotent_from] },
  // The two decision steps added with decision-lifecycle-1.1.0: a draft may be sent for review, and
  // execution may begin on an issued decision. Both lists are the contract's own, never re-typed here.
  "decision.submit": { field: "status", states: [...DECISION_TRANSITIONS.submit_for_review.from] },
  "decision.execute": { field: "status", states: [...DECISION_TRANSITIONS.start_execution.from] },
  // Gates for the agenda/minutes commands added in this slice.
  "agenda.edit": { field: "status", states: [...AGENDA_TRANSITIONS.begin_discussion.from, ...AGENDA_TRANSITIONS.defer.from, ...AGENDA_ARCHIVE.from] },
  "agenda.approve": { field: "status", states: [...AGENDA_TRANSITIONS.decide.from] },
  "minutes.draft": { field: "status", states: [...MINUTES_EDITABLE_STATES] },
  "minutes.review": { field: "status", states: [...MINUTES_TRANSITIONS.amend.from] },
  "minutes.issue": { field: "status", states: [...MINUTES_TRANSITIONS.issue.from] },
  // 'verified' is the state an ACCEPTED verdict leaves, so closure may act there — and only there,
  // because 'closed' stays outside the list and a second closure is refused. The accepted verdict
  // itself is a separate required state (REQUIRED_STATES, read from evidence-acceptance-1.0.0).
  "action.close": { field: "status", states: ["in_progress", "evidence_pending", "under_review", "verified"] },
  "committee.close": { field: "status", states: ["active", "closing", "temporarily_suspended", "expiring_soon"] },
  "committee.activate": { field: "status", states: ["draft", "pending_activation"] },
  // Continuity acts act on a live record only: a seat that is still active may be resigned, and a
  // handover that is still open may be accepted or returned.
  // The written-resolution route: dispatching acts on the decision's own open states, and the
  // finalizer acts while the round can still be finalized. Both lists are the contract's own.
  "circulation.open": { field: "status", states: [...CIRCULATION_TRANSITIONS.dispatch.from] },
  "circulation.finalize": { field: "state", states: [...CIRCULATION_TRANSITIONS.ready.from, ...CIRCULATION_TRANSITIONS.finalize.from] },
  "seat.resign": { field: "status", states: ["active"] },
  "seat.handover_accept": { field: "status", states: ["pending_acceptance", "partially_accepted", "returned"] },
};

/**
 * Acts the record's OWN identity field must match — for EVERY role, including the chair. This is the
 * mirror of ACTOR_BOUND (which binds plain member seats to their own records): here the binding is a
 * fact about the person, not a privilege of rank.
 */
export const ACTOR_IDENTITY_REQUIRED = { ...IDENTITY_BOUND_ACTIONS, ...ANNOTATION_IDENTITY_BOUND, ...CIRCULATION_IDENTITY_BOUND };

/** Seats that may act only on a record bound to themselves. */
export const ACTOR_BOUND = {
  "action.progress": "owner_user_id",
  "action.update_progress": "owner_user_id",
  "action.request_extension": "owner_user_id",
  "review.respond": "reviewer_user_id",
};

/**
 * Seats that may NOT act on a record bound to themselves — the mirror of the owner binding above.
 * Verifying evidence is an independent act: the seat that submitted the evidence, and the seat that
 * owns the action, may not judge it. Unlike ACTOR_BOUND (which binds a plain member to its own
 * records), this exclusion holds for EVERY role — a chair who owns the action cannot verify it either.
 * Read from evidence-acceptance-1.0.0, never re-typed here.
 */
export const ACTOR_EXCLUDED = { ...EVIDENCE_ACTOR_EXCLUDED };

/** Required states read from the acceptance contract: a second field that must hold a value. */
export const REQUIRED_STATES = { ...EVIDENCE_STATE_GATES };

/**
 * Acts that require the acting seat to be STANDING at the instant of the act (authz-1.9.0, material D).
 *
 * These are the mandate-bearing acts: a ballot, a certification, a decision, minutes, a written
 * resolution, the certification of attendance. A seat whose appointment has EFFECTIVELY ended may not
 * perform them — whether it ended by term, by a bounded acting expiry, or by a recorded ending event.
 *
 * Deliberately NOT listed: the administrative continuation acts (assigning an action, recording
 * progress, closing an obligation that a successor may inherit). A closed or departed office must not
 * stop the institution's execution work, and the brief requires that a departure never forces a former
 * member to log in before the institution can continue.
 */
export const STANDING_REQUIRED = [
  "vote.cast", "vote.call", "vote.certify",
  "decision.approve", "decision.issue", "decision.submit", "decision.execute",
  "minutes.approve", "minutes.issue", "minutes.review",
  "circulation.open", "circulation.finalize", "circulation.respond",
  "attendance.certify",
];

const asArray = (x) => (Array.isArray(x) ? x : (x && x.items) || []);

/** Request fields a command may only ever COMPARE against the derived truth. */
export function requestClaims(body) {
  const b = body || {};
  return {
    claimed_committee_id: typeof b.committee_id === "string" && b.committee_id ? b.committee_id : null,
    claimed_policy_version: typeof b.policy_version === "string" && b.policy_version ? b.policy_version : null,
  };
}

const MAX_RELATED = 200;

function correlation() {
  return "corr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * opts:
 *   capability            exact act (must be an operational capability)
 *   target_type/target_id the record acted on — or, with mode 'create', the trusted parent
 *   mode                  'existing' (default) | 'create'
 *   related               [{ type, ids }] other records the act touches — all must share scope
 *   claimed_committee_id / claimed_policy_version — from requestClaims(body)
 *   audit                 false inside Test* functions (no tamper audit writes)
 */
export async function authorizeCommand(base44, opts = {}) {
  const {
    capability, target_type, target_id, mode = "existing",
    related = [], claimed_committee_id = null, claimed_policy_version = null, audit = true,
  } = opts;
  const sr = base44.asServiceRole;
  const correlation_id = correlation();
  const refuse = (status, code, reason, extra = {}) => ({
    allowed: false, status, code, reason, capability: capability || null,
    policy_version: AUTHORITY_POLICY_VERSION,
    correlation_id, scope_provenance: "target_record", trusted_target: null, ...extra,
  });

  // The caller is established BEFORE anything is loaded, so this path can never be used to probe
  // whether a record exists without being signed in.
  const user = await base44.auth.me().catch(() => null);
  if (!user) return refuse(401, "unauthenticated", "Unauthorized");

  // An operational act needs a real right. One exception is allowed deliberately: a declaration a
  // SEATED person makes about themselves (a conflict, a recusal) is gated on the committee itself,
  // so the read capability is accepted only when the committee is the target.
  const permittedCapability = OPERATIONAL_CAPABILITIES.includes(capability)
    || (capability === "read" && target_type === "Committee");
  if (!capability || !permittedCapability) {
    return refuse(400, "invalid_capability", "The act is not an operational capability of the authority catalogue");
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
  for (const [field, type] of chain.parents) {
    const parentId = record[field];
    if (!parentId) continue;
    let parent;
    try {
      parent = await sr.entities[type].get(parentId);
    } catch (e) {
      if (e && e.status === 404) return refuse(409, "scope_chain_broken", "A parent of the target record no longer exists");
      return refuse(503, "authority_unavailable", "Authority could not be established; the act was not performed");
    }
    if (!committeeId) committeeId = parent.committee_id || null;
    else if (parent.committee_id && parent.committee_id !== committeeId) {
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
      // Never reveal WHICH ids were refused.
      return refuse(403, "related_out_of_scope", "One or more referenced records are outside this committee");
    }
  }

  // The kernel decides, with the committee DERIVED from the target record.
  const auth = await resolveAuthority(base44, {
    capability,
    record: { committee_id: committeeId, organization_id: record.organization_id || null, id: record.id, type: target_type },
    committee_id: claimed_committee_id,
  });
  const trusted_target = { type: target_type, id: record.id, mode, parents_checked: parentsChecked, derived_committee_id: committeeId };
  if (!auth.allowed) return { ...auth, trusted_target, target: null };

  // ── EFFECTIVE TIME (authz-1.9.0 · membership-effect-1.0.0) ─────────────────────────────────────
  // The kernel answered "is there a seat?". This answers the question the seat's own record was
  // already carrying and nothing read: is that appointment still STANDING at this instant?
  //
  // Standing is evaluated by instant over every seat the person holds here, from effective facts — a
  // term end, a bounded acting expiry, an ending appointment event — so a change recorded today but
  // effective later removes nothing today, and an appointment that effectively ended yesterday cannot
  // act today. Only when NO seat is standing is the act refused; the refusal names the ending fact and
  // the institution's route.
  if (STANDING_REQUIRED.includes(capability)) {
    let seatRows;
    try {
      seatRows = await sr.entities.CommitteeMembership.filter({ committee_id: committeeId, user_id: auth.user.id, status: "active" });
    } catch (_e) {
      return {
        ...auth, allowed: false, status: 503, code: "authority_unavailable",
        reason: EFFECT_REFUSALS.standing_unverifiable.en, reason_ar: EFFECT_REFUSALS.standing_unverifiable.ar,
        contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION, trusted_target, target: null,
      };
    }
    const seats = asArray(seatRows);
    if (seats.length > 0) {
      const { events, unreadable } = await loadAppointmentEvents(sr, seats.map((s) => s.id));
      if (unreadable) {
        return {
          ...auth, allowed: false, status: 503, code: "authority_unavailable",
          reason: EFFECT_REFUSALS.standing_unverifiable.en, reason_ar: EFFECT_REFUSALS.standing_unverifiable.ar,
          contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION, trusted_target, target: null,
        };
      }
      const at = new Date().toISOString();
      const verdicts = seats.map((seat) => ({ seat, standing: standingAt({ seat, events, at }) }));
      const standingSeat = verdicts.find((v) => v.standing.standing === "standing");
      if (!standingSeat) {
        // Report the most informative verdict: a definite ending beats "not yet seated", and one that
        // names an instant beats one that cannot.
        const informative = verdicts.find((v) => v.standing.standing === "ended" && v.standing.effective_at)
          || verdicts.find((v) => v.standing.standing === "ended")
          || verdicts[0];
        const standing = informative.standing;
        const known = standing.standing !== "unknown";
        return {
          ...auth,
          allowed: false,
          status: known ? 403 : 503,
          code: standing.refusal?.code || "seat_not_standing",
          reason: standing.refusal?.en || EFFECT_REFUSALS.seat_not_standing.en,
          reason_ar: standing.refusal?.ar || EFFECT_REFUSALS.seat_not_standing.ar,
          standing: {
            state: standing.standing, ended_by: standing.ended_by,
            effective_at: standing.effective_at || null, recorded_at: standing.recorded_at || null,
            recorded_after_effect: standing.recorded_after_effect === true,
            source: standing.source, seat_id: standing.seat_id,
          },
          contract_version: MEMBERSHIP_EFFECT_CONTRACT_VERSION,
          remedy: { route: "appoint_or_replace", authorized_choices: AUTHORIZED_CHOICES },
          trusted_target, target: null,
        };
      }
    }
  }

  const state = PERMITTED_STATES[capability];
  if (mode === "existing" && state && !state.states.includes(record[state.field])) {
    return {
      ...auth, allowed: false, status: 409, code: "state_not_permitted",
      reason: `This act is not permitted while the record is '${record[state.field] || "unset"}'`,
      trusted_target, target: null,
    };
  }

  // A required state beyond `status` (e.g. closure demands an ACCEPTED evidence verdict). The text
  // shown is the contract's own, so the refusal names the requirement instead of a bare code.
  const required = REQUIRED_STATES[capability];
  if (mode === "existing" && required) {
    const actual = record[required.field];
    const ok = required.equals !== undefined
      ? actual === required.equals
      : (required.states || []).includes(actual);
    if (!ok) {
      const text = (required.code && EVIDENCE_REFUSALS[required.code]) || null;
      return {
        ...auth, allowed: false, status: 409, code: required.code || "state_not_permitted",
        reason: text ? text.en : `This act is not permitted while the record's ${required.field} is '${actual || "unset"}'`,
        reason_ar: text ? text.ar : null,
        required_state: { field: required.field, actual: actual || "unset" },
        trusted_target, target: null,
      };
    }
  }

  const actorField = ACTOR_BOUND[capability];
  if (actorField && auth.effective_role === "member" && record[actorField] !== auth.user.id) {
    return {
      ...auth, allowed: false, status: 403, code: "not_bound_to_actor",
      reason: "This seat may act only on records assigned to it",
      trusted_target, target: null,
    };
  }

  // A personal act belongs to the person it concerns, whatever role that person holds.
  const identityField = ACTOR_IDENTITY_REQUIRED[capability];
  if (identityField) {
    const bound = record[identityField];
    if (!bound || bound !== auth.user.id) {
      const text = CONTINUITY_REFUSALS.identity_mismatch;
      return {
        ...auth, allowed: false, status: 403, code: "identity_mismatch",
        reason: text.en, reason_ar: text.ar,
        identity_field: identityField,
        trusted_target, target: null,
      };
    }
  }

  // Separation of duty, for every role: the submitter and the owner are both barred from judging.
  for (const field of ACTOR_EXCLUDED[capability] || []) {
    if (record[field] && record[field] === auth.user.id) {
      const text = EVIDENCE_REFUSALS.actor_not_independent;
      return {
        ...auth, allowed: false, status: 403, code: "actor_not_independent",
        reason: text.en, reason_ar: text.ar,
        excluded_field: field,
        trusted_target, target: null,
      };
    }
  }

  return { ...auth, trusted_target, target: record };
}

/** The one refusal shape every guarded command returns. */
export function refusalResponse(auth) {
  return Response.json({
    error: auth.reason || "Forbidden",
    error_ar: auth.reason_ar || null,
    code: auth.code || null,
    policy_version: auth.policy_version || null,
    correlation_id: auth.correlation_id || null,
  }, { status: auth.status || 403 });
}