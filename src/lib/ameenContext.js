// LIJAN™ — «أمين» context resolution.
// Maps the current route to the active contextual state of the single assistant.
// Pure and dependency-free so it can be reused anywhere.

const SECTION_CONTEXT = {
  "": "committee",
  home: "committee",

  meetings: "meeting",
  agenda: "meeting",
  packs: "meeting",
  attendance: "meeting",
  voting: "meeting",

  minutes: "minutes",

  decisions: "decision",

  actions: "actions",
  execution: "actions",
  evidence: "actions",
  escalations: "actions",
  risks: "actions",
  dependencies: "actions",

  documents: "documents",
  records: "documents",
  products: "documents",
  documentation: "documents",

  reports: "memory",
  memory: "memory",
  intelligence: "memory",
  audit: "memory",

  governance: "governance",
  mandate: "governance",
  "governance-rules": "governance",
  formation: "governance",
  "formation-history": "governance",
  amendments: "governance",
  roles: "governance",
  delegations: "governance",
  alternates: "governance",
  recusals: "governance",
  people: "governance",
  closure: "governance",
  settings: "governance",
  integrations: "governance",

  notifications: "committee",
};

const ENTITY_BY_CONTEXT = {
  committee: "Committee",
  meeting: "Meeting",
  minutes: "MeetingMinutes",
  decision: "Decision",
  actions: "Action",
  documents: "Document",
  governance: "Committee",
};

const COMMITTEE_ROUTE = /^\/o\/([^/?#]+)\/c\/([^/?#]+)(?:\/([^/?#]+))?(?:\/([^/?#]+))?/;
const ORG_ROUTE = /^\/o\/([^/?#]+)(?:\/([^/?#]+))?/;

/**
 * Resolve the active أمين context from a pathname.
 * Returns nulls (and the general context) outside organization scopes.
 */
export function resolveAmeenRoute(pathname = "") {
  const committeeMatch = pathname.match(COMMITTEE_ROUTE);
  if (committeeMatch) {
    const [, orgRef, committeeRef, section = "", recordId] = committeeMatch;
    const contextKey = SECTION_CONTEXT[section] || "committee";
    return {
      orgRef,
      committeeRef,
      section,
      routeKey: section,
      contextKey,
      entityType: ENTITY_BY_CONTEXT[contextKey] || null,
      entityId: recordId || null,
      meetingId: contextKey === "meeting" ? recordId || null : null,
      inCommittee: true,
    };
  }

  const orgMatch = pathname.match(ORG_ROUTE);
  if (orgMatch) {
    const [, orgRef, section = ""] = orgMatch;
    return {
      orgRef,
      committeeRef: null,
      section,
      routeKey: section,
      contextKey: "general",
      entityType: null,
      entityId: null,
      meetingId: null,
      inCommittee: false,
    };
  }

  return {
    orgRef: null,
    committeeRef: null,
    section: "",
    routeKey: "",
    contextKey: "general",
    entityType: null,
    entityId: null,
    meetingId: null,
    inCommittee: false,
  };
}

/** Sandbox-scope agent for the exploration experience — same «أمين», sandbox data only. */
export const AMEEN_SANDBOX_AGENT_NAME = "ameen_demo";

/** Public-id extraction from a route ref (mirrors the platform's slug--publicId form). */
export function publicIdFromRef(ref) {
  if (!ref) return null;
  return ref.split("--").pop() || ref;
}