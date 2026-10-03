import { useState, useEffect, useRef, useCallback } from "react";
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

  // Cancellation token: a read abandoned by a committee change is discarded, so it can
  // never overwrite the committee the user is actually on.
  const requestRef = useRef(0);

  const committeeId = data?.committee?.id;

  // Latest values without re-triggering reads: filterFn is usually an inline arrow, so
  // depending on it would re-run the effect on every render.
  const filterFnRef = useRef(filterFn);
  filterFnRef.current = filterFn;
  const dataRef = useRef(data);
  dataRef.current = data;

  const fetch = useCallback(() => {
    if (!committeeId) return;
    const token = ++requestRef.current;
    const filter = filterFnRef.current ? filterFnRef.current(committeeId, dataRef.current) : { committee_id: committeeId };
    setLoading(true);
    base44.entities[entityName]
      .filter(filter)
      .then((res) => { if (token === requestRef.current) setRecords(res || []); })
      .catch(() => { if (token === requestRef.current) setRecords([]); })
      .finally(() => { if (token === requestRef.current) setLoading(false); });
  }, [committeeId, entityName]);

  useEffect(() => { fetch(); }, [fetch]);

  return { records, loading, reload: fetch, committee: data?.committee, fullData: data };
}