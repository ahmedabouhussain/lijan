import { base44 } from "@/api/base44Client";

// LIJAN™ — governed function call.
//
// Every server gate that answers "may this principal read this record?" takes its authority from
// ONE place: the authenticated session, or a server-issued exploration session carried as a token.
// This helper is the single place the client attaches that token, so no surface can forget it, and
// the single place a lapsed exploration session is renewed — once, for the whole app, instead of
// each screen inventing its own recovery.

/** Refusal codes that mean the exploration session itself is no longer usable. */
const SESSION_FAILURE_CODES = new Set([
  "no_session", "unknown", "revoked", "expired", "out_of_scope", "unknown_persona",
]);

export function failureCode(error) {
  return error?.response?.data?.code || error?.response?.data?.error || "";
}

export function isSessionFailure(error) {
  return SESSION_FAILURE_CODES.has(failureCode(error));
}

/**
 * Invoke a governed backend function with the caller's authority attached.
 * @param {string} name function name
 * @param {object} payload function payload (authority is never read from it beyond the token)
 * @param {object} session { isDemoMode, showcaseToken, renew }
 */
export async function governedInvoke(name, payload, session = {}) {
  const { isDemoMode, showcaseToken, renew } = session;
  const withToken = (token) => ({
    ...payload,
    ...(isDemoMode && token ? { showcase_token: token } : {}),
  });

  try {
    return await base44.functions.invoke(name, withToken(showcaseToken));
  } catch (error) {
    // A lapsed session is renewable exactly once per call: the retry carries a fresh token, and a
    // second failure is a real refusal the caller must see.
    if (!isDemoMode || !renew || !isSessionFailure(error)) throw error;
    const fresh = await renew().catch(() => null);
    if (!fresh) throw error;
    return await base44.functions.invoke(name, withToken(fresh));
  }
}