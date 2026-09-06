import React from "react";
import { useLocation, useParams } from "react-router-dom";
import { Sparkles, Bot, Brain } from "lucide-react";
import { useCommitteeSafe } from "@/lib/CommitteeContext";
import AgentChatPanel from "@/components/raqeem/AgentChatPanel";

/**
 * CommitteeAgentDock — route-aware floating agent launcher.
 * Lives in CommitteeLayout. Reads the current route and shows the relevant
 * agent(s) as floating buttons in the bottom corner. Each opens a slide-out chat.
 *
 * Agent mapping:
 * - meeting_copilot → meetings, agenda, minutes, voting, attendance, packs, decisions
 * - action_tracker → actions, evidence, escalations, risks, dependencies, execution
 * - institutional_memory → memory, reports, audit, documents, records, intelligence, governance
 * - home → all three
 */

const AGENT_CONFIGS = {
  meeting_copilot: {
    key: "meeting_copilot",
    icon: Sparkles,
    title: "مساعد الاجتماع",
    triggerLabel: "مساعد الاجتماع",
    emptyHint: "اطلب عرض بنود جدول الأعمال، أو سجّل قراراً رسمياً.",
  },
  action_tracker: {
    key: "action_tracker",
    icon: Bot,
    title: "مساعد الإجراءات",
    triggerLabel: "مساعد الإجراءات",
    emptyHint: "اطلب استعراض إجراءاتك المعلقة أو تحديث حالة إجراء معيّن.",
  },
  institutional_memory: {
    key: "institutional_memory",
    icon: Brain,
    title: "مساعد الذاكرة المؤسسية",
    triggerLabel: "مساعد الذاكرة",
    emptyHint: "اسأل عن مبدأ مؤسسي، قرار تاريخي، أو سياق حوكمة سابق.",
  },
};

// Route → agent keys mapping (relative to /o/:orgRef/c/:committeeRef)
const ROUTE_AGENTS = {
  "": ["meeting_copilot", "action_tracker", "institutional_memory"],
  home: ["meeting_copilot", "action_tracker", "institutional_memory"],

  // Meeting copilot — meeting lifecycle
  meetings: ["meeting_copilot"],
  agenda: ["meeting_copilot"],
  minutes: ["meeting_copilot"],
  voting: ["meeting_copilot"],
  attendance: ["meeting_copilot"],
  packs: ["meeting_copilot"],
  decisions: ["meeting_copilot", "institutional_memory"],

  // Action tracker — execution & follow-up
  actions: ["action_tracker"],
  evidence: ["action_tracker"],
  escalations: ["action_tracker"],
  risks: ["action_tracker"],
  dependencies: ["action_tracker"],
  execution: ["action_tracker"],

  // Institutional memory — knowledge & records
  memory: ["institutional_memory"],
  reports: ["institutional_memory"],
  audit: ["institutional_memory"],
  documents: ["institutional_memory"],
  records: ["institutional_memory"],
  intelligence: ["institutional_memory"],
  governance: ["institutional_memory"],

  // People — memory for historical context
  people: ["institutional_memory"],
  formation: ["institutional_memory"],
  "formation-history": ["institutional_memory"],
  amendments: ["institutional_memory"],
};

function getRouteKey(pathname, orgRef, committeeRef) {
  const base = `/o/${orgRef}/c/${committeeRef}`;
  const rest = pathname.slice(base.length).replace(/^\//, "");
  // Handle /meetings/:id → "meetings"
  const top = rest.split("/")[0] || "";
  return top;
}

export default function CommitteeAgentDock() {
  const location = useLocation();
  const { orgRef, committeeRef, id: meetingId } = useParams();
  const committeeCtx = useCommitteeSafe();
  const committeeId = committeeCtx?.data?.committee?.id;

  const routeKey = getRouteKey(location.pathname, orgRef, committeeRef);
  const agentKeys = ROUTE_AGENTS[routeKey] || [];

  if (agentKeys.length === 0) return null;

  // Build metadata for each agent
  const getMetadata = (agentKey) => {
    if (agentKey === "meeting_copilot") {
      return meetingId
        ? { meeting_id: meetingId, committee_id: committeeId }
        : { committee_id: committeeId };
    }
    if (agentKey === "action_tracker") {
      return { committee_id: committeeId, scope: "action_tracker" };
    }
    if (agentKey === "institutional_memory") {
      return { committee_id: committeeId, scope: "institutional_memory" };
    }
    return {};
  };

  // Stack multiple floating buttons vertically (above mobile bottom nav)
  return (
    <div className="fixed bottom-16 lg:bottom-4 right-2 lg:right-4 z-40 flex flex-col-reverse items-end gap-2 pointer-events-none">
      {agentKeys.map((key) => {
        const config = AGENT_CONFIGS[key];
        if (!config) return null;
        return (
          <div key={key} className="pointer-events-auto">
            <AgentChatPanel
              agentKey={config.key}
              icon={config.icon}
              title={config.title}
              triggerLabel={config.triggerLabel}
              emptyHint={config.emptyHint}
              metadata={getMetadata(key)}
              variant="floating"
            />
          </div>
        );
      })}
    </div>
  );
}