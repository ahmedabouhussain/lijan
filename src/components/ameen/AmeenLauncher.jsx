import React from "react";
import { useLocation } from "react-router-dom";
import { useAmeen } from "@/lib/AmeenContext";
import { useShellSidebarPresence } from "@/lib/sidebarPresence";
import AgentChatPanel from "@/components/raqeem/AgentChatPanel";

const HIDDEN_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/oauth-consent"];

/**
 * AmeenLauncher — the ONE entry point for the ONE assistant.
 * Mounted once for the whole app: never duplicated per page.
 */
export default function AmeenLauncher() {
  const location = useLocation();
  const { isActive } = useAmeen();
  // The governed shells host «أمين» inside the shared sidebar, so the floating entry
  // stands down while one is on screen. Outside them it stays the only entry point.
  const hasShellSidebar = useShellSidebarPresence();

  if (!isActive) return null;
  if (hasShellSidebar) return null;
  if (HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-3 lg:right-5 z-40 print:hidden">
      <AgentChatPanel variant="floating" />
    </div>
  );
}