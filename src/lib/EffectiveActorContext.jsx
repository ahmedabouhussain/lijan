// LIJAN™ — Effective Actor Context
// Central identity layer that provides the "effective actor" for all UI.
// When the exploration session is active it returns the selected governed persona.
// When not, it returns the real authenticated user.
//
// CRITICAL: This layer NEVER modifies the real user's account.
// A persona is a client-side session backed by server-resolved demo records, and every
// session change clears the previous persona's cached context so nothing leaks across.

import React, { createContext, useContext, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { resolveDemoPersona, DEFAULT_DEMO_PERSONA_KEY } from '@/lib/demoPersonas';

const DEMO_SESSION_KEY = 'lijan_demo_session';
const DEFAULT_PERSONA = 'DR_HAMAD_MAJEEGHEER';
const REPAIR_FUNCTION = 'RepairDrHamadDemoExperienceV3';

// Context keys that belong to a persona session — always cleared when the session
// starts, changes persona, or ends. They are caches, never an authority source.
const DEMO_CACHE_KEYS = [
  'activeOrganizationId', 'activeCommitteeId', 'activeMembershipId',
  'activeDemoPersona', 'lastCommitteeRoute', 'committeeQueryCache',
  'raqeem_active_org', 'raqeem_active_committee', 'raqeem_committee_context',
  'ameen_context', 'ameen_context_key', 'national_committee_context',
];
const DEMO_CACHE_PREFIXES = ['raqeem_', 'lijan_demo', 'demo_persona', 'ameen_'];

function clearDemoCaches() {
  DEMO_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
  try {
    Object.keys(localStorage)
      .filter((k) => DEMO_CACHE_PREFIXES.some((p) => k.startsWith(p)))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Storage unavailable — nothing cached to clear.
  }
}

const EffectiveActorContext = createContext();

export const EffectiveActorProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  // Initialize synchronously from localStorage so isDemoMode is correct on first render.
  const [demoSession, setDemoSession] = useState(() => {
    try {
      const raw = localStorage.getItem(DEMO_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.actor_id && parsed.email && parsed.persona_key) return parsed;
        localStorage.removeItem(DEMO_SESSION_KEY);
      }
    } catch {
      localStorage.removeItem(DEMO_SESSION_KEY);
    }
    return null;
  });

  // Enter the governed exploration experience as a chosen persona.
  const enterDemo = useCallback((personaKey = DEFAULT_DEMO_PERSONA_KEY) => {
    const persona = resolveDemoPersona(personaKey) || resolveDemoPersona(DEFAULT_PERSONA);
    // A new persona must never inherit the previous one's cached context.
    if (!demoSession || demoSession.persona_key !== persona.key) clearDemoCaches();

    const session = {
      persona_key: persona.key,
      persona_id: persona.persona_id,
      actor_id: persona.user_id,
      display_name_ar: persona.name_ar,
      display_name_en: persona.name_en,
      email: persona.email,
      job_title_ar: persona.job_title_ar,
      job_title_en: persona.job_title_en,
      job_title_is_demo_wording: persona.job_title_is_demo_wording === true,
      primary_org_ar: persona.primary_org_ar,
      primary_org_en: persona.primary_org_en,
      primary_org_public_id: persona.primary_org_public_id,
      account_classification_ar: persona.account_classification_ar,
      account_classification_en: persona.account_classification_en,
      dataset: persona.dataset,
      is_demo: true,
      demo_session_id: `demo-${Date.now()}`,
      started_at: new Date().toISOString(),
    };
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    setDemoSession(session);

    // Self-heal: the canonical persona's records are repaired idempotently on entry, so the
    // experience always resolves the persisted identity, memberships and role boundaries.
    if (persona.key === DEFAULT_PERSONA) {
      base44.functions
        .invoke(REPAIR_FUNCTION, { demo_mode: true, demo_persona_key: persona.key })
        .catch(() => {});
    }

    // Record the exploration start (fire-and-forget) for admin tracking
    try {
      base44.entities.AuditEvent.create({
        action: 'demo_explore',
        entity_type: 'DemoSession',
        entity_id: session.demo_session_id,
        entity_title: session.display_name_ar,
        actor_user_id: user?.id || 'anonymous',
        actor_name: user?.full_name || 'زائر مجهول',
        actor_email: user?.email || 'anonymous@visitor',
        description: `Demo experience exploration started as ${persona.key}`,
        authority_context: `persona:${persona.key}`,
      });
    } catch (e) {
      // Silent fail — don't block demo entry
    }

    return session;
  }, [user, demoSession]);

  // End the exploration: clear the persona, its organization, its committee, its role and
  // every cached context, then return to the entry screen.
  const exitDemo = useCallback(() => {
    localStorage.removeItem(DEMO_SESSION_KEY);
    clearDemoCaches();
    setDemoSession(null);
  }, []);

  const isDemoMode = !!demoSession;

  // Build the effective actor object
  const effectiveActor = isDemoMode
    ? {
        id: demoSession.actor_id,
        full_name: demoSession.display_name_ar,
        email: demoSession.email,
        role: 'user', // Never 'admin' in exploration mode — no founder privileges
        data: {
          display_name_ar: demoSession.display_name_ar,
          display_name_en: demoSession.display_name_en,
          job_title_ar: demoSession.job_title_ar,
          job_title_en: demoSession.job_title_en,
          job_title_is_demo_wording: demoSession.job_title_is_demo_wording === true,
          primary_org_ar: demoSession.primary_org_ar,
          primary_org_en: demoSession.primary_org_en,
          primary_org_public_id: demoSession.primary_org_public_id,
          account_classification_ar: demoSession.account_classification_ar,
          account_classification_en: demoSession.account_classification_en,
          demo_dataset: demoSession.dataset,
          is_demo_user: true,
          demo_persona_key: demoSession.persona_key,
        },
      }
    : user;

  return (
    <EffectiveActorContext.Provider
      value={{
        effectiveActor,
        isDemoMode,
        demoSession,
        demoPersonaKey: demoSession?.persona_key || null,
        isDrHamadExperience: demoSession?.persona_key === DEFAULT_PERSONA,
        enterDemo,
        exitDemo,
        // The real authenticated user (never replaced by a persona)
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