import { useCallback, useEffect, useState } from "react";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { useCommittee } from "@/lib/CommitteeContext";
import { governedInvoke } from "@/lib/governedInvoke";
import { SURFACE_STATE, resolveSurfaceState } from "@/lib/governedState";

// useCommitteeRegister — one governed read of a committee's registers.
//
// A register is listed by the SERVER, in the same scope and through the same decision as the
// record's detail page, so a record that is listed can always be opened. Counting, filtering or
// de-duplicating records on the client would show only what happened to be loaded, so every value
// this hook returns is the server's answer for the whole register.
export default function useCommitteeRegister(registers) {
  const { data: committeeData } = useCommittee();
  const { isDemoMode, showcaseToken, renewDemo } = useEffectiveActor();
  const committeeId = committeeData?.committee?.id || null;
  const keys = Array.isArray(registers) ? registers : [registers];
  const signature = keys.join(",");

  const [bundles, setBundles] = useState({});
  const [withheld, setWithheld] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // The refusal CODE and the transport status travel with the error: a surface must be able to
  // render "no authority" or "unavailable" instead of turning a refusal into a zero.
  const [errorCode, setErrorCode] = useState("");
  const [status, setStatus] = useState(0);

  const reload = useCallback(async () => {
    if (!committeeId) return;
    setLoading(true);
    setError("");
    setErrorCode("");
    setStatus(0);
    try {
      const res = await governedInvoke(
        "ListCommitteeRegister",
        { committee_id: committeeId, registers: signature.split(",") },
        { isDemoMode, showcaseToken, renew: renewDemo }
      );
      const d = res?.data || res;
      if (d?.error) {
        setError(d.error);
        setErrorCode(d.code || "");
        setBundles({});
      } else {
        setBundles(d?.registers || {});
        setWithheld(d?.withheld_registers || []);
        setErrorCode("");
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "");
      setErrorCode(e?.response?.data?.code || "");
      setStatus(e?.response?.status || 0);
      setBundles({});
    }
    setLoading(false);
  }, [committeeId, signature, isDemoMode, showcaseToken, renewDemo]);

  useEffect(() => { reload(); }, [reload]);

  const items = useCallback((key) => bundles?.[key]?.items || [], [bundles]);
  const countFor = useCallback((key) => bundles?.[key]?.count ?? null, [bundles]);

  // The state of ONE register. A count is evidence of a successful read — so it is passed only
  // when the read actually succeeded, and a zero can never be produced by a refusal or a failure.
  const stateFor = useCallback((key) => resolveSurfaceState({
    loading,
    errorCode,
    error,
    status,
    count: (loading || error) ? undefined : bundles?.[key]?.count,
  }), [loading, errorCode, error, status, bundles]);

  const state = stateFor(signature.split(",")[0]);

  return { bundles, items, countFor, withheld, loading, error, errorCode, status, state, stateFor, reload };
}