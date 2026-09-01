import { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

/**
 * useCrudAction — shared hook for governed CRUD operations.
 * Wraps base44.functions.invoke with loading/error state.
 * Used by all committee pages to call governed backend functions.
 */
export function useCrudAction() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const execute = useCallback(async (functionName, payload, onSuccess) => {
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
      setSubmitting(false);
    }
  }, []);

  const clearError = useCallback(() => setError(""), []);

  return { submitting, error, setError, clearError, execute };
}