import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

// LIJAN™ — private file access.
//
// Sensitive governance files (signatures, founding instruments, charters, formation
// decisions, minutes, internal documents, classified attachments and any document tied to
// approvals or voting) are stored in private storage: they have NO permanent public URL.
// A short-lived signed link is minted only when an authorized user actually asks to open
// the file, and the signed link is never written back to a record.
//
// A legacy https:// value is handed back unchanged, so documents uploaded before the
// migration keep opening while they are moved across.

export const SIGNED_URL_TTL_SECONDS = 300; // five minutes; long enough to open, short enough to leak-proof

export function isStoredFile(value) {
  return typeof value === "string" && value.trim().length > 0;
}

/** A record still pointing at the old public storage. */
export function isPublicFileUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

/** Upload a file into private storage and return its reference (never a public URL). */
export async function uploadPrivateFile(file) {
  const res = await base44.integrations.Core.UploadPrivateFile({ file });
  return res?.file_uri || "";
}

/** Mint a signed link for a stored file. The result is short-lived and must not be persisted. */
export async function signedFileUrl(fileRef, expiresIn = SIGNED_URL_TTL_SECONDS) {
  if (!isStoredFile(fileRef)) return "";
  if (isPublicFileUrl(fileRef)) return fileRef;
  const res = await base44.integrations.Core.CreateFileSignedUrl({
    file_uri: fileRef,
    expires_in: expiresIn,
  });
  return res?.signed_url || "";
}

/**
 * Record a file touch in the audit trail (upload / preview / download / share).
 * The audit row holds who touched which record and when — never the signed link itself.
 * A logging failure must never block the user's action.
 */
export async function logFileAccess({ action, fileRef, entityType, entityId, committeeId, title }) {
  try {
    await base44.functions.invoke("LogFileAccess", {
      action,
      file_ref: fileRef,
      entity_type: entityType,
      entity_id: entityId,
      committee_id: committeeId,
      title,
    });
  } catch (error) {
    console.warn("File access was not recorded in the audit trail:", error?.message || error);
  }
}

/** Resolve a stored reference into a usable link, signing only when the viewer is authenticated. */
export function useSecureFileUrl(fileRef, { enabled = true } = {}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!enabled || !isStoredFile(fileRef)) {
      setUrl("");
      setError("");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (isPublicFileUrl(fileRef)) {
      setUrl(fileRef);
      setError("");
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError("");
    signedFileUrl(fileRef)
      .then((signed) => {
        if (cancelled) return;
        if (!signed) setError("empty");
        setUrl(signed);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || "unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fileRef, enabled]);

  return { url, loading, error };
}