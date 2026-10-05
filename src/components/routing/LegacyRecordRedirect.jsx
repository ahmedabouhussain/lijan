import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useParams, Navigate } from "react-router-dom";

/**
 * Legacy UNSCOPED record links (/meetings/:id, /decisions/:id) recover their scope from the record
 * itself — never from browser memory (P1-01: a QDB meeting decision link opened unscoped and lost
 * the organization, committee and role shell).
 *
 * The scope is resolved through the GOVERNED read gate, so a reader who is not authorized for the
 * record learns nothing and is sent home instead of being shown a page. Authorization is decided
 * server-side; this component only routes.
 */
export default function LegacyRecordRedirect({ kind }) {
  const { id } = useParams();
  const [state, setState] = useState({ phase: "resolving", target: "/" });

  useEffect(() => {
    let active = true;
    (async () => {
      const entityType = kind === "meetings" ? "Meeting" : "Decision";
      let data = null;
      try {
        const response = await base44.functions.invoke("GetCommitteeRecord", {
          entity_type: entityType,
          record_id: id,
        });
        data = response?.data || null;
      } catch (_e) {
        data = null;
      }
      // Unresolvable OR unauthorized both land on the same safe destination: no content is shown.
      const orgRef = data?.organization?.public_id || null;
      const committeeRef = data?.committee?.public_id || null;
      const target = orgRef && committeeRef ? `/o/${orgRef}/c/${committeeRef}/${kind}/${id}` : "/";
      if (active) setState({ phase: "done", target });
    })();
    return () => { active = false; };
  }, [id, kind]);

  if (state.phase === "resolving") {
    return (
      <div className="fixed inset-0 flex items-center justify-center" role="status" aria-busy="true">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  return <Navigate to={state.target} replace />;
}