import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useCommittee } from "@/lib/CommitteeContext";

/**
 * Fetch entity records scoped to the current committee.
 * @param {string} entityName - Base44 entity name
 * @param {function|null} filterFn - (committeeId, data) => filter object
 */
export function useCommitteeScopedData(entityName, filterFn = null) {
  const { data } = useCommittee();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const committeeId = data?.committee?.id;

  const fetch = () => {
    if (!committeeId) return;
    const filter = filterFn ? filterFn(committeeId, data) : { committee_id: committeeId };
    setLoading(true);
    base44.entities[entityName]
      .filter(filter)
      .then((res) => setRecords(res || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetch(); }, [committeeId, entityName]);

  return { records, loading, reload: fetch, committee: data?.committee, fullData: data };
}