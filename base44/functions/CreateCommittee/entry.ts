import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// CreateCommittee — governed committee creation command.
// Verifies org ownership/admin, creates Committee + CommitteeMandate + CommitteeMembership records.
// Optionally stores the establishing document (decision/charter) and supporting documents.
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
      establishing_doc, supporting_docs, logo_url,
    } = body;

    if (!organization_id || !name_ar || !name_en) {
      return Response.json({ error: 'organization_id, name_ar, name_en are required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

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
      establishing_doc_type: establishing_doc?.type || null,
      establishing_doc_reference: establishing_doc?.reference || null,
      establishing_doc_date: establishing_doc?.date || null,
      chair_name: chair_name || null,
      secretary_name: secretary_name || null,
      quorum_count: quorum_count || 3,
      voting_rule: voting_rule || 'simple_majority',
      meeting_cadence: meeting_cadence || 'monthly',
      classification: classification || 'internal',
      term_start: term_start || null,
      term_end: term_end || null,
      logo_url: logo_url || null,
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

    // Auto-assign the creator (Founder/Owner) as Committee Chair + Committee Administrator.
    // This is a real backend assignment — not a visual label or fallback.
    const creatorName = user.full_name || user.email;
    await base44.asServiceRole.entities.CommitteeMembership.create({
      organization_id,
      committee_id: committee.id,
      user_id: user.id,
      user_email: user.email,
      full_name: creatorName,
      role: 'chair',
      authority_level: 'decision',
      voting_right: true,
      status: 'active',
      term_start: term_start || today,
      term_end: term_end || null,
      protocol_order: 1,
    });
    await base44.asServiceRole.entities.CommitteeMembership.create({
      organization_id,
      committee_id: committee.id,
      user_id: user.id,
      user_email: user.email,
      full_name: creatorName,
      role: 'committee_administrator',
      authority_level: 'execution',
      voting_right: false,
      status: 'active',
      term_start: term_start || today,
      term_end: term_end || null,
      protocol_order: 2,
    });

    // Create CommitteeMembership for a named chair (if different from creator)
    if (chair_name && chair_name !== creatorName) {
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

    // Store establishing document (decision / charter) if a file was uploaded
    if (establishing_doc && establishing_doc.file_url) {
      const doc = await base44.asServiceRole.entities.Document.create({
        organization_id,
        committee_id: committee.id,
        title: establishing_doc.file_name || 'مستند التأسيس',
        document_type: 'establishing_decision',
        classification: classification || 'internal',
        owner_name: user.full_name || user.email,
        owner_user_id: user.id,
        status: 'published',
      });
      const version = await base44.asServiceRole.entities.DocumentVersion.create({
        organization_id,
        committee_id: committee.id,
        document_id: doc.id,
        version_number: 1,
        file_url: establishing_doc.file_url,
        file_name: establishing_doc.file_name || null,
        uploaded_by_name: user.full_name || user.email,
        uploaded_by_user_id: user.id,
        uploaded_at: new Date().toISOString(),
        status: 'current',
      });
      await base44.asServiceRole.entities.Document.update(doc.id, {
        current_version_id: version.id,
        current_version_number: 1,
      });
    }

    // Store supporting documents
    for (const sd of (supporting_docs || [])) {
      if (!sd.file_url) continue;
      const doc = await base44.asServiceRole.entities.Document.create({
        organization_id,
        committee_id: committee.id,
        title: sd.title || sd.file_name || 'مستند داعم',
        document_type: sd.document_type || 'other',
        classification: classification || 'internal',
        owner_name: user.full_name || user.email,
        owner_user_id: user.id,
        status: 'draft',
      });
      const version = await base44.asServiceRole.entities.DocumentVersion.create({
        organization_id,
        committee_id: committee.id,
        document_id: doc.id,
        version_number: 1,
        file_url: sd.file_url,
        file_name: sd.file_name || null,
        uploaded_by_name: user.full_name || user.email,
        uploaded_by_user_id: user.id,
        uploaded_at: new Date().toISOString(),
        status: 'current',
      });
      await base44.asServiceRole.entities.Document.update(doc.id, {
        current_version_id: version.id,
        current_version_number: 1,
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