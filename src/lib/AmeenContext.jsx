// LIJAN™ — AmeenContextProvider
// One context engine for the single assistant «أمين».
// The client resolves WHERE the user is; the server (ResolveAmeenContext) verifies
// WHO they are there — organization, committee, role, permissions and data scope.

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useLanguage } from "@/lib/LanguageContext";
import { useEffectiveActor } from "@/lib/EffectiveActorContext";
import {
  AMEEN_IDENTITY,
  getAmeenContext,
  getAmeenRoleProfile,
} from "@/lib/ameenAgent";
import { resolveAmeenRoute } from "@/lib/ameenContext";

const AmeenContext = createContext(null);

export function AmeenProvider({ children }) {
  const location = useLocation();
  const { lang, t } = useLanguage();
  const { effectiveActor, isDemoMode, isAuthenticated } = useEffectiveActor();

  const route = useMemo(() => resolveAmeenRoute(location.pathname), [location.pathname]);

  const [verified, setVerified] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const actorId = effectiveActor?.id || null;
  const active = isAuthenticated || isDemoMode;

  useEffect(() => {
    // Demo sessions never resolve the founder's real role or scope.
    if (!isAuthenticated || isDemoMode || !route.orgRef) {
      setVerified(null);
      return;
    }
    let cancelled = false;
    setVerifying(true);
    (async () => {
      try {
        const res = await base44.functions.invoke("ResolveAmeenContext", {
          org_ref: route.orgRef,
          committee_ref: route.committeeRef,
          context_key: route.contextKey,
          entity_type: route.entityType,
          entity_id: route.entityId,
        });
        if (!cancelled) setVerified(res?.data || res || null);
      } catch {
        if (!cancelled) setVerified(null);
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    isDemoMode,
    route.orgRef,
    route.committeeRef,
    route.contextKey,
    route.entityType,
    route.entityId,
  ]);

  const context = getAmeenContext(route.contextKey);
  const role = verified?.role || null;
  const roleProfile = getAmeenRoleProfile(role);

  // Isolation key — conversations never cross actor, organization, committee or context.
  const scopeKey = [
    isDemoMode ? "demo" : "live",
    actorId || "anonymous",
    route.orgRef || "-",
    route.committeeRef || "-",
    route.contextKey,
  ].join("::");

  const value = {
    identity: AMEEN_IDENTITY,
    route,
    context,
    contextKey: route.contextKey,
    role,
    roleProfile,
    organization: verified?.organization || null,
    committee: verified?.committee || null,
    capabilities: verified?.capabilities || null,
    allowedSources: verified?.allowed_sources || [],
    classificationCeiling: verified?.classification_ceiling || null,
    accessDenied: verified?.access_denied === true,
    verified: verified?.verified === true,
    verifying,
    isDemo: isDemoMode,
    isActive: active,
    actorId,
    scopeKey,
    lang,
    t,
  };

  return <AmeenContext.Provider value={value}>{children}</AmeenContext.Provider>;
}

export function useAmeen() {
  const ctx = useContext(AmeenContext);
  if (!ctx) throw new Error("useAmeen must be used within AmeenProvider");
  return ctx;
}

export function useAmeenSafe() {
  return useContext(AmeenContext);
}