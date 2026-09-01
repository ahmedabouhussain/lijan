// formationVersioner.ts — creates effective-dated formation version snapshots.
// Imported by EndCommitteeMembership, ApproveCommitteeAmendment, and any
// governed change that must preserve historical formation state.
//
// Usage:
//   import { createFormationVersion } from "../../shared/formationVersioner.ts";
//   const version = await createFormationVersion(base44, { committee_id, organization_id, ... });

export async function createFormationVersion(base44, opts) {
  const {
    committee_id,
    organization_id,
    effective_date,
    source_instrument_id,
    source_instrument_ref,
    amendment_id,
    reason_for_change,
    approving_authority,
  } = opts;

  const today = effective_date || new Date().toISOString().split("T")[0];

  // Get current active members
  const activeMembers = await base44.asServiceRole.entities.CommitteeMembership
    .filter({ committee_id, status: "active" })
    .catch(() => []);

  // Mark previous current version(s) as superseded
  const previousVersions = await base44.asServiceRole.entities.CommitteeFormationVersion
    .filter({ committee_id, is_current: true })
    .catch(() => []);

  let nextVersionNumber = 1;
  for (const v of (previousVersions || [])) {
    await base44.asServiceRole.entities.CommitteeFormationVersion.update(v.id, {
      is_current: false,
      status: "superseded",
      end_date: today,
    });
    if (v.version_number >= nextVersionNumber) nextVersionNumber = v.version_number + 1;
  }

  // Find chair for display
  const chair = (activeMembers || []).find((m) => m.role === "chair");

  // Create snapshot of current formation
  const snapshot = (activeMembers || []).map((m) => ({
    membership_id: m.id,
    full_name: m.full_name,
    full_name_ar: m.full_name_ar,
    role: m.role,
    authority_level: m.authority_level,
    institution_name: m.institution_name,
    voting_right: m.voting_right,
    term_start: m.term_start,
    term_end: m.term_end,
  }));

  const version = await base44.asServiceRole.entities.CommitteeFormationVersion.create({
    organization_id,
    committee_id,
    version_number: nextVersionNumber,
    effective_date: today,
    end_date: null,
    source_instrument_id: source_instrument_id || null,
    source_instrument_ref: source_instrument_ref || null,
    amendment_id: amendment_id || null,
    reason_for_change: reason_for_change || null,
    approving_authority: approving_authority || null,
    formation_snapshot: JSON.stringify(snapshot),
    member_count: snapshot.length,
    chair_name: chair?.full_name || null,
    is_current: true,
    status: "active",
  });

  return version;
}