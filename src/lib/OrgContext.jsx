import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";

const OrgContext = createContext(null);

export function OrgProvider({ children }) {
  const { orgRef } = useParams();
  const { isDemoMode } = useEffectiveActor();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const publicId = orgRef?.split("--").pop() || orgRef;

  const reload = useCallback(async () => {
    if (!publicId) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetOrganizationPortal", { public_id: publicId, demo_mode: isDemoMode });
      const d = res.data || res;
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر تحميل البوابة");
    }
    setLoading(false);
  }, [publicId, isDemoMode]);

  useEffect(() => { reload(); }, [reload]);

  return (
    <OrgContext.Provider value={{ data, loading, error, reload, orgRef }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}