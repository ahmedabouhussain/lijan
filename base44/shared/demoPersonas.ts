// LIJAN™ — governed demo persona registry.
//
// Every demonstration persona is resolved through ONE identity path — the same path the
// platform demo user already uses: a virtual user id (DEMO-USER-*) plus a demo dataset key.
// Nothing about a persona is inferred client-side; the server resolves memberships, roles
// and organizations from these two keys only.
//
// Adding a persona means adding an entry here and provisioning its data with its own
// dataset key — never a bespoke route, page set or data function.

import { DEMO_USER, DEMO_USER_ID, DEMO_DATASET } from './demoDataset.ts';
import { DR_HAMAD_PERSONA, DR_HAMAD_PERSON_KEY, DR_HAMAD_DATASET } from './drHamadDataset.ts';

export const DEMO_PERSONAS = {
  [DEMO_USER.persona_key]: {
    key: DEMO_USER.persona_key,
    user_id: DEMO_USER_ID,
    dataset: DEMO_DATASET,
    email: DEMO_USER.email,
    name_ar: DEMO_USER.name_ar,
    name_en: DEMO_USER.name_en,
    job_title_ar: DEMO_USER.job_title_ar,
    job_title_en: DEMO_USER.job_title_en,
    primary_org_ar: DEMO_USER.primary_org_ar,
    primary_org_en: DEMO_USER.primary_org_en,
    primary_org_public_id: 'DEMO-ORG-AUDIT-COUNCIL',
  },
  DR_HAMAD_MAJEEGHEER: {
    key: 'DR_HAMAD_MAJEEGHEER',
    user_id: DR_HAMAD_PERSON_KEY,
    dataset: DR_HAMAD_DATASET,
    email: DR_HAMAD_PERSONA.email,
    name_ar: DR_HAMAD_PERSONA.name_ar,
    name_en: DR_HAMAD_PERSONA.name_en,
    job_title_ar: DR_HAMAD_PERSONA.job_title_ar,
    job_title_en: DR_HAMAD_PERSONA.job_title_en,
    primary_org_ar: DR_HAMAD_PERSONA.primary_org_ar,
    primary_org_en: DR_HAMAD_PERSONA.primary_org_en,
    primary_org_public_id: DR_HAMAD_PERSONA.primary_org_public_id,
  },
};

export const DEFAULT_DEMO_PERSONA_KEY = DEMO_USER.persona_key;

/** Resolve a persona by key. An unknown or missing key falls back to the platform demo persona. */
export function resolveDemoPersona(key) {
  return DEMO_PERSONAS[key] || DEMO_PERSONAS[DEFAULT_DEMO_PERSONA_KEY];
}