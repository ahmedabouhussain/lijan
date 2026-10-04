import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { governedInvoke } from "@/lib/governedInvoke";

const CommitteeContext = createContext(null);

// The committee context is loaded ONCE per committee and shared by every surface inside it.
//
// Authority is never assembled here: the call carries the caller's exploration token (when there
// is one) and the server answers with the committee, its members, its meetings and its registers
// for the principal that token or session represents. A lapsed exploration session is renewed in
// place rather than emptying the workspace.
export function CommitteeProvider({ children }) {
  const { committeeRef } = useParams();
  const { isDemoMode, demoPersonaKey, showcaseToken, renewDemo } = useEffectiveActor();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const publicId = committeeRef?.split("--").pop() || committeeRef;
  // Cancellation token: a response for an abandoned committee load is discarded, so a slow
  // request can never overwrite the committee the user has since navigated to.
  const requestRef = useRef(0);

  const reload = useCallback(async () => {
    if (!publicId) return;
    const tokenAtRequest = ++requestRef.current;
    setLoading(true);
    setError("");
    try {
      const res = await governedInvoke(
        "GetCommitteeMiniPortal",
        { public_id: publicId, demo_mode: isDemoMode, demo_persona: demoPersonaKey },
        { isDemoMode, showcaseToken, renew: renewDemo }
      );
      if (tokenAtRequest !== requestRef.current) return;
      const d = res.data || res;
      if (d.error) setError(d.error);
      else {
        setData(d);
        setError("");
      }
    } catch (e) {
      if (tokenAtRequest !== requestRef.current) return;
      setError(e?.response?.data?.error || e?.message || "");
    }
    if (tokenAtRequest === requestRef.current) setLoading(false);
  }, [publicId, isDemoMode, demoPersonaKey, showcaseToken, renewDemo]);

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