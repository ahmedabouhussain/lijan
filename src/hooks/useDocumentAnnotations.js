import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { serverError } from "@/components/raqeem/annotations/annotationLabels";

// Loads the notes of ONE document through the governed read, and runs the governed note command.
// A failed read is an error state — never an empty list.
export default function useDocumentAnnotations(documentId, enabled = true) {
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetDocumentAnnotations", { document_id: documentId });
      setData(res.data);
    } catch (e) {
      setData(null);
      setError(serverError(t, e, t("تعذّرت قراءة الملاحظات، ولا تُعرض قائمة فارغة بدلًا منها.", "Notes could not be read; no empty list is shown in their place.")));
    }
    setLoading(false);
  }, [documentId, t]);

  useEffect(() => { if (enabled && documentId) load(); }, [enabled, documentId, load]);

  const act = async (payload, key) => {
    setBusy(key);
    setError("");
    let ok = false;
    try {
      await base44.functions.invoke("AnnotateDocument", payload);
      ok = true;
      await load();
    } catch (e) {
      setError(serverError(t, e, t("لم يُحفظ أي تغيير على الملاحظة.", "No change was saved to the note.")));
    }
    setBusy("");
    return ok;
  };

  return { data, loading, error, busy, load, act };
}