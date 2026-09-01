// amendmentApplier.ts — shared amendment application logic.
// Imported by ApproveCommitteeAmendment (user-triggered) and
// ApplyScheduledAmendments (workflow-triggered for future-effective amendments).
//
// This module applies the actual changes encoded in amendment.after_state
// to the Committee and CommitteeMembership entities, then creates a
// non-destructive Formation Version snapshot. It does NOT do auth, audit,
// or notification — those are caller-specific responsibilities.

import { createFormationVersion } from "./formationVersioner.ts";

export async function applyAmendmentChanges(base44, opts) {
  const { amendment, organization_id, effective_date, approving_authority } = opts;
  const today = effective_date || amendment.effective_date || new Date().toISOString().split("T")[0];
  const afterState = amendment.after_state ? JSON.parse(amendment.after_state) : {};

  const committee = await base44.asServiceRole.entities.Committee.get(amendment.committee_id);

  // Rename
  if (["rename", "change_arabic_name", "change_english_name"].includes(amendment.amendment_type)) {
    const updates = {};
    if (afterState.name_ar) updates.name_ar = afterState.name_ar;
    if (afterState.name_en) updates.name_en = afterState.name_en;
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Committee.update(amendment.committee_id, updates);
    }
  }

  // Mandate / scope / reporting
  if (["add_mandate", "remove_mandate", "amend_mandate", "change_authority_level", "change_reporting_authority"].includes(amendment.amendment_type)) {
    const updates = {};
    if (afterState.mandate !== undefined) updates.mandate = afterState.mandate;
    if (afterState.scope !== undefined) updates.scope = afterState.scope;
    if (afterState.reporting_authority !== undefined) updates.reporting_authority = afterState.reporting_authority;
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Committee.update(amendment.committee_id, updates);
    }
  }

  // Quorum / voting / classification / term
  if (["change_quorum", "change_voting_rule", "change_classification", "change_term"].includes(amendment.amendment_type)) {
    const updates = {};
    if (afterState.quorum_count !== undefined) updates.quorum_count = afterState.quorum_count;
    if (afterState.voting_rule !== undefined) updates.voting_rule = afterState.voting_rule;
    if (afterState.classification !== undefined) updates.classification = afterState.classification;
    if (afterState.term_start !== undefined) updates.term_start = afterState.term_start;
    if (afterState.term_end !== undefined) updates.term_end = afterState.term_end;
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.Committee.update(amendment.committee_id, updates);
    }
  }

  // Members: add / replace / reconstitute
  if (["add_member", "replace_member", "reconstitute"].includes(amendment.amendment_type)) {
    if (amendment.amendment_type === "reconstitute") {
      const current = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id: amendment.committee_id, status: "active" }).catch(() => []);
      for (const m of (current || [])) {
        await base44.asServiceRole.entities.CommitteeMembership.update(m.id, {
          status: "resigned",
          term_end: today,
          end_reason: "إعادة تشكيل",
          end_source_instrument_ref: amendment.source_instrument_ref || null,
          end_source_instrument_id: amendment.source_instrument_id || null,
          ended_at: new Date().toISOString(),
        });
      }
    }
    for (const m of (afterState.members || [])) {
      if (!m.full_name || !m.role) continue;
      await base44.asServiceRole.entities.CommitteeMembership.create({
        organization_id,
        committee_id: amendment.committee_id,
        full_name: m.full_name,
        full_name_ar: m.full_name_ar || null,
        user_email: m.email || null,
        role: m.role,
        authority_level: m.authority_level || "decision",
        voting_right: !["observer", "advisor"].includes(m.role),
        status: "active",
        institution_name: m.institution_name || null,
        term_start: today,
        term_end: null,
        protocol_order: m.protocol_order || 99,
      });
    }
  }

  // End member (non-destructive)
  if (amendment.amendment_type === "end_member" && afterState.membership_id) {
    await base44.asServiceRole.entities.CommitteeMembership.update(afterState.membership_id, {
      status: "resigned",
      term_end: today,
      end_reason: amendment.description || "إنهاء عضوية",
      end_source_instrument_ref: amendment.source_instrument_ref || null,
      end_source_instrument_id: amendment.source_instrument_id || null,
      ended_at: new Date().toISOString(),
    });
  }

  // Change role
  if (amendment.amendment_type === "change_role" && afterState.membership_id && afterState.new_role) {
    await base44.asServiceRole.entities.CommitteeMembership.update(afterState.membership_id, {
      role: afterState.new_role,
    });
  }

  // Create formation version snapshot
  const formationVersion = await createFormationVersion(base44, {
    committee_id: amendment.committee_id,
    organization_id,
    effective_date: today,
    source_instrument_id: amendment.source_instrument_id,
    source_instrument_ref: amendment.source_instrument_ref,
    amendment_id: amendment.id,
    reason_for_change: amendment.description || amendment.amendment_type,
    approving_authority: approving_authority || "system",
  });

  return { formationVersion, committee, today };
}