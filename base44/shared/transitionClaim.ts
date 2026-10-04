// transitionClaim.ts — the ONE atomic exclusivity primitive for a state transition.
//
// A "read-then-write" duplicate check cannot hold under two simultaneous requests: both reads can
// happen before either write. This module turns a transition into a CLAIM that is created BEFORE
// anything material happens, then re-read: the claim that sorts first by (created_date, id) wins and
// every other writer finds itself behind an earlier claim and REFUSES.
//
// Why this is safe where a plain check is not: each writer creates its own claim BEFORE it reads the
// claim set. So the only way a writer can see itself first is if it truly is first — any concurrent
// writer that created a claim earlier already appears in the set, and one that creates later will see
// the earlier claim and lose. At most one writer proceeds, and the tie-break is deterministic and
// identical for every writer, so all of them agree on the winner (§ no lost update).
//
// Scope: EXCLUSIVITY and IDEMPOTENCY, not rollback. A claim is released when the transition fails, and
// marked completed with the record it produced when it succeeds.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

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
  const ordered = [...items].sort((a, b) => {
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
    policy_version: "authz-1.2.0-rc.1",
    correlation_id: (claim && claim.correlation_id) || null,
    decided_by: (claim && claim.decided_by) || null,
  }, { status: duplicate ? 409 : 503 });
}

/** Guard used only by tests and by callers that need a client from a request. */
export { createClientFromRequest };