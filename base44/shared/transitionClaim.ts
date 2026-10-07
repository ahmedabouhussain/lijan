// transitionClaim.ts — the ONE atomic exclusivity primitive for a state transition.
//
// A "read-then-write" duplicate check cannot hold under two simultaneous requests: both reads can
// happen before either write. This module turns a transition into a CLAIM that is created BEFORE
// anything material happens, then re-read: the claim that sorts first by (created_date, id) wins and
// every other writer finds itself behind an earlier claim and REFUSES.
//
// WHAT THIS IS, AND WHAT IT IS NOT (stated, not assumed):
//   • It IS a deterministic winner-selection protocol. Every writer creates its claim BEFORE reading
//     the claim set, so a writer can only see itself first if it truly is first; the tie-break is
//     (created_date, id), which is identical for every writer, so all writers agree on ONE winner and
//     only that winner performs the material effect.
//   • It is NOT store-level atomicity. The platform exposes NO unique constraint and NO transactional
//     rollback: two claim ROWS may both exist. What is excluded is two MATERIAL effects, because only
//     the winner proceeds — uniqueness of the claim row itself is not guaranteed by the store.
//   • MEASURED, NOT ASSUMED (S32). Six rounds of two SIMULTANEOUS writers running this protocol on one
//     key were executed against the live store: every round produced EXACTLY ONE winner, and in every
//     round both writers read BOTH claim rows before deciding — so the deterministic tie-break
//     (created_date, id) ruled, exactly as the design argues. What that supports: all writers agree on
//     one winner, so one material effect is attempted. What it does NOT support: any claim of
//     store-level atomicity. The same measurement showed two live claim rows on one key are ACCEPTED,
//     that a filtered bulk update reports `updated: 1` to BOTH racers on the same row, and that no
//     unique constraint or compare-and-set primitive exists (DEFECT_REGISTER D-106 · D-109). Sample:
//     six rounds, one build environment, one storage region, one writer process pair.
//   • The refusal body reports the KERNEL's own revision, imported and never typed here. Until S32 this
//     helper answered duplicate refusals with `authz-1.2.0-rc.1` — six revisions stale — so an operator
//     reading a 409 saw a policy that was not the one in force (DEFECT_REGISTER D-108). Codes, statuses
//     and decisions are unchanged; only the reported revision became true, and it can no longer drift.
//   • Recovery: an interrupted winner leaves its claim in 'claimed'. Selection ignores 'abandoned'
//     claims, so a released claim never blocks a later legitimate attempt; a STUCK 'claimed' row
//     still blocks that key and needs releaseTransition (governed maintenance) or a stale-claim
//     policy, which is not defined yet.
//
// Scope: EXCLUSIVITY and IDEMPOTENCY, not rollback. A claim is released when the transition fails, and
// marked completed with the record it produced when it succeeds.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { AUTHORITY_POLICY_VERSION } from './authorityKernel.ts';

/**
 * First declared revision of this primitive's refusals (S32), stated when they were wired into the
 * exception register's compared sources. Declaring it changed no behaviour.
 */
export const TRANSITION_CLAIM_VERSION = 'transition-claim-1.0.0';

/** The two codes this primitive answers with — EXPORTED so the register compares them instead of restating them. */
export const TRANSITION_CLAIM_REFUSALS = {
  DUPLICATE: 'duplicate_transition',
  UNAVAILABLE: 'claim_unavailable',
};

function token() {
  return "trn_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 10);
}

function correlation() {
  return "corr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Claim the single right to perform `key` once.
 * Returns { won: true, claim_id, token, correlation_id } or
 *         { won: false, code, correlation_id, decided_by } where code is
 *         'duplicate_transition' (another writer already holds or held it) or
 *         'claim_unavailable' (the claim set could not be established — fail closed).
 */
export async function claimTransition(base44, { key, command, entity_type = null, entity_id = null, committee_id = null, organization_id = null, actor_user_id = null } = {}) {
  const sr = base44.asServiceRole;
  const correlation_id = correlation();
  if (!key) return { won: false, code: "claim_unavailable", correlation_id };

  const myToken = token();
  let mine;
  try {
    mine = await sr.entities.TransitionClaim.create({
      transition_key: key,
      token: myToken,
      command,
      entity_type, entity_id, committee_id, organization_id, actor_user_id,
      status: "claimed",
      correlation_id,
    });
  } catch (_e) {
    // The claim set could not be established: the act is NOT performed.
    return { won: false, code: "claim_unavailable", correlation_id };
  }

  let rows;
  try {
    rows = await sr.entities.TransitionClaim.filter({ transition_key: key }, { limit: 50 });
  } catch (_e) {
    await sr.entities.TransitionClaim.delete(mine.id).catch(() => null);
    return { won: false, code: "claim_unavailable", correlation_id };
  }
  const items = Array.isArray(rows) ? rows : (rows && rows.items) || [];
  // Only claims that still HOLD or COMPLETED a transition are candidates. An ABANDONED claim was
  // released by its own writer after a failure, so it must never out-sort and block a later
  // legitimate attempt on the same key (it previously did: the released row stayed in the set and
  // kept winning the tie-break).
  const CANDIDATE_STATUSES = ["claimed", "completed"];
  const candidates = items.filter((r) => CANDIDATE_STATUSES.includes(r.status || "claimed"));
  const ordered = [...candidates].sort((a, b) => {
    const byDate = String(a.created_date || "").localeCompare(String(b.created_date || ""));
    if (byDate !== 0) return byDate;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
  const winner = ordered[0];

  if (!winner || winner.id !== mine.id) {
    // A transition for this key is already claimed — by a finished or in-flight request. Release our
    // claim and report the duplicate so the caller can answer the repeated request clearly.
    await sr.entities.TransitionClaim.delete(mine.id).catch(() => null);
    return {
      won: false,
      code: "duplicate_transition",
      correlation_id,
      decided_by: winner ? { claim_id: winner.id, status: winner.status || null, result_ref: winner.result_ref || null, claimed_at: winner.created_date || null } : null,
    };
  }

  return { won: true, claim_id: mine.id, token: myToken, correlation_id };
}

/** Mark the winning claim as completed, naming the record the transition produced. */
export async function completeTransition(base44, claim_id, { result_ref = null } = {}) {
  if (!claim_id) return null;
  return base44.asServiceRole.entities.TransitionClaim
    .update(claim_id, { status: "completed", result_ref })
    .catch(() => null);
}

/** Release a claim whose transition did not complete, so a later legitimate attempt is not blocked. */
export async function releaseTransition(base44, claim_id, { correlation_id = null } = {}) {
  if (!claim_id) return null;
  return base44.asServiceRole.entities.TransitionClaim
    .update(claim_id, { status: "abandoned", correlation_id })
    .catch(() => null);
}

/** The ONE response shape for a request that lost the exclusivity race. */
export function duplicateResponse(claim, message = "This transition has already been requested") {
  const duplicate = claim && claim.code === "duplicate_transition";
  return Response.json({
    error: duplicate ? message : "The transition could not be claimed; the act was not performed",
    code: (claim && claim.code) || "claim_unavailable",
    status: "not_applied",
    policy_version: AUTHORITY_POLICY_VERSION,
    correlation_id: (claim && claim.correlation_id) || null,
    decided_by: (claim && claim.decided_by) || null,
  }, { status: duplicate ? 409 : 503 });
}

/** Guard used only by tests and by callers that need a client from a request. */
export { createClientFromRequest };