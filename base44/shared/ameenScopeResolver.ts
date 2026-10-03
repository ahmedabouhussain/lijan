// ameenScopeResolver.ts — shared scope resolution for the single assistant «أمين».
// The client states WHERE the user is; this module decides which records that scope
// actually maps to. Used by ResolveAmeenContext, GetAmeenSandboxData and LogAmeenAction
// so scope rules are never duplicated between functions.

import { DEMO_USER, DEMO_DATASET } from './demoDataset.ts';
import { resolveDemoPersona } from './demoPersonas.ts';

// Legacy single-persona constants (the platform exploration persona). New callers pass an
// explicit persona; when none is given these keep the historical behaviour intact.
export const DEMO_PERSONA_KEY = DEMO_USER.persona_key;
export const DEMO_PERSONA_USER_ID = DEMO_USER.user_id;
export const DEMO_PERSONA_NAME_AR = DEMO_USER.name_ar;
export const DEMO_PERSONA_EMAIL = DEMO_USER.email;

/** Resolve the exploration persona of a request. No silent fallback to another persona. */
export function resolveSandboxPersona(personaKey) {
  return resolveDemoPersona(personaKey || DEMO_PERSONA_KEY);
}

function sandboxDatasetOf(persona) {
  return persona ? persona.dataset : DEMO_DATASET;
}

function sandboxUserIdOf(persona) {
  return persona ? persona.user_id : DEMO_PERSONA_USER_ID;
}

/** Resolve an organization by public_id → slug → id. */
export async function resolveOrganization(base44, orgRef) {
  if (!orgRef) return null;

  const publicId = String(orgRef).split('--').pop();
  const byPublic = await base44.asServiceRole.entities.Organization
    .filter({ public_id: publicId }).catch(() => []);
  if (byPublic && byPublic.length > 0) return byPublic[0];

  const bySlug = await base44.asServiceRole.entities.Organization
    .filter({ slug: orgRef }).catch(() => []);
  if (bySlug && bySlug.length > 0) return bySlug[0];

  return await base44.asServiceRole.entities.Organization
    .get(orgRef).catch(() => null);
}

/** Resolve a committee by public_id → slug → id. */
export async function resolveCommittee(base44, committeeRef) {
  if (!committeeRef) return null;

  const publicId = String(committeeRef).split('--').pop();
  const byPublic = await base44.asServiceRole.entities.Committee
    .filter({ public_id: publicId }).catch(() => []);
  if (byPublic && byPublic.length > 0) return byPublic[0];

  const bySlug = await base44.asServiceRole.entities.Committee
    .filter({ slug: committeeRef }).catch(() => []);
  if (bySlug && bySlug.length > 0) return bySlug[0];

  return await base44.asServiceRole.entities.Committee
    .get(committeeRef).catch(() => null);
}

/** Resolve an organization + committee pair from the route refs. */
export async function resolveScope(base44, { orgRef, committeeRef }) {
  let organization = await resolveOrganization(base44, orgRef);
  const committee = await resolveCommittee(base44, committeeRef);

  if (committee && !organization) {
    organization = await base44.asServiceRole.entities.Organization
      .get(committee.organization_id).catch(() => null);
  }

  return { organization, committee };
}

// ── Sandbox (demo) scope ───────────────────────────────────────────────────────
// Demo data is a separate dataset keyed to a virtual persona, never to a real user.

/** A committee belongs to the persona's sandbox dataset — never a real, governed committee. */
export function isSandboxCommittee(committee, persona = null) {
  return !!committee
    && committee.is_demo_data === true
    && committee.demo_dataset === sandboxDatasetOf(persona);
}

/** An organization belongs to the persona's sandbox dataset. */
export function isSandboxOrganization(organization, persona = null) {
  return !!organization
    && organization.is_demo_data === true
    && organization.demo_dataset === sandboxDatasetOf(persona);
}

/** The sandbox persona's office inside a sandbox committee. */
export async function resolveSandboxCommitteeRole(base44, committee, persona = null) {
  if (!isSandboxCommittee(committee, persona)) return null;

  const rows = await base44.asServiceRole.entities.CommitteeMembership
    .filter({
      committee_id: committee.id,
      user_id: sandboxUserIdOf(persona),
      status: 'active',
    }).catch(() => []);

  const membership = (rows || [])[0] || null;
  return membership ? membership.role : null;
}

/** The sandbox persona's office at the organization level (admin | member | …). */
export async function resolveSandboxOrganizationRole(base44, organization, persona = null) {
  if (!isSandboxOrganization(organization, persona)) return null;

  const rows = await base44.asServiceRole.entities.OrganizationMembership
    .filter({
      organization_id: organization.id,
      user_id: sandboxUserIdOf(persona),
      status: 'active',
    }).catch(() => []);

  const membership = (rows || [])[0] || null;
  if (!membership) return null;
  return (membership.role === 'owner' || membership.role === 'admin') ? 'org_admin' : membership.role;
}

/** Compact, ID-free scope descriptor safe to hand to a presentation layer. */
export function describeOrganization(organization) {
  if (!organization) return null;
  return {
    id: organization.id,
    name_ar: organization.name_ar,
    name_en: organization.name_en,
    type: organization.type,
    status: organization.status,
  };
}

export function describeCommittee(committee) {
  if (!committee) return null;
  return {
    id: committee.id,
    public_id: committee.public_id,
    name_ar: committee.name_ar,
    name_en: committee.name_en,
    type: committee.type,
    status: committee.status,
    classification: committee.classification,
    organization_id: committee.organization_id,
  };
}