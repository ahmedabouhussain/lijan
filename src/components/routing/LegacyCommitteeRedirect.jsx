import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * Old committee links (/committees/:id) resolve to the committee's canonical
 * workspace route (/o/:org/c/:committee). A committee the reader cannot resolve
 * lands on the workspace home instead of a broken page.
 */
export default function LegacyCommitteeRedirect() {
  const { id } = useParams();
  const [target, setTarget] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const committee = await base44.entities.Committee.get(id).catch(() => null);
      const org = committee?.organization_id
        ? await base44.entities.Organization.get(committee.organization_id).catch(() => null)
        : null;
      const path = committee?.public_id && org?.public_id ? `/o/${org.public_id}/c/${committee.public_id}` : "/";
      if (active) setTarget(path);
    })();
    return () => {
      active = false;
    };
  }, [id]);

  if (!target) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" role="status" aria-busy="true">
        <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  return <Navigate to={target} replace />;
}