import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";

const CommitteeContext = createContext(null);

export function CommitteeProvider({ children }) {
  const { committeeRef } = useParams();
  const { isDemoMode, demoPersonaKey } = useEffectiveActor();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const publicId = committeeRef?.split("--").pop() || committeeRef;
  // Cancellation token: a response for an abandoned committee load is discarded, so a slow
  // request can never overwrite the committee the user has since navigated to.
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!publicId) return;
    const token = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetCommitteeMiniPortal", { public_id: publicId, demo_mode: isDemoMode, demo_persona: demoPersonaKey });
      if (token !== requestRef.current) return;
      const d = res.data || res;
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e) {
      if (token !== requestRef.current) return;
      setError(e?.response?.data?.error || e?.message || "تعذّر تحميل اللجنة");
    }
    if (token === requestRef.current) setLoading(false);
  }, [publicId, isDemoMode, demoPersonaKey]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <CommitteeContext.Provider value={{ data, loading, error, reload }}>
      {children}
    </CommitteeContext.Provider>
  );
}

export function useCommittee() {
  const ctx = useContext(CommitteeContext);
  if (!ctx) throw new Error("useCommittee must be used within CommitteeProvider");
  return ctx;
}

// Safe variant — returns null when outside CommitteeProvider (e.g. org-level pages).
export function useCommitteeSafe() {
  return useContext(CommitteeContext);
}