import React, { useState } from "react";
import { Eye, Download, Loader2, Clock, AlertCircle } from "lucide-react";
import { requestFileAccess, accessNotice, LEGACY_STATE } from "@/lib/secureFiles";
import { useLanguage } from "@/lib/LanguageContext";

// Opens a sensitive stored file. Nothing is signed until the user asks, and the link is
// produced by the server gate — which authenticates the user, judges permission, purpose and
// classification for THIS record, minted a short-lived link, and recorded the decision in the
// audit trail. The component must declare which record the file belongs to.
export default function SecureFileLink({
  fileRef,
  action = "preview",
  entityType,
  entityId,
  committeeId,
  purpose = "",
  label,
  className = "",
  showIcon = true,
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [legacy, setLegacy] = useState(false);

  const open = async () => {
    if (!fileRef || busy) return;
    setBusy(true);
    setNotice("");
    setLegacy(false);
    try {
      const res = await requestFileAccess({ fileRef, entityType, entityId, committeeId, action, purpose });
      if (res.url) {
        window.open(res.url, "_blank", "noopener,noreferrer");
        return;
      }
      setLegacy(res.state === LEGACY_STATE);
      setNotice(accessNotice(res.state, t));
    } catch (e) {
      setNotice(e?.message || t("تعذّر فتح الملف", "The file could not be opened"));
    } finally {
      setBusy(false);
    }
  };

  const Icon = action === "download" ? Download : Eye;

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button type="button" onClick={open} disabled={busy} aria-busy={busy} className={className}>
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : showIcon ? (
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        ) : null}
        {label}
      </button>
      {notice && (
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
          {legacy ? (
            <Clock className="w-3 h-3" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-3 h-3" aria-hidden="true" />
          )}
          {notice}
        </span>
      )}
    </span>
  );
}