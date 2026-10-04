import React from "react";
import { Loader2, AlertCircle, Clock } from "lucide-react";
import { useSecureFileUrl, accessNotice, LEGACY_STATE } from "@/lib/secureFiles";
import { useLanguage } from "@/lib/LanguageContext";

// Renders a sensitive stored image (signature, personal photo) through a short-lived signed
// link minted by the server gate for this view only. The component must declare WHICH record
// the file belongs to, because the server judges the viewer's permission and scope from it.
// A file the viewer cannot resolve never leaks its existence: the viewer sees a neutral notice.
export default function SecureFileImage({
  fileRef,
  entityType,
  entityId,
  committeeId,
  alt = "",
  className = "",
  fallback = null,
}) {
  const { t } = useLanguage();
  const { url, loading, error, state } = useSecureFileUrl(fileRef, { entityType, entityId, committeeId });

  if (loading) {
    return (
      <span className={className} role="status" aria-busy="true">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
      </span>
    );
  }

  if (error || state) {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
        {state === LEGACY_STATE ? (
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        {accessNotice(state, t)}
      </span>
    );
  }

  if (!url) return fallback;

  return <img src={url} alt={alt} className={className} />;
}