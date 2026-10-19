import React from "react";
import { useLocation } from "react-router-dom";
import { useShellSidebarPresence } from "@/lib/sidebarPresence";
import AgentChatPanel from "@/components/raqeem/AgentChatPanel";

const HIDDEN_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/oauth-consent"];
// Token-scoped surfaces reached by an EXTERNAL party — a guest invitation, one obligation's
// extract: the capability link is the whole of that visitor's authority, and the institution's
// own assistant is not offered there.
const EXTERNAL_TOKEN_ROUTES = ["/guest/", "/extract/"];

/**
 * AmeenLauncher — the ONE entry point for the ONE assistant.
 * Mounted once for the whole app: never duplicated per page.
 *
 * «أمين» is present on EVERY surface: inside the governed shells as the sidebar row, and
 * everywhere else through this launcher. A visitor who holds no session still meets it —
 * locked, and told exactly what it needs — instead of finding the assistant absent from the page.
 */
export default function AmeenLauncher() {
  const location = useLocation();
  // The governed shells host «أمين» inside the shared sidebar, so the floating entry
  // stands down while one is on screen. Outside them it stays the only entry point.
  const hasShellSidebar = useShellSidebarPresence();

  if (hasShellSidebar) return null;
  if (HIDDEN_ROUTES.some((p) => location.pathname.startsWith(p))) return null;
  if (EXTERNAL_TOKEN_ROUTES.some((p) => location.pathname.startsWith(p))) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-3 lg:right-5 z-40 print:hidden">
      <AgentChatPanel variant="floating" />
    </div>
  );
}