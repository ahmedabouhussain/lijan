import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { useCommitteeSafe } from "@/lib/CommitteeContext";
import AgentChatPanel from "@/components/raqeem/AgentChatPanel";

/**
 * CommitteeAgentDock — route-aware launcher for the single agent «أمين».
 * One assistant, one button; the current committee context activates the
 * relevant mode (meetings / actions / memory / general).
 */

// Route → active mode (relative to /o/:orgRef/c/:committeeRef)
const ROUTE_MODE = {
  "": "general",
  home: "general",

  // Meeting lifecycle
  meetings: "meetings",
  agenda: "meetings",
  minutes: "meetings",
  voting: "meetings",
  attendance: "meetings",
  packs: "meetings",
  decisions: "meetings",

  // Execution & follow-up
  actions: "actions",
  evidence: "actions",
  escalations: "actions",
  risks: "actions",
  dependencies: "actions",
  execution: "actions",

  // Knowledge & records
  memory: "memory",
  reports: "memory",
  audit: "memory",
  documents: "memory",
  records: "memory",
  intelligence: "memory",
  governance: "memory",
  people: "memory",
  formation: "memory",
  "formation-history": "memory",
  amendments: "memory",
};

function getRouteKey(pathname, orgRef, committeeRef) {
  const base = `/o/${orgRef}/c/${committeeRef}`;
  const rest = pathname.slice(base.length).replace(/^\//, "");
  return rest.split("/")[0] || "";
}

export default function CommitteeAgentDock() {
  const location = useLocation();
  const { orgRef, committeeRef, id: meetingId } = useParams();
  const committeeCtx = useCommitteeSafe();
  const committeeId = committeeCtx?.data?.committee?.id;

  const routeKey = getRouteKey(location.pathname, orgRef, committeeRef);
  const mode = ROUTE_MODE[routeKey] || "general";

  // The active meeting is part of the context only for the meeting modes
  const metadata = {
    ...(committeeId ? { committee_id: committeeId } : {}),
    ...(meetingId && mode === "meetings" ? { meeting_id: meetingId } : {}),
  };

  return (
    <div className="fixed bottom-16 lg:bottom-4 right-2 lg:right-4 z-40 pointer-events-none">
      <div className="pointer-events-auto">
        <AgentChatPanel mode={mode} metadata={metadata} variant="floating" />
      </div>
    </div>
  );
}