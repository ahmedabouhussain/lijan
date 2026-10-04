import { useCallback, useEffect, useState } from "react";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { governedInvoke } from "@/lib/governedInvoke";
import { resolveSurfaceState } from "@/lib/governedState";

// useCommitteeRecord — one governed read of a record's detail bundle.
// The scope flag travels with the request, so an exploration surface reads its own governed
// dataset and a real surface reads the caller's — never a client-side query of its own.
export default function useCommitteeRecord(entityType, recordId) {
  const { isDemoMode, showcaseToken, renewDemo } = useEffectiveActor();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // The refusal CODE travels with the error, so a detail surface states WHY the record is not
  // shown instead of rendering an empty page.
  const [errorCode, setErrorCode] = useState("");
  const [status, setStatus] = useState(0);

  const reload = useCallback(async () => {
    if (!entityType || !recordId) return;
    setLoading(true);
    setError("");
    setErrorCode("");
    setStatus(0);
    if (isDemoMode && !showcaseToken) {
      setError("جلسة الاستكشاف غير صالحة — أعد الدخول إلى الاستكشاف");
      setErrorCode("no_session");
      setBundle(null);
      setLoading(false);
      return;
    }
    try {
      const res = await governedInvoke(
        "GetCommitteeRecord",
        // The exploration principal travels as a server-issued token — never as a mode flag,
        // a persona key or a role. The server decides the scope from the token alone.
        { entity_type: entityType, record_id: recordId },
        { isDemoMode, showcaseToken, renew: renewDemo }
      );
      const d = res?.data || res;
      if (d?.error) {
        setError(d.error);
        setErrorCode(d.code || "");
        setBundle(null);
      } else {
        setBundle(d);
        setErrorCode("");
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر تحميل السجل");
      setErrorCode(e?.response?.data?.code || "");
      setStatus(e?.response?.status || 0);
      setBundle(null);
    }
    setLoading(false);
  }, [entityType, recordId, isDemoMode, showcaseToken, renewDemo]);

  useEffect(() => { reload(); }, [reload]);

  // Once the bundle has loaded, the state is null — a loaded record is not a state, it is content.
  const state = resolveSurfaceState({ loading, errorCode, error, status });

  return { bundle, loading, error, errorCode, status, state, reload };
}