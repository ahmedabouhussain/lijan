import React from "react";
import { useLocation } from "react-router-dom";
import { useAmeen } from "@/lib/AmeenContext";
import AgentChatPanel from "@/components/raqeem/AgentChatPanel";

const HIDDEN_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/oauth-consent"];

/**
 * AmeenLauncher — the ONE entry point for the ONE assistant.
 * Mounted once for the whole app: never duplicated per page.
 */
export default function AmeenLauncher() {
  const location = useLocation();
  const { isActive } = useAmeen();

  if (!isActive) return null;
  if (HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-3 lg:right-5 z-40 print:hidden">
      <AgentChatPanel variant="floating" />
    </div>
  );
}