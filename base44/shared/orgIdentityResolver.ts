// orgIdentityResolver.ts — Shared organization identity resolution logic.
// Used by ResolveOrganizationIdentity, ProvisionOrganizationPortal, MergeDuplicateOrganizations.
//
// Core principle: directory_key is the canonical institutional identity.
// One active Organization per directory_key — no matter the name variant, slug, or user.

// Normalize Arabic: unify alef variants, remove diacritics, strip tatweel, normalize ya/ta marbuta
export function normalizeAr(s: string): string {
  if (!s) return "";
  return String(s)
    .replace(/[\u064B-\u065F\u0670]/g, "") // diacritics (harakat)
    .replace(/\u0640/g, "") // tatweel/kashida
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

// Normalize English: lowercase, collapse spaces, trim
export function normalizeEn(s: string): string {
  if (!s) return "";
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Extract domain from email
export function extractDomain(email: string): string {
  if (!email) return "";
  const parts = String(email).toLowerCase().split("@");
  return parts.length > 1 ? parts[parts.length - 1].trim() : "";
}

// Check if two normalized names are similar enough to be a possible duplicate
export function isPossibleDuplicate(ar1: string, en1: string, ar2: string, en2: string): boolean {
  const nar1 = normalizeAr(ar1);
  const nar2 = normalizeAr(ar2);
  const nen1 = normalizeEn(en1);
  const nen2 = normalizeEn(en2);

  // Exact normalized match
  if (nar1 && nar1 === nar2) return true;
  if (nen1 && nen1 === nen2) return true;

  // One is substring of the other (e.g. "وزارة المعرفة" vs "وزارة المعرفة والتعليم")
  if (nar1 && nar2 && (nar1.includes(nar2) || nar2.includes(nar1)) && Math.abs(nar1.length - nar2.length) < 15) return true;
  if (nen1 && nen2 && (nen1.includes(nen2) || nen2.includes(nen1)) && Math.abs(nen1.length - nen2.length) < 15) return true;

  return false;
}

// Resolution result types
export type ResolutionResult =
  | "available"
  | "existing_verified"
  | "existing_unverified"
  | "membership_exists"
  | "access_request_pending"
  | "possible_duplicate"
  | "blocked";

export interface IdentityResolution {
  result: ResolutionResult;
  directory_key?: string;
  organization?: {
    id: string;
    name_ar: string;
    name_en: string;
    slug: string;
    public_id: string;
    status: string;
    owner_name: string;
    portal_url: string;
  };
  membership?: {
    role: string;
    status: string;
  };
  access_request?: {
    id: string;
    status: string;
  };
  possible_duplicates?: Array<{
    id: string;
    name_ar: string;
    name_en: string;
    slug: string;
    public_id: string;
    status: string;
    portal_url: string;
  }>;
  reason?: string;
}