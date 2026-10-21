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
import { useLanguage } from '@/lib/LanguageContext';

const DEMO_SESSION_KEY = 'lijan_demo_session';
const DEFAULT_PERSONA = 'DR_HAMAD_MAJEEGHEER';


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
  // Storage can be refused outright (an embedded/preview frame, a locked-down browser). Clearing
  // a cache is housekeeping, never a precondition for entering: it must not throw.
  try {
    DEMO_CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
    Object.keys(localStorage)
      .filter((k) => DEMO_CACHE_PREFIXES.some((p) => k.startsWith(p)))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // Storage unavailable — nothing cached to clear.
  }
}

// Build the stored exploration session from a SERVER-ISSUED payload. Every field that carries
// authority — dataset, committee scope, expiry, token — is the server's, verbatim; the persona
// contributes presentation labels only. An unknown persona is refused, never guessed.
function sessionFrom(persona, issued) {
  if (!persona || !issued?.showcase_token) return null;
  return {
    persona_key: issued.persona_key || persona.key,
    persona_id: issued.persona_id || persona.persona_id,
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
    dataset: issued.dataset || persona.dataset,
    is_demo: true,
    demo_session_id: issued.session_id,
    showcase_token: issued.showcase_token,
    showcase_expires_at: issued.expires_at,
    allowed_committee_public_ids: issued.allowed_committee_public_ids || [],
    data_class: issued.data_class,
    write_scope: issued.write_scope || 'none',
    started_at: new Date().toISOString(),
  };
}

const EffectiveActorContext = createContext();

export const EffectiveActorProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  // The demonstration identity is bilingual in the registry; the ACTIVE language's own edition
  // is the one shown. Language is presentation only — it never touches the session or authority.
  const { lang } = useLanguage();
  // Initialize synchronously from localStorage so isDemoMode is correct on first render.
  const [demoSession, setDemoSession] = useState(() => {
    try {
      // The session token lives in sessionStorage, not localStorage: it dies with the tab, is not
      // shared with other tabs, and is never written into a URL, a query string, a log or an audit
      // record. REMAINING PLATFORM CONSTRAINT: a static SPA cannot set an HttpOnly cookie, so the
      // token is still readable by this app's own JavaScript — the server-side short expiry (120
      // minutes) and the revoke-on-exit path are what bound that exposure.
      const raw = sessionStorage.getItem(DEMO_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // A session without a live server-issued token is not a session.
        if (
          parsed
          && parsed.actor_id
          && parsed.persona_key
          && parsed.showcase_token
          && parsed.showcase_expires_at
          && new Date(parsed.showcase_expires_at).getTime() > Date.now()
        ) return parsed;
        sessionStorage.removeItem(DEMO_SESSION_KEY);
      }
    } catch {
      sessionStorage.removeItem(DEMO_SESSION_KEY);
    }
    return null;
  });

  // Enter the governed exploration experience as a chosen persona.
  // The session is ISSUED BY THE SERVER: this client holds a short-lived, revocable showcase
  // token — never a role, an organization or a user session.
  const enterDemo = useCallback(async (personaKey = DEFAULT_DEMO_PERSONA_KEY) => {
    const persona = resolveDemoPersona(personaKey) || resolveDemoPersona(DEFAULT_PERSONA);
    if (!persona) return null;
    // A new persona must never inherit the previous one's cached context.
    if (!demoSession || demoSession.persona_key !== persona.key) clearDemoCaches();

    let issued = null;
    try {
      const res = await base44.functions.invoke('EnterExploration', {
        persona_key: persona.key,
        entry_point: window.location.pathname,
      });
      issued = res?.data || res;
    } catch {
      issued = null;
    }
    if (!issued?.showcase_token) return null;

    const session = sessionFrom(persona, issued);
    if (!session) return null;
    // Persisting the session is an optimisation for a reload, not the session itself: a storage
    // refusal must not discard a session the server has already issued.
    try {
      sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Storage unavailable — the session lives in memory for this tab.
    }
    setDemoSession(session);

    // Exploration never provisions or repairs operational records.

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
    } catch {
      // Silent fail — don't block demo entry
    }

    return session;
  }, [user, demoSession]);

  // Adopt a session the SERVER has already issued — the transition gate's path into exploration.
  // The persona is read from the issued payload, so the surface that called this never chooses one.
  const adoptDemoSession = useCallback((issued) => {
    const persona = resolveDemoPersona(issued?.persona_key);
    const session = sessionFrom(persona, issued);
    if (!session) return null;
    // A new persona must never inherit the previous one's cached context.
    if (!demoSession || demoSession.persona_key !== session.persona_key) clearDemoCaches();
    sessionStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    setDemoSession(session);
    return session;
  }, [demoSession]);

  // Renew the exploration session in place.
  // The session token is short-lived by design, and a visitor who is still exploring must not be
  // thrown out when it lapses. A NEW server session is issued for the SAME persona — the persona
  // roster is never the authority, the new token is. If the server refuses, the caller is told.
  const renewDemo = useCallback(async () => {
    const personaKey = demoSession?.persona_key;
    if (!personaKey) return null;
    const session = await enterDemo(personaKey);
    return session?.showcase_token || null;
  }, [demoSession, enterDemo]);

  // End the exploration: clear the persona, its organization, its committee, its role and
  // every cached context, then return to the entry screen.
  const exitDemo = useCallback(() => {
    // End it on the server too: a revoked token stops working immediately.
    const token = demoSession?.showcase_token;
    if (token) {
      base44.functions
        .invoke('RevokeShowcaseSession', { showcase_token: token, reason: 'exit' })
        .catch(() => {});
    }
    sessionStorage.removeItem(DEMO_SESSION_KEY);
    clearDemoCaches();
    setDemoSession(null);
  }, [demoSession]);

  const isDemoMode = !!demoSession;

  // Build the effective actor object
  const effectiveActor = isDemoMode
    ? {
        id: demoSession.actor_id,
        full_name: lang === 'ar' ? demoSession.display_name_ar : demoSession.display_name_en,
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
        showcaseToken: demoSession?.showcase_token || null,
        isDrHamadExperience: demoSession?.persona_key === DEFAULT_PERSONA,
        enterDemo,
        adoptDemoSession,
        renewDemo,
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