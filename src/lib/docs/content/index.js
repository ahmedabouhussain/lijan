/**
 * LIJAN™ Documentation Content — Master Index
 *
 * Aggregates all document content from category modules.
 * Used by generators to produce actual files.
 */

import { masterIndex, executivePresentation, executiveDossier, kpiFramework, demoSpeakerNotes } from "./executive";
import { capabilityCatalogue, operatingModel, roleGuide, systemAdminRunbook } from "./platform";
import { itGuide, securityGuide, implementationPlan, supportGuide } from "./technical";
import { templatesContent } from "./templates";

/**
 * Map of document ID → content.
 * Sections-based documents use { sections: [...] }.
 * Presentation uses { slides: [...] }.
 * Templates use { sheets: [...] }.
 */
export const DOCUMENT_CONTENT = {
  "master-index": masterIndex,
  "executive-presentation": executivePresentation,
  "executive-dossier": executiveDossier,
  "kpi-framework": kpiFramework,
  "demo-speaker-notes": demoSpeakerNotes,
  "capability-catalogue": capabilityCatalogue,
  "operating-model": operatingModel,
  "role-guide": roleGuide,
  "system-admin-runbook": systemAdminRunbook,
  "it-guide": itGuide,
  "security-guide": securityGuide,
  "implementation-plan": implementationPlan,
  "support-guide": supportGuide,
  "templates-pack": templatesContent,
};

/**
 * Get content for a document by ID.
 */
export function getDocumentContent(docId) {
  return DOCUMENT_CONTENT[docId] || null;
}