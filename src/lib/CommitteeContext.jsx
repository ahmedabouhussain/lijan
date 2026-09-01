import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const CommitteeContext = createContext(null);

export function CommitteeProvider({ children }) {
  const { committeeRef } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const publicId = committeeRef?.split("--")[1] || committeeRef;

  const reload = useCallback(async () => {
    if (!publicId) return;
    setLoading(true);
    setError("");
    try {
      const res = await base44.functions.invoke("GetCommitteeMiniPortal", { public_id: publicId });
      const d = res.data || res;
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "تعذّر تحميل اللجنة");
    }
    setLoading(false);
  }, [publicId]);

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