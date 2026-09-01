// ResolveEffectiveAuthority — the reusable server-side authority kernel.
// Imported by every governed backend command. Never trusts client-supplied role/org/committee.
//
// Usage:
//   import { resolveAuthority } from "../../shared/authorityKernel.ts";
//   const auth = await resolveAuthority(base44, { committee_id, capability: "committee.activate" });
//   if (!auth.allowed) return Response.json({ error: auth.reason }, { status: 403 });

export async function resolveAuthority(base44, opts) {
  const { committee_id, organization_id, capability } = opts;
  const user = await base44.auth.me();
  if (!user) return { allowed: false, reason: "Unauthorized", status: 401, user: null };

  // Platform admins bypass membership checks but still get logged
  if (user.role === "admin") {
    // Resolve organization_id from committee if not explicitly provided
    let resolvedOrgId = organization_id || null;
    if (!resolvedOrgId && committee_id) {
      const committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
      if (committee) resolvedOrgId = committee.organization_id;
    }
    return {
      allowed: true,
      user,
      organization_id: resolvedOrgId,
      committee_id: committee_id || null,
      effective_role: "platform_admin",
      authority_context: "platform_admin",
      correlation_id: generateCorrelationId(),
    };
  }

  // Resolve active organization from user profile (context only — not authorization)
  const activeOrgId = organization_id || user.active_org_id;
  if (!activeOrgId) {
    return { allowed: false, reason: "No active organization context", status: 403, user };
  }

  // Verify organization membership
  const memberships = await base44.asServiceRole.entities.OrganizationMembership
    .filter({ organization_id: activeOrgId, user_id: user.id, status: "active" })
    .catch(() => []);
  const orgMembership = (memberships || [])[0];
  if (!orgMembership) {
    return { allowed: false, reason: "Not a member of this organization", status: 403, user };
  }

  // Check organization status (suspended orgs block operational access)
  const org = await base44.asServiceRole.entities.Organization.get(activeOrgId).catch(() => null);
  if (!org || org.status === "suspended" || org.status === "closed") {
    return { allowed: false, reason: "Organization is not operational", status: 403, user, organization_id: activeOrgId };
  }

  // If no committee context, return org-level authority
  if (!committee_id) {
    return {
      allowed: true,
      user,
      organization_id: activeOrgId,
      committee_id: null,
      effective_role: orgMembership.role,
      authority_context: `org:${orgMembership.role}`,
      correlation_id: generateCorrelationId(),
    };
  }

  // Verify committee belongs to this organization
  const committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
  if (!committee || committee.organization_id !== activeOrgId) {
    return { allowed: false, reason: "Committee not found in this organization", status: 404, user, organization_id: activeOrgId };
  }

  // Resolve committee membership (effective-dated)
  const cmMemberships = await base44.asServiceRole.entities.CommitteeMembership
    .filter({ committee_id, user_id: user.id, status: "active" })
    .catch(() => []);
  const activeMemberships = (cmMemberships || []).filter((m) => {
    const now = new Date().toISOString().split("T")[0];
    if (m.term_start && now < m.term_start) return false;
    if (m.term_end && now > m.term_end) return false;
    return true;
  });

  if (activeMemberships.length === 0) {
    // Org admin/owner oversight is read-only — no committee operational authority
    if (orgMembership.role === "owner" || orgMembership.role === "admin") {
      return {
        allowed: isReadOnlyCapability(capability),
        user,
        organization_id: activeOrgId,
        committee_id,
        effective_role: "oversight",
        authority_context: "org_admin_oversight_read_only",
        correlation_id: generateCorrelationId(),
        reason: isReadOnlyCapability(capability) ? null : "Administrative oversight is read-only",
      };
    }
    return { allowed: false, reason: "Not a member of this committee", status: 403, user, organization_id: activeOrgId, committee_id };
  }

  // Check for active recusal on this committee
  const recusals = await base44.asServiceRole.entities.Recusal
    .filter({ committee_id, member_name: user.full_name || user.email, status: "active" })
    .catch(() => []);

  // Resolve effective role from memberships (highest authority wins)
  const rolePriority = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };
  const sortedMemberships = activeMemberships.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
  const primaryMembership = sortedMemberships[0];
  const effectiveRole = primaryMembership.role;

  // Check recusal for sensitive capabilities
  const recused = (recusals || []).length > 0;
  if (recused && isVotingCapability(capability)) {
    return { allowed: false, reason: "Member is recused from this committee", status: 403, user, organization_id: activeOrgId, committee_id, effective_role: effectiveRole };
  }

  // Check capability against role
  if (!hasCapability(effectiveRole, capability)) {
    return { allowed: false, reason: `Role '${effectiveRole}' does not have capability '${capability}'`, status: 403, user, organization_id: activeOrgId, committee_id, effective_role: effectiveRole };
  }

  return {
    allowed: true,
    user,
    organization_id: activeOrgId,
    committee_id,
    effective_role: effectiveRole,
    authority_context: `committee:${effectiveRole}`,
    correlation_id: generateCorrelationId(),
    membership: primaryMembership,
  };
}

function isReadOnlyCapability(cap) {
  if (!cap) return true;
  return ["read", "view", "audit.read", "report.export"].includes(cap);
}

function isVotingCapability(cap) {
  return ["vote.cast", "vote.call", "vote.certify"].includes(cap);
}

function hasCapability(role, capability) {
  const roleCapabilities = {
    chair: ["committee.activate", "committee.manage", "agenda.approve", "meeting.start", "vote.call", "vote.certify", "decision.issue", "decision.sign", "minutes.approve", "escalation.approve", "committee.close", "read", "audit.read", "report.export"],
    vice_chair: ["committee.activate", "agenda.approve", "meeting.start", "vote.call", "vote.certify", "decision.issue", "decision.sign", "minutes.approve", "read", "audit.read"],
    secretary: ["meeting.schedule", "agenda.edit", "minutes.draft", "minutes.review", "attendance.certify", "action.admin", "read", "audit.read"],
    member: ["agenda.propose", "vote.cast", "decision.sign", "comment.shared", "read"],
    alternate: ["read"], // activated alternates get member capabilities via AlternateActivation
    observer: ["read"],
    advisor: ["read", "comment.shared"],
    auditor: ["read", "audit.read", "report.export"],
  };
  const caps = roleCapabilities[role] || [];
  return caps.includes(capability);
}

function generateCorrelationId() {
  return "corr_" + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}