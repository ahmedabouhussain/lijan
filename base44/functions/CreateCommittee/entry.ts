import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// CreateCommittee — governed committee creation command.
// Verifies org ownership/admin, creates Committee + CommitteeMandate + CommitteeMembership records.
// Committee remains Draft until activation readiness is satisfied and TransitionCommitteeStatus is called.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      organization_id, name_ar, name_en, type, mandate, appointing_authority,
      term_start, term_end, classification, chair_name, secretary_name,
      quorum_count, voting_rule, meeting_cadence, members,
    } = body;

    if (!organization_id || !name_ar || !name_en) {
      return Response.json({ error: 'organization_id, name_ar, name_en are required' }, { status: 400 });
    }

    // Verify org ownership or admin
    const memberships = await base44.asServiceRole.entities.OrganizationMembership
      .filter({ organization_id, user_id: user.id, status: 'active' })
      .catch(() => []);
    const membership = (memberships || [])[0];
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Only organization owners or admins can create committees' }, { status: 403 });
      }
    }

    // Generate slug and public_id
    const baseSlug = (name_en || name_ar).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 40);
    const publicId = 'cmte_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    // Create committee
    const committee = await base44.asServiceRole.entities.Committee.create({
      organization_id,
      name_ar, name_en,
      type: type || 'permanent_committee',
      slug: baseSlug,
      public_id: publicId,
      mandate: mandate || null,
      appointing_authority: appointing_authority || null,
      chair_name: chair_name || null,
      secretary_name: secretary_name || null,
      quorum_count: quorum_count || 3,
      voting_rule: voting_rule || 'simple_majority',
      meeting_cadence: meeting_cadence || 'monthly',
      classification: classification || 'internal',
      term_start: term_start || null,
      term_end: term_end || null,
      status: 'draft',
      version: 1,
    });

    // Create CommitteeMandate
    if (mandate) {
      await base44.asServiceRole.entities.CommitteeMandate.create({
        organization_id,
        committee_id: committee.id,
        mandate_text: mandate,
        issuing_authority: appointing_authority || null,
        effective_start: term_start || null,
        effective_end: term_end || null,
        status: 'active',
        version: 1,
      });
    }

    // Create CommitteeMembership for chair
    if (chair_name) {
      await base44.asServiceRole.entities.CommitteeMembership.create({
        organization_id,
        committee_id: committee.id,
        full_name: chair_name,
        role: 'chair',
        authority_level: 'decision',
        voting_right: true,
        status: 'active',
        term_start: term_start || null,
        term_end: term_end || null,
        protocol_order: 1,
      });
    }

    // Create CommitteeMembership for secretary
    if (secretary_name) {
      await base44.asServiceRole.entities.CommitteeMembership.create({
        organization_id,
        committee_id: committee.id,
        full_name: secretary_name,
        role: 'secretary',
        authority_level: 'approval',
        voting_right: false,
        status: 'active',
        term_start: term_start || null,
        term_end: term_end || null,
        protocol_order: 3,
      });
    }

    // Create additional members
    for (const m of (members || [])) {
      await base44.asServiceRole.entities.CommitteeMembership.create({
        organization_id,
        committee_id: committee.id,
        full_name: m.full_name,
        full_name_ar: m.full_name_ar || null,
        role: m.role || 'member',
        authority_level: m.authority_level || 'decision',
        voting_right: m.voting_right !== false,
        status: 'active',
        term_start: term_start || null,
        term_end: term_end || null,
        protocol_order: m.protocol_order || 99,
        institution_name: m.institution_name || null,
      });
    }

    // AuditEvent
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id,
      committee_id: committee.id,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email,
      actor_email: user.email,
      action: 'create',
      entity_type: 'Committee',
      entity_id: committee.id,
      entity_title: name_ar || name_en,
      description: 'Committee created (draft)',
      correlation_id: 'cmte_' + publicId,
    });

    return Response.json({
      status: 'created',
      committee_id: committee.id,
      slug: baseSlug,
      public_id: publicId,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}