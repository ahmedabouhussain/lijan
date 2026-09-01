import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// GetCommitteeMiniPortal — verified read for the Committee Mini-Portal Home.
// Verifies committee membership server-side, returns committee + members + meetings + registers.
// All data is committee-scoped (organization_id + committee_id).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { committee_id, public_id } = body;

    let committee;
    if (public_id) {
      const list = await base44.asServiceRole.entities.Committee.filter({ public_id }).catch(() => []);
      committee = (list || [])[0];
    } else if (committee_id) {
      committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    }
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    // Verify org membership
    const orgMemberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id: committee.organization_id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const orgMembership = (orgMemberships || [])[0];

    // Resolve committee membership (effective-dated)
    const cmMemberships = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id: committee.id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const now = new Date().toISOString().split('T')[0];
    const activeMemberships = (cmMemberships || []).filter((m) => {
      if (m.term_start && now < m.term_start) return false;
      if (m.term_end && now > m.term_end) return false;
      return true;
    });

    const isOrgAdmin = orgMembership && (orgMembership.role === 'owner' || orgMembership.role === 'admin');
    const isPlatformAdmin = user.role === 'admin';

    if (!activeMemberships.length && !isOrgAdmin && !isPlatformAdmin) {
      return Response.json({ error: 'Not a member of this committee' }, { status: 403 });
    }

    // Resolve effective role
    let effectiveRole = 'observer';
    let isOversight = false;
    if (activeMemberships.length > 0) {
      const rolePriority = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };
      const sorted = activeMemberships.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
      effectiveRole = sorted[0].role;
    } else if (isOrgAdmin || isPlatformAdmin) {
      effectiveRole = 'oversight';
      isOversight = true;
    }

    // Check recusal
    const recusals = await base44.asServiceRole.entities.Recusal
      .filter({ committee_id: committee.id, member_name: user.full_name || user.email, status: 'active' })
      .catch(() => []);
    const isRecused = (recusals || []).length > 0;

    // Get all members (ordered by role)
    const allMembers = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id: committee.id, status: 'active' })
      .catch(() => []);
    const roleOrder = { chair: 1, vice_chair: 2, secretary: 3, member: 4, alternate: 5, observer: 6, advisor: 7 };
    const orderedMembers = (allMembers || []).sort((a, b) => {
      const r = (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
      if (r !== 0) return r;
      return (a.protocol_order || 99) - (b.protocol_order || 99);
    });

    // Get mandate
    const mandates = await base44.asServiceRole.entities.CommitteeMandate
      .filter({ committee_id: committee.id, status: 'active' })
      .catch(() => []);
    const mandate = (mandates || [])[0];

    // Get meetings
    const meetings = await base44.asServiceRole.entities.Meeting
      .filter({ committee_id: committee.id })
      .catch(() => []);
    const now2 = new Date();
    const upcoming = (meetings || []).filter((m) => new Date(m.date) >= now2).sort((a, b) => new Date(a.date) - new Date(b.date));
    const previous = (meetings || []).filter((m) => new Date(m.date) < now2).sort((a, b) => new Date(b.date) - new Date(a.date));

    // Get registers (committee-scoped)
    const [decisions, actions, minutes, delegations] = await Promise.all([
      base44.asServiceRole.entities.Decision.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.Action.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.MeetingMinutes.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.Delegation.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
    ]);

    // Set user's active context
    await base44.auth.updateMe({ active_org_id: committee.organization_id, active_committee_id: committee.id }).catch(() => {});

    return Response.json({
      committee,
      mandate: mandate || null,
      my_role: effectiveRole,
      is_oversight: isOversight,
      is_recused: isRecused,
      my_memberships: activeMemberships,
      members: orderedMembers,
      meetings: { upcoming, previous, total: (meetings || []).length },
      registers: {
        decisions: decisions || [],
        actions: actions || [],
        minutes: minutes || [],
        delegations: delegations || [],
      },
      counters: {
        members: orderedMembers.length,
        meetings: (meetings || []).length,
        decisions: (decisions || []).length,
        actions: (actions || []).length,
        minutes: (minutes || []).length,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}