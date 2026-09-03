// LIJAN™ — Effective Actor Context
// Central identity layer that provides the "effective actor" for all UI.
// When demo mode is active, returns Fahad Al-Fihaidi's identity.
// When not, returns the real authenticated user.
//
// CRITICAL: This layer NEVER modifies the real user's account.
// Demo identity is a client-side session backed by server-verified demo data.
// The founder's account (name, email, roles, permissions) is never touched.

import React, { createContext, useContext, useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { DEMO_USER } from '@/../base44/shared/demoDataset';

const DEMO_SESSION_KEY = 'lijan_demo_session';

const EffectiveActorContext = createContext();

export const EffectiveActorProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  // Initialize synchronously from localStorage so isDemoMode is correct on first render.
  // This prevents a race condition where UnifiedWorkspace calls GetMyOrganizations with
  // demo_mode=false (before the session loads) and triggers an auth error.
  const [demoSession, setDemoSession] = useState(() => {
    try {
      const raw = localStorage.getItem(DEMO_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.actor_id && parsed.email) return parsed;
        localStorage.removeItem(DEMO_SESSION_KEY);
      }
    } catch {
      localStorage.removeItem(DEMO_SESSION_KEY);
    }
    return null;
  });

  const enterDemo = useCallback(() => {
    const session = {
      actor_id: DEMO_USER.persona_key,
      display_name_ar: DEMO_USER.name_ar,
      display_name_en: DEMO_USER.name_en,
      email: DEMO_USER.email,
      job_title_ar: DEMO_USER.job_title_ar,
      job_title_en: DEMO_USER.job_title_en,
      primary_org_ar: DEMO_USER.primary_org_ar,
      primary_org_en: DEMO_USER.primary_org_en,
      is_demo: true,
      demo_session_id: `demo-${Date.now()}`,
      started_at: new Date().toISOString(),
    };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    setDemoSession(session);
    return session;
  }, []);

  const exitDemo = useCallback(() => {
    localStorage.removeItem(DEMO_SESSION_KEY);
    // Clear demo-specific caches
    [
      'activeOrganizationId', 'activeCommitteeId', 'activeMembershipId',
      'lastCommitteeRoute', 'committeeQueryCache',
      'raqeem_active_org', 'raqeem_active_committee',
    ].forEach((k) => localStorage.removeItem(k));
    setDemoSession(null);
  }, []);

  const isDemoMode = !!demoSession;

  // Build the effective actor object
  const effectiveActor = isDemoMode
    ? {
        id: demoSession.actor_id,
        full_name: demoSession.display_name_ar,
        email: demoSession.email,
        role: 'user', // Never 'admin' in demo mode — no founder privileges
        data: {
          display_name_ar: demoSession.display_name_ar,
          display_name_en: demoSession.display_name_en,
          job_title_ar: demoSession.job_title_ar,
          job_title_en: demoSession.job_title_en,
          primary_org_ar: demoSession.primary_org_ar,
          primary_org_en: demoSession.primary_org_en,
          is_demo_user: true,
          demo_persona_key: DEMO_USER.persona_key,
        },
      }
    : user;

  return (
    <EffectiveActorContext.Provider
      value={{
        effectiveActor,
        isDemoMode,
        demoSession,
        enterDemo,
        exitDemo,
        // The real authenticated user (always Ahmed when in demo mode)
        realUser: user,
        isAuthenticated,
      }}
    >
      {children}
    </EffectiveActorContext.Provider>
  );
};

export const useEffectiveActor = () => {
  const ctx = useContext(EffectiveActorContext);
  if (!ctx) {
    throw new Error('useEffectiveActor must be used within EffectiveActorProvider');
  }
  return ctx;
};