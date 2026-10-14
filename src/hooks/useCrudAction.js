import { useState, useCallback, useRef } from "react";
import { useEffectiveActor } from '@/lib/EffectiveActorContext';
import { useLanguage } from '@/lib/LanguageContext';
import { base44 } from "@/api/base44Client";

/**
 * useCrudAction — shared hook for governed CRUD operations.
 * Wraps base44.functions.invoke with loading/error state.
 * Used by all committee pages to call governed backend functions.
 */
export function useCrudAction() {
  const lock = useRef(false);
  const { isDemoMode } = useEffectiveActor();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const execute = useCallback(async (functionName, payload, onSuccess) => {
    if (lock.current) return null;
    if (isDemoMode) { setError(t('العرض الاستكشافي للقراءة فقط.', 'Exploration is read-only.')); return null; }
    lock.current = true;
    setSubmitting(true);
    setError("");
    try {
      const res = await base44.functions.invoke(functionName, payload);
      if (onSuccess) onSuccess(res);
      return res;
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Failed";
      setError(msg);
      throw e;
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  }, [isDemoMode, t]);

  const clearError = useCallback(() => setError(""), []);

  return { submitting, error, setError, clearError, execute };
}