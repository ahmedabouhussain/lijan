// LIJAN™ — ONE vocabulary for "what is this surface showing right now".
//
// A refusal, a scope miss and a technical failure are DIFFERENT states, and none of them is
// "zero". The server's refusal CODE is the input; a surface never guesses from an empty array.
// Absent evidence of a successful read, the state is never EMPTY.

export const SURFACE_STATE = {
  /** A governed read is in flight. No count is shown. */
  LOADING: "loading",
  /** The server read succeeded and the real number is zero. The ONLY way to show a zero. */
  EMPTY: "empty",
  /** The caller holds no authority for this register or record. */
  NO_AUTHORITY: "no_authority",
  /** The record/register exists but belongs to another committee context. */
  OUT_OF_SCOPE: "out_of_scope",
  /** Not available — and deliberately indistinguishable from "does not exist". */
  NOT_FOUND: "not_found",
  /** A dependency is partially unavailable; what works is stated. */
  DEGRADED: "degraded",
  /** A technical failure that is safe to retry. */
  ERROR: "error",
  /** A demonstration record reached from a real account: the isolated session is the way in. */
  EXPLORATION: "exploration",
  /** An exploration session lapsed or was revoked: re-enter exploration, never fall back to real data. */
  SESSION_ENDED: "session_ended",
};

/** Server refusal codes → surface state. Authority-shaped codes are the "who may" family. */
const CODE_STATE = {
  invalid_request: SURFACE_STATE.ERROR,
  unsupported_type: SURFACE_STATE.ERROR,
  not_a_member: SURFACE_STATE.NO_AUTHORITY,
  no_seat: SURFACE_STATE.NO_AUTHORITY,
  write_not_permitted: SURFACE_STATE.NO_AUTHORITY,
  unauthenticated: SURFACE_STATE.NO_AUTHORITY,
  forbidden: SURFACE_STATE.NO_AUTHORITY,
  out_of_scope: SURFACE_STATE.OUT_OF_SCOPE,
  not_found: SURFACE_STATE.NOT_FOUND,
  unknown_persona: SURFACE_STATE.SESSION_ENDED,
  no_session: SURFACE_STATE.SESSION_ENDED,
  session_expired: SURFACE_STATE.SESSION_ENDED,
  session_revoked: SURFACE_STATE.SESSION_ENDED,
  revoked: SURFACE_STATE.SESSION_ENDED,
  expired: SURFACE_STATE.SESSION_ENDED,
  showcase_scope: SURFACE_STATE.EXPLORATION,
  degraded: SURFACE_STATE.DEGRADED,
  service_unavailable: SURFACE_STATE.DEGRADED,
};

/** A transport failure is DEGRADED when the dependency is unreachable, ERROR when it answered badly. */
function stateForTransport(status, message) {
  const text = String(message || "");
  if (!status || status === 502 || status === 503 || status === 504 || status === 0) return SURFACE_STATE.DEGRADED;
  if (/network|timeout|offline|unavailable|fetch|اتصال|الخدمة|مهلة/i.test(text)) return SURFACE_STATE.DEGRADED;
  if (status === 401) return SURFACE_STATE.SESSION_ENDED;
  if (status === 403) return SURFACE_STATE.NO_AUTHORITY;
  if (status === 404) return SURFACE_STATE.NOT_FOUND;
  return SURFACE_STATE.ERROR;
}

/**
 * The single resolution. `count` is accepted ONLY as evidence that a read succeeded: a zero with
 * no successful read is never reported as EMPTY.
 */
export function resolveSurfaceState({ loading, errorCode, error, status, count }) {
  if (loading) return SURFACE_STATE.LOADING;
  if (errorCode && CODE_STATE[errorCode]) return CODE_STATE[errorCode];
  if (errorCode) return SURFACE_STATE.ERROR;
  if (error) return stateForTransport(status, error);
  if (typeof count === "number" && count === 0) return SURFACE_STATE.EMPTY;
  return null;
}

/** Only these two states offer a retry: a refusal will never succeed by repeating it. */
export function isRetryable(state) {
  return state === SURFACE_STATE.ERROR || state === SURFACE_STATE.DEGRADED;
}