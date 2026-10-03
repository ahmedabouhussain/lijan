// LIJAN™ — governed demo persona registry.
//
// Every demonstration persona is resolved through ONE identity path: a virtual user id
// (DEMO-USER-*) plus a demo dataset key. Nothing about a persona is inferred client-side;
// the server resolves memberships, roles and organizations from these two keys only.
//
// There is NO silent fallback: an unknown or missing persona key resolves to null and the
// caller must refuse the request. A fallback is how one persona's data leaks into another's.

import { DEMO_USER, DEMO_USER_ID, DEMO_DATASET } from './demoDataset.ts';
import {
  DR_HAMAD_PERSONA, DR_HAMAD_PERSON_KEY, DR_HAMAD_DATASET, DR_HAMAD_ORGS,
  DR_HAMAD_COMMITTEES, DR_HAMAD_AMEEN_GENERAL, DR_HAMAD_LANDING, ROLE_LABELS,
} from './drHamadDataset.ts';

function drHamadPresentation() {
  const orgContexts = {};
  for (const org of Object.values(DR_HAMAD_ORGS)) orgContexts[org.public_id] = org.context;
  const committees = {};
  for (const def of DR_HAMAD_COMMITTEES) {
    const owning = DR_HAMAD_ORGS[def.owning_org];
    committees[def.public_id] = {
      order: DR_HAMAD_COMMITTEES.indexOf(def) + 1,
      role: def.role,
      role_label_ar: def.role_label_ar || ROLE_LABELS[def.role].ar,
      role_label_en: def.role_label_en || ROLE_LABELS[def.role].en,
      path_role_label_ar: def.path_role_label_ar || def.role_label_ar || ROLE_LABELS[def.role].ar,
      path_role_label_en: def.path_role_label_en || def.role_label_en || ROLE_LABELS[def.role].en,
      owning_org_ar: owning.name_ar,
      owning_org_en: owning.name_en,
      owning_path_ar: owning.context.path_label_ar,
      owning_path_en: owning.context.path_label_en,
      represented_org_ar: DR_HAMAD_PERSONA.primary_org_ar,
      represented_org_en: DR_HAMAD_PERSONA.primary_org_en,
      workstream_ar: def.workstream_ar || null,
      workstream_en: def.workstream_en || null,
      classification: def.classification,
      synthetic_role: def.synthetic_role === true,
      ameen_ar: def.ameen_ar,
      ameen_en: def.ameen_en,
    };
  }
  return {
    org_contexts: orgContexts,
    committees,
    landing: DR_HAMAD_LANDING,
    ameen_general: DR_HAMAD_AMEEN_GENERAL,
  };
}

export const DEMO_PERSONAS = {
  [DEMO_USER.persona_key]: {
    key: DEMO_USER.persona_key,
    persona_id: 'demo-fahad-al-fihaidi',
    user_id: DEMO_USER_ID,
    dataset: DEMO_DATASET,
    email: DEMO_USER.email,
    name_ar: DEMO_USER.name_ar,
    name_en: DEMO_USER.name_en,
    job_title_ar: DEMO_USER.job_title_ar,
    job_title_en: DEMO_USER.job_title_en,
    job_title_is_demo_wording: false,
    primary_org_ar: DEMO_USER.primary_org_ar,
    primary_org_en: DEMO_USER.primary_org_en,
    primary_org_public_id: 'DEMO-ORG-AUDIT-COUNCIL',
    account_classification_ar: 'شخصية عرض تجريبية',
    account_classification_en: 'Demonstration Persona',
    presentation: null,
  },
  DR_HAMAD_MAJEEGHEER: {
    key: 'DR_HAMAD_MAJEEGHEER',
    persona_id: DR_HAMAD_PERSONA.persona_id,
    user_id: DR_HAMAD_PERSON_KEY,
    dataset: DR_HAMAD_DATASET,
    email: DR_HAMAD_PERSONA.email,
    name_ar: DR_HAMAD_PERSONA.name_ar,
    name_en: DR_HAMAD_PERSONA.name_en,
    job_title_ar: DR_HAMAD_PERSONA.job_title_ar,
    job_title_en: DR_HAMAD_PERSONA.job_title_en,
    job_title_is_demo_wording: DR_HAMAD_PERSONA.job_title_is_demo_wording,
    primary_org_ar: DR_HAMAD_PERSONA.primary_org_ar,
    primary_org_en: DR_HAMAD_PERSONA.primary_org_en,
    primary_org_public_id: DR_HAMAD_PERSONA.primary_org_public_id,
    account_classification_ar: DR_HAMAD_PERSONA.account_classification_ar,
    account_classification_en: DR_HAMAD_PERSONA.account_classification_en,
    presentation: drHamadPresentation(),
  },
};

/** Resolve a persona by key. Unknown or missing → null (never a fallback persona). */
export function resolveDemoPersona(key) {
  if (!key || typeof key !== 'string') return null;
  return DEMO_PERSONAS[key] || null;
}

/** Standard refusal for a demo request that carries no valid persona. */
export function unknownPersonaResponse() {
  return Response.json({ error: 'Unknown or missing demo persona', code: 'unknown_persona' }, { status: 400 });
}

/** Persona-safe identity block — never includes another persona's fields. */
export function personaProfile(persona) {
  return {
    persona_key: persona.key,
    persona_id: persona.persona_id,
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
    is_demo_user: true,
    demo_persona_key: persona.key,
  };
}

/** Active, effective-dated memberships of a persona in one committee. */
export async function personaCommitteeMemberships(sr, persona, committeeId) {
  const rows = await sr.entities.CommitteeMembership
    .filter({ committee_id: committeeId, user_id: persona.user_id, status: 'active' })
    .catch(() => []);
  const today = new Date().toISOString().split('T')[0];
  return (rows || []).filter((m) => {
    if (m.term_start && today < m.term_start) return false;
    if (m.term_end && today > m.term_end) return false;
    return true;
  });
}

/** The persona's AuthorityGrant for one committee, evaluated for validity + conflict. */
export async function personaAuthorityGrant(sr, persona, committeeId) {
  const grant = (await sr.entities.AuthorityGrant
    .filter({ committee_id: committeeId, person_key: persona.user_id })
    .catch(() => []))[0] || null;
  if (!grant) return null;
  const today = new Date().toISOString().split('T')[0];
  const inValidity = (!grant.validity_start || today >= grant.validity_start)
    && (!grant.validity_end || today <= grant.validity_end);
  const delegationActive = grant.delegation_status === 'active'
    && (!grant.delegation_valid_from || today >= grant.delegation_valid_from)
    && (!grant.delegation_valid_until || today <= grant.delegation_valid_until);
  return {
    ...grant,
    in_validity: inValidity,
    delegation_active: delegationActive,
    conflicted: grant.conflict_status === 'declared',
  };
}