import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";

// useCommitteeRecord — one governed read of a record's detail bundle.
// The scope flag travels with the request, so an exploration surface reads its own governed
// dataset and a real surface reads the caller's — never a client-side query of its own.
export default function useCommitteeRecord(entityType, recordId) {
  const { isDemoMode, showcaseToken } = useEffectiveActor();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!entityType || !recordId) return;
    setLoading(true);
    setError("");
    if (isDemoMode && !showcaseToken) {
      setError("جلسة الاستكشاف غير صالحة — أعد الدخول إلى الاستكشاف");
      setBundle(null);
      setLoading(false);
      return;
    }
    try {
      const res = await base44.functions.invoke("GetCommitteeRecord", {
        entity_type: entityType,
        record_id: recordId,
        // The showcase principal travels as a server-issued token — never as a mode flag,
        // a persona key or a role. The server decides the scope from the token alone.
        ...(isDemoMode ? { showcase_token: showcaseToken } : {}),
      });
      const d = res?.data || res;
      if (d?.error) {
        setError(d.error);
        setBundle(null);
      } else {
        setBundle(d);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر تحميل السجل");
      setBundle(null);
    }
    setLoading(false);
  }, [entityType, recordId, isDemoMode, showcaseToken]);

  useEffect(() => { reload(); }, [reload]);

  return { bundle, loading, error, reload };
}