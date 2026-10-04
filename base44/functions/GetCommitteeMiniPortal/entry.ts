import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { resolveDemoPersona } from '../../shared/demoPersonas.ts';
import { buildOrgAssetIndex } from '../../shared/orgAssets.ts';
import { resolveMyReviewTasks } from '../../shared/reviewTasks.ts';
import { verifyShowcaseSession } from '../../shared/showcaseSession.ts';

// GetCommitteeMiniPortal — verified read for the Committee Mini-Portal Home.
// Verifies committee membership server-side, returns committee + members + meetings + registers.
// All data is committee-scoped (organization_id + committee_id).
//
// CRITICAL: When demo_mode=true, queries demo data by DEMO_USER_ID
// (NOT the real authenticated user). This ensures demo data is isolated.

// Resolve the institutional identity (name + approved logo) of every organization referenced by
// the committee's members, workstreams and workstream memberships — ONE directory map for the
// whole committee context, never a per-screen lookup and never a hardcoded logo.
async function buildOrgIndex(sr: any, ids: any[]) {
  const unique = [...new Set((ids || []).filter(Boolean))] as string[];
  const index: Record<string, any> = {};
  // ONE registry lookup for the whole committee context — never a per-screen logo query.
  const assetIndex = await buildOrgAssetIndex(sr, unique);
  await Promise.all(unique.map(async (id) => {
    const org = await sr.entities.Organization.get(id).catch(() => null);
    if (org) {
      const slot = assetIndex[id] || {};
      // The registry's approved + activated asset is the runtime source; the organization
      // record is the fallback. A page never hotlinks an official website.
      const primary = slot.primary?.stored_path || org.logo_url || null;
      // The reversed edition is a SEPARATE approved asset — never the primary re-used under
      // another name. When the registry holds no on_dark edition this stays null, so a dark
      // ground falls back to a clean light plate and keeps the official colours intact instead
      // of rendering a dark mark on a near-black plate.
      const onDarkEdition = slot.on_dark?.stored_path || null;
      index[id] = {
        id: org.id,
        public_id: org.public_id || null,
        slug: org.slug || null,
        name_ar: org.name_ar,
        name_en: org.name_en,
        // Each background tone resolves its own edition, so a dark ground never gets the
        // primary mark and vice versa.
        logo_url: primary,
        logo_on_dark_url: onDarkEdition,
        asset_version: slot.primary?.version || null,
        asset_version_on_dark: slot.on_dark?.version || null,
      };
    }
  }));
  return index;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const { committee_id, public_id, demo_mode, demo_persona, showcase_token } = body;
    const demoMode = demo_mode === true;

    // ── SHOWCASE: the principal is a server-issued session; a persona is resolved FROM it. ──
    // The token is verified on the server, and the persona, dataset and committee scope it carries
    // are the only scope this request has. It can never be widened by anything in the payload.
    // LEGACY CONTRACT (the currently published client revision predates the token): a roster
    // persona key with no token still resolves that persona's synthetic, read-only dataset, so the
    // live app keeps working until the token-bearing revision is published. Remove this branch then.
    let showcaseSession: any = null;
    let persona: any = null;
    if (typeof showcase_token === 'string' && showcase_token) {
      const verdict: any = await verifyShowcaseSession(sr, showcase_token);
      if (!verdict.ok) {
        return Response.json({ error: 'Exploration session is not valid', code: verdict.reason }, { status: 401 });
      }
      showcaseSession = verdict.session;
      persona = verdict.persona;
    } else if (demoMode || demo_persona) {
      persona = resolveDemoPersona(demo_persona);
    }
    if (demoMode || persona || showcaseSession) {
      // An unknown or missing persona is refused: there is no silent fallback persona.
      if (!persona) {
        return Response.json({ error: 'Unknown or missing demo persona', code: 'unknown_persona' }, { status: 400 });
      }
      // The dataset is the SESSION's when a session exists — never the roster's opinion of it.
      const dataset = showcaseSession?.dataset || persona.dataset;

      // The reference carried by the URL may be a public_id, a slug or a record id — all three are
      // accepted, and always inside this persona's governed dataset only.
      const ref = public_id || committee_id || null;
      let committee = null;
      if (ref) {
        const scope = { is_demo_data: true, demo_dataset: dataset };
        const byPublicId = await sr.entities.Committee.filter({ ...scope, public_id: ref }).catch(() => []);
        committee = (byPublicId || [])[0] || null;
        if (!committee) {
          const bySlug = await sr.entities.Committee.filter({ ...scope, slug: ref }).catch(() => []);
          committee = (bySlug || [])[0] || null;
        }
        if (!committee) {
          const byId = await sr.entities.Committee.get(ref).catch(() => null);
          if (byId && byId.is_demo_data === true && byId.demo_dataset === dataset) committee = byId;
        }
      }
      if (!committee) return Response.json({ error: 'Committee not found', code: 'out_of_scope' }, { status: 404 });
      // A session reads only the committees it was issued for — the scope comes from the server.
      if (showcaseSession && !(showcaseSession.allowed_committee_ids || []).includes(committee.id)) {
        return Response.json({ error: 'Committee not found', code: 'out_of_scope' }, { status: 404 });
      }

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
      const [decisions, actions, minutes, delegations, documents, initiatives, workstreams, workstreamMemberships] = await Promise.all([
        sr.entities.Decision.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.Action.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.MeetingMinutes.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.Delegation.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
        sr.entities.Document.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.Initiative.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.Workstream.filter({ committee_id: committee.id }).catch(() => []),
        sr.entities.WorkstreamMembership.filter({ committee_id: committee.id }).catch(() => []),
      ]);
      const orderedWorkstreams = (workstreams || []).sort((a, b) => (a.sequence || 99) - (b.sequence || 99));

      const owningOrg = await sr.entities.Organization.get(committee.organization_id).catch(() => null);
      const orgIndex = await buildOrgIndex(sr, [
        ...orderedMembers.map((m) => m.represented_organization_id),
        ...orderedWorkstreams.map((w) => w.lead_organization_id),
        ...orderedWorkstreams.flatMap((w) => w.participating_organization_ids || []),
        ...(workstreamMemberships || []).map((m) => m.represented_organization_id),
        committee.organization_id,
      ]);

      return Response.json({
        committee,
        // The owning institutional identity, resolved from the organization record.
        owning_org: owningOrg
          ? {
            public_id: owningOrg.public_id,
            name_ar: owningOrg.name_ar,
            name_en: owningOrg.name_en,
            logo_url: owningOrg.logo_url || null,
          }
          : null,
        mandate: mandate || null,
        my_role: effectiveRole,
        is_oversight: false,
        is_recused: isRecused,
        my_memberships: activeMemberships,
        members: orderedMembers,
        workstreams: orderedWorkstreams,
        workstream_memberships: workstreamMemberships || [],
        org_index: orgIndex,
        meetings: { upcoming, previous, total: (meetings || []).length },
        registers: {
          decisions: decisions || [],
          actions: actions || [],
          minutes: minutes || [],
          delegations: delegations || [],
          documents: documents || [],
          initiatives: initiatives || [],
        },
        // The caller's OWN work-group seats, resolved by stored identity link — never by name.
        my_workgroup_memberships: (workstreamMemberships || []).filter((m) => m.user_id === persona.user_id),
        // Review work shown to this seat — resolved on the server, and only for requests whose
        // document, version and stored file all still exist.
        my_review_tasks: await resolveMyReviewTasks(sr, { committee_id: committee.id, user_id: persona.user_id, role: effectiveRole }),
        counters: {
          members: orderedMembers.length,
          meetings: (meetings || []).length,
          decisions: (decisions || []).length,
          actions: (actions || []).length,
          minutes: (minutes || []).length,
          workstreams: orderedWorkstreams.length,
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
      // Fallback: the slug (older links carry it), then the committee ID
      if (!committee) {
        const bySlug = await base44.asServiceRole.entities.Committee.filter({ slug: public_id }).catch(() => []);
        committee = (bySlug || [])[0];
      }
      if (!committee) {
        committee = await base44.asServiceRole.entities.Committee.get(public_id).catch(() => null);
      }
    } else if (committee_id) {
      committee = await base44.asServiceRole.entities.Committee.get(committee_id).catch(() => null);
    }
    if (!committee) return Response.json({ error: 'Committee not found' }, { status: 404 });

    // A demonstration committee is NEVER read through a real account — not by a member, not by an
    // organization administrator, and not by a platform administrator. The link is answered with the
    // exploration transition instead: the server mints an isolated session and the same record opens
    // inside it. (Founder decision, 2026-10-04: the real session stays blocked.)
    if (committee.is_demo_data === true) {
      return Response.json({
        error: 'This record is available in the exploration experience',
        code: 'showcase_scope',
        exploration: { available: true },
      }, { status: 403 });
    }

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
    const [decisions, actions, minutes, delegations, documents, initiatives, workstreams, workstreamMemberships] = await Promise.all([
      base44.asServiceRole.entities.Decision.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.Action.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.MeetingMinutes.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.Delegation.filter({ committee_id: committee.id, status: 'active' }).catch(() => []),
      base44.asServiceRole.entities.Document.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.Initiative.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.Workstream.filter({ committee_id: committee.id }).catch(() => []),
      base44.asServiceRole.entities.WorkstreamMembership.filter({ committee_id: committee.id }).catch(() => []),
    ]);
    const orderedWorkstreams = (workstreams || []).sort((a, b) => (a.sequence || 99) - (b.sequence || 99));

    // Set user's active context
    await base44.auth.updateMe({ active_org_id: committee.organization_id, active_committee_id: committee.id }).catch(() => {});

    const owningOrg = await base44.asServiceRole.entities.Organization.get(committee.organization_id).catch(() => null);
    const orgIndex = await buildOrgIndex(base44.asServiceRole, [
      ...orderedMembers.map((m) => m.represented_organization_id),
      ...orderedWorkstreams.map((w) => w.lead_organization_id),
      ...orderedWorkstreams.flatMap((w) => w.participating_organization_ids || []),
      ...(workstreamMemberships || []).map((m) => m.represented_organization_id),
      committee.organization_id,
    ]);

    return Response.json({
      committee,
      // The owning institutional identity, resolved from the organization record.
      owning_org: owningOrg
        ? {
          public_id: owningOrg.public_id,
          name_ar: owningOrg.name_ar,
          name_en: owningOrg.name_en,
          logo_url: owningOrg.logo_url || null,
        }
        : null,
      mandate: mandate || null,
      my_role: effectiveRole,
      is_oversight: isOversight,
      is_recused: isRecused,
      my_memberships: activeMemberships,
      members: orderedMembers,
      workstreams: orderedWorkstreams,
      workstream_memberships: workstreamMemberships || [],
      org_index: orgIndex,
      meetings: { upcoming, previous, total: (meetings || []).length },
      registers: {
        decisions: decisions || [],
        actions: actions || [],
        minutes: minutes || [],
        delegations: delegations || [],
        documents: documents || [],
        initiatives: initiatives || [],
      },
      // The caller's OWN work-group seats, resolved by stored identity link — never by name.
      my_workgroup_memberships: (workstreamMemberships || []).filter((m) => m.user_id === user.id),
      // Review work shown to this seat — resolved on the server, and only for requests whose
      // document, version and stored file all still exist.
      my_review_tasks: await resolveMyReviewTasks(base44.asServiceRole, { committee_id: committee.id, user_id: user.id, role: effectiveRole }),
      counters: {
        members: orderedMembers.length,
        meetings: (meetings || []).length,
        decisions: (decisions || []).length,
        actions: (actions || []).length,
        minutes: (minutes || []).length,
        workstreams: orderedWorkstreams.length,
      },
      });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}