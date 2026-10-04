import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// LIJAN™ — governed file access (client side).
//
// Policy, in one place:
//   • Sensitive governance files (signatures, founding instruments, charters, minutes,
//     decisions, internal reports, generated PDFs, personal photos) live in private
//     storage: no permanent public URL, ever.
//   • They are served ONLY by the server gate `RequestFileAccess`, which authenticates
//     the user, resolves the record's committee and organization, evaluates permission,
//     purpose and classification, and only then mints a short-lived signed link.
//   • A legacy https:// value on a sensitive field is `legacy_pending_migration`: it is
//     NOT rendered and NOT signed; it is reported so it enters the migration queue.
//   • Approved public assets (brand/identity logos) live on their own asset fields and
//     are rendered directly — they are not part of this module.
//   • A signed link is never written back to a record.
//
// This module exposes no public-upload helper at all, so no sensitive file can be
// published by accident. A component also cannot mint a link on its own: signing
// requires the owning record's scope, because the server must judge that scope.

export const SIGNED_URL_TTL_SECONDS = 300;
export const LEGACY_STATE = "legacy_pending_migration";

/** Outcome codes the server gate can return; the UI maps them to a localized notice. */
export const ACCESS_STATES = {
  LEGACY: LEGACY_STATE,
  DENIED: "denied",
  SCOPE_MISSING: "scope_missing",
};

export function isStoredFile(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/** A legacy public link (pre-migration storage). */
export function isPublicFileUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

/** Upload a sensitive file into private storage; returns its reference, never a public URL. */
export async function uploadPrivateFile(file) {
  const res = await base44.integrations.Core.UploadPrivateFile({ file });
  return res?.file_uri || "";
}

/**
 * Record file activity in the audit trail. This call cannot grant access: it mints no
 * link, and the server function mints none either. Served files are recorded by the
 * gate itself, at the moment of the decision.
 */
export async function logFileAccess({ action, fileRef, entityType, entityId, committeeId, title, reason, correlationId, expiresIn }) {
  try {
    await base44.functions.invoke("LogFileAccess", {
      action,
      file_ref: fileRef,
      entity_type: entityType,
      entity_id: entityId,
      committee_id: committeeId,
      title,
      reason,
      correlation_id: correlationId,
      expires_in: expiresIn,
    });
  } catch (error) {
    console.warn("File access was not recorded in the audit trail:", error?.message || error);
  }
}

/** Flag a legacy public link found on a sensitive field so it enters the migration queue. */
export function reportLegacyLink({ fileRef, entityType, entityId, committeeId, title }) {
  return logFileAccess({ action: "legacy_detected", fileRef, entityType, entityId, committeeId, title, reason: LEGACY_STATE });
}

/**
 * Ask the server gate for a link to a sensitive file.
 * Returns { url, state, reason, expires_in } and never signs anything itself.
 */
export async function requestFileAccess({
  fileRef,
  entityType,
  entityId,
  committeeId,
  action = "preview",
  purpose = "",
}) {
  // A legacy public link on a sensitive field is a finding, not an access path.
  if (isPublicFileUrl(fileRef)) {
    reportLegacyLink({ fileRef, entityType, entityId, committeeId, title: entityType });
    return { url: "", state: LEGACY_STATE, reason: LEGACY_STATE };
  }

  // The server is the authority on scope: it either resolves the record named by the
  // caller, or — for a draft attachment with no saved record — accepts the reference
  // only when the audit trail proves this same user uploaded it.
  try {
    const res = await base44.functions.invoke("RequestFileAccess", {
      entity_type: entityType,
      entity_id: entityId,
      committee_id: committeeId,
      file_ref: fileRef,
      action,
      purpose,
    });
    const data = res?.data || res || {};
    if (data.url) return { url: data.url, expires_in: data.expires_in || SIGNED_URL_TTL_SECONDS };
    return { url: "", state: data.state || ACCESS_STATES.DENIED, reason: data.reason || ACCESS_STATES.DENIED };
  } catch (error) {
    const data = error?.response?.data || {};
    return { url: "", state: data.state || ACCESS_STATES.DENIED, reason: data.reason || data.error || "unavailable" };
  }
}

/** Localized notice for a governed outcome that is not a link. */
export function accessNotice(state, t) {
  if (state === LEGACY_STATE) {
    return t(
      "ملف قديم قيد الترحيل إلى التخزين الخاص",
      "Legacy file pending migration to private storage"
    );
  }
  if (state === ACCESS_STATES.SCOPE_MISSING) {
    return t("الملف غير متاح", "File unavailable");
  }
  return t("الملف غير متاح", "File unavailable");
}

/**
 * Resolve a stored reference into a usable link through the server gate.
 * Returns { url, loading, error, state }; `state` is a governed outcome the caller
 * renders as a notice (`legacy_pending_migration`, `denied`, `scope_missing`).
 */
export function useSecureFileUrl(
  fileRef,
  { enabled = true, entityType = "", entityId = "", committeeId = "", action = "preview", purpose = "" } = {}
) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [state, setState] = useState("");

  useEffect(() => {
    let cancelled = false;
    const settle = (next) => {
      if (cancelled) return;
      setUrl(next.url || "");
      setError(next.error || "");
      setState(next.state || "");
      setLoading(false);
    };

    if (!enabled || !isStoredFile(fileRef)) {
      settle({});
      return () => { cancelled = true; };
    }

    setLoading(true);
    setError("");
    setState("");

    requestFileAccess({ fileRef, entityType, entityId, committeeId, action, purpose })
      .then((res) => settle({ url: res.url, error: res.url ? "" : res.reason, state: res.state }))
      .catch((e) => settle({ state: ACCESS_STATES.DENIED, error: e?.message || "unavailable" }));

    return () => { cancelled = true; };
  }, [fileRef, enabled, entityType, entityId, committeeId, action, purpose]);

  return { url, loading, error, state };
}