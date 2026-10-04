import React from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useSecureFileUrl } from "@/lib/secureFiles";
import { useLanguage } from "@/lib/LanguageContext";

// Renders a sensitive stored image (signature, personal photo) through a short-lived signed
// link that is minted for this view only. A file the viewer cannot resolve never leaks its
// existence: the viewer simply sees the neutral notice below.
export default function SecureFileImage({ fileRef, alt = "", className = "", fallback = null }) {
  const { t } = useLanguage();
  const { url, loading, error } = useSecureFileUrl(fileRef);

  if (loading) {
    return (
      <span className={className} role="status" aria-busy="true">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
      </span>
    );
  }

  if (error) {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
        {t("الملف غير متاح", "File unavailable")}
      </span>
    );
  }

  if (!url) return fallback;

  return <img src={url} alt={alt} className={className} />;
}