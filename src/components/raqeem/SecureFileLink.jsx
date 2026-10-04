import React, { useState } from "react";
import { Eye, Download, Loader2 } from "lucide-react";
import { signedFileUrl, logFileAccess } from "@/lib/secureFiles";
import { useLanguage } from "@/lib/LanguageContext";

// Opens a sensitive stored file through a link that is minted at the moment of the click
// and logged in the audit trail. Nothing is signed until the user asks, and the link is
// never stored on the record.
export default function SecureFileLink({
  fileRef,
  action = "preview",
  entityType,
  entityId,
  committeeId,
  title,
  label,
  className = "",
  showIcon = true,
}) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = async () => {
    if (!fileRef || busy) return;
    setBusy(true);
    setError("");
    try {
      const url = await signedFileUrl(fileRef);
      if (!url) {
        setError(t("الملف غير متاح", "File unavailable"));
        return;
      }
      await logFileAccess({ action, fileRef, entityType, entityId, committeeId, title });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e?.message || t("تعذّر فتح الملف", "The file could not be opened"));
    } finally {
      setBusy(false);
    }
  };

  const Icon = action === "download" ? Download : Eye;

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button type="button" onClick={open} disabled={busy} className={className}>
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : showIcon ? (
          <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        ) : null}
        {label}
      </button>
      {error && <span className="text-xs text-muted-foreground">{error}</span>}
    </span>
  );
}