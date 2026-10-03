import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveDemoPersona } from '../../shared/demoPersonas.ts';

// GetCommitteeMiniPortal — verified read for the Committee Mini-Portal Home.
// Verifies committee membership server-side, returns committee + members + meetings + registers.
// All data is committee-scoped (organization_id + committee_id).
//
// CRITICAL: When demo_mode=true, queries demo data by DEMO_USER_ID
// (NOT the real authenticated user). This ensures demo data is isolated.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { committee_id, public_id, demo_mode, demo_persona } = body;
    const demoMode = demo_mode === true;

    // ── DEMO MODE: resolve the demo persona, then only that persona's demo data ──
    if (demoMode) {
      const persona = resolveDemoPersona(demo_persona);

      let committee;
      if (public_id) {
        const list = await sr.entities.Committee.filter({ public_id, is_demo_data: true, demo_dataset: persona.dataset }).catch(() => []);
        committee = (list || [])[0];
        if (!committee) {
          committee = await sr.entities.Committee.get(public_id).catch(() => null);
          if (committee && (!committee.is_demo_data || committee.demo_dataset !== persona.dataset)) committee = null;
        }
      } else if (committee_id) {
        committee = await sr.entities.Committee.get(committee_id).catch(() => null);
        if (committee && (!committee.is_demo_data || committee.demo_dataset !== persona.dataset)) committee = null;
      }
      if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

      // Demo committee membership
      const cmMemberships = await sr.entities.CommitteeMembership
        .filter({ committee_id: committee.id, user_id: persona.user_id, status: 'active' })
        .catch(() => []);
      const now = new Date().toISOString().split('T')[0];
      const activeMemberships = (cmMemberships || []).filter((m) => {
        if (m.term_start && now < m.term_start) return false;
        if (m.term_end && now > m.term_end) return false;
        return true;
      });

      let effectiveRole = 'observer';
      if (activeMemberships.length > 0) {
        const rolePriority = { chair: 1, vice_chair: 2, secretary: 3, committee_administrator: 4, member: 5, alternate: 6, observer: 7, advisor: 8 };
        const sorted = activeMemberships.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
        effectiveRole = sorted[0].role;
      }

      // Check recusal (by demo user's name)
      const recusals = await sr.entities.Recusal
        .filter({ committee_id: committee.id, status: 'active' })
        .catch(() => []);
      const isRecused = (recusals || []).some((r) => r.member_name === persona.name_ar);

      // All members
      const allMembers = await sr.entities.CommitteeMembership
        .filter({ committee_id: committee.id, status: 'active' })
        .catch(() => []);
      const roleOrder = { chair: 1, vice_chair: 2, secretary: 3, committee_administrator: 4, member: 5, alternate: 6, observer: 7, advisor: 8 };
      const orderedMembers = (allMembers || []).sort((a, b) => {
        const r = (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
        if (r !== 0) return r;
        return (a.protocol_order || 99) - (b.protocol_order || 99);
      });

      // Mandate
      const mandates = await sr.entities.CommitteeMandate
        .filter({ committee_id: committee.id, status: 'active' })
        .catch(() => []);
      const mandate = (mandates || [])[0];

      // Meetings
      const meetings = await sr.entities.Meeting
        .filter({ committee_id: committee.id })
        .catch(() => []);
      const now2 = new Date();
      const upcoming = (meetings || []).filter((m) => new Date(m.date) >= now2).sort((a, b) => new Date(a.date) - new Date(b.date));
      const previous = (meetings || []).filter((m) => new Date(m.date) < now2).sort((a, b) => new Date(b.date) - new Date(a.date));

      // Registers
      const [decisions, actions, minutes, delegations] = await Promise.all([
        sr.entities.Decision.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.Action.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.MeetingMinutes.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.Delegation.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
      ]);

      return Response.json({
        committee,
        mandate: mandate || null,
        my_role: effectiveRole,
        is_oversight: false,
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
        is_demo_mode: true,
      });
    }

    // ── NORMAL MODE: Real authenticated user ──
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let committee;
    if (public_id) {
      // Try public_id first
      const list = await base44.asServiceRole.entities.Committee.filter({ public_id }).catch(() => []);
      committee = (list || [])[0];
      // Fallback: try by committee ID (for records without public_id)
      if (!committee) {
        committee = await base44.asServiceRole.entities.Committee.get(public_id).catch(() => null);
      }
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

    // Resolve effective role from active backend assignments.
    // No more oversight fallback — authority comes from stored CommitteeMembership records.
    let effectiveRole = 'observer';
    let isOversight = false;
    if (activeMemberships.length > 0) {
      const rolePriority = { chair: 1, vice_chair: 2, secretary: 3, committee_administrator: 4, member: 5, alternate: 6, observer: 7, advisor: 8 };
      const sorted = activeMemberships.sort((a, b) => (rolePriority[a.role] || 99) - (rolePriority[b.role] || 99));
      effectiveRole = sorted[0].role;
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
    const roleOrder = { chair: 1, vice_chair: 2, secretary: 3, committee_administrator: 4, member: 5, alternate: 6, observer: 7, advisor: 8 };
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