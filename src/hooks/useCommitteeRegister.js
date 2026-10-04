import { useCallback, useEffect, useState } from "react";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import { useCommittee } from "@/lib/CommitteeContext";
import { governedInvoke } from "@/lib/governedInvoke";

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

  const reload = useCallback(async () => {
    if (!committeeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await governedInvoke(
        "ListCommitteeRegister",
        { committee_id: committeeId, registers: signature.split(",") },
        { isDemoMode, showcaseToken, renew: renewDemo }
      );
      const d = res?.data || res;
      if (d?.error) {
        setError(d.error);
        setBundles({});
      } else {
        setBundles(d?.registers || {});
        setWithheld(d?.withheld_registers || []);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "");
      setBundles({});
    }
    setLoading(false);
  }, [committeeId, signature, isDemoMode, showcaseToken, renewDemo]);

  useEffect(() => { reload(); }, [reload]);

  const items = useCallback((key) => bundles?.[key]?.items || [], [bundles]);
  const countFor = useCallback((key) => bundles?.[key]?.count ?? null, [bundles]);

  return { bundles, items, countFor, withheld, loading, error, reload };
}