import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { createFormationVersion } from '../../shared/formationVersioner.ts';

// ApproveCommitteeAmendment — approves a governed amendment and applies it.
// Creates a new Formation Version (non-destructive). Notifies affected members.
// Only approved amendments may become effective.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { amendment_id, approved_by_name, effective_date, notify = true } = body;

    if (!amendment_id) return Response.json({ error: 'amendment_id is required' }, { status: 400 });

    const amendment = await base44.asServiceRole.entities.CommitteeAmendment.get(amendment_id);
    if (!amendment) return Response.json({ error: 'Amendment not found' }, { status: 404 });

    // Authority on a TRUSTED target: the committee is derived from the AMENDMENT record itself.
    const auth = await authorizeCommand(base44, {
      capability: 'committee.manage',
      target_type: 'CommitteeAmendment',
      target_id: amendment.id,
      claimed_committee_id: amendment.committee_id,
    });
    if (!auth.allowed) return refusalResponse(auth);

    if (!['draft', 'returned', 'pending_approval'].includes(amendment.status)) {
      return Response.json({ error: `Amendment status '${amendment.status}' cannot be approved` }, { status: 400 });
    }

    const today = effective_date || amendment.effective_date || new Date().toISOString().split('T')[0];
    const afterState = amendment.after_state ? JSON.parse(amendment.after_state) : {};

    // Apply changes based on amendment type
    const committee = await base44.asServiceRole.entities.Committee.get(amendment.committee_id);

    if (['rename', 'change_arabic_name', 'change_english_name'].includes(amendment.amendment_type)) {
      const updates = {};
      if (afterState.name_ar) updates.name_ar = afterState.name_ar;
      if (afterState.name_en) updates.name_en = afterState.name_en;
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Committee.update(amendment.committee_id, updates);
      }
    }

    if (['add_mandate', 'remove_mandate', 'amend_mandate', 'change_authority_level', 'change_reporting_authority'].includes(amendment.amendment_type)) {
      const updates = {};
      if (afterState.mandate !== undefined) updates.mandate = afterState.mandate;
      if (afterState.scope !== undefined) updates.scope = afterState.scope;
      if (afterState.reporting_authority !== undefined) updates.reporting_authority = afterState.reporting_authority;
      if (Object.keys(updates).length > 0) {
        await base44.asServiceRole.entities.Committee.update(amendment.committee_id, updates);
      }
    }

    if (['change_quorum', 'change_voting_rule', 'change_classification', 'change_term'].includes(amendment.amendment_type)) {
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

    if (['add_member', 'replace_member', 'reconstitute'].includes(amendment.amendment_type)) {
      // For reconstitute: end all current members first (non-destructive)
      if (amendment.amendment_type === 'reconstitute') {
        const current = await base44.asServiceRole.entities.CommitteeMembership
          .filter({ committee_id: amendment.committee_id, status: 'active' }).catch(() => []);
        for (const m of (current || [])) {
          await base44.asServiceRole.entities.CommitteeMembership.update(m.id, {
            status: 'resigned',
            term_end: today,
            end_reason: 'إعادة تشكيل',
            end_source_instrument_ref: amendment.source_instrument_ref || null,
            end_source_instrument_id: amendment.source_instrument_id || null,
            ended_at: new Date().toISOString(),
          });
        }
      }
      // Add new members from after_state
      for (const m of (afterState.members || [])) {
        if (!m.full_name || !m.role) continue;
        await base44.asServiceRole.entities.CommitteeMembership.create({
          organization_id: auth.organization_id,
          committee_id: amendment.committee_id,
          full_name: m.full_name,
          full_name_ar: m.full_name_ar || null,
          user_email: m.email || null,
          role: m.role,
          authority_level: m.authority_level || 'decision',
          voting_right: !['observer', 'advisor'].includes(m.role),
          status: 'active',
          institution_name: m.institution_name || null,
          term_start: today,
          term_end: null,
          protocol_order: m.protocol_order || 99,
        });
      }
    }

    if (amendment.amendment_type === 'end_member' && afterState.membership_id) {
      await base44.asServiceRole.entities.CommitteeMembership.update(afterState.membership_id, {
        status: 'resigned',
        term_end: today,
        end_reason: amendment.description || 'إنهاء عضوية',
        end_source_instrument_ref: amendment.source_instrument_ref || null,
        end_source_instrument_id: amendment.source_instrument_id || null,
        ended_at: new Date().toISOString(),
      });
    }

    if (amendment.amendment_type === 'change_role' && afterState.membership_id && afterState.new_role) {
      await base44.asServiceRole.entities.CommitteeMembership.update(afterState.membership_id, {
        role: afterState.new_role,
      });
    }

    // Create formation version
    const formationVersion = await createFormationVersion(base44, {
      committee_id: amendment.committee_id,
      organization_id: auth.organization_id,
      effective_date: today,
      source_instrument_id: amendment.source_instrument_id,
      source_instrument_ref: amendment.source_instrument_ref,
      amendment_id: amendment.id,
      reason_for_change: amendment.description || amendment.amendment_type,
      approving_authority: approved_by_name || auth.user.full_name || auth.user.email,
    });

    // Mark amendment as effective
    await base44.asServiceRole.entities.CommitteeAmendment.update(amendment_id, {
      status: 'effective',
      approved_by_name: approved_by_name || auth.user.full_name || auth.user.email,
      approved_at: new Date().toISOString(),
      applied_at: new Date().toISOString(),
      formation_version_id: formationVersion.id,
    });

    // Audit
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: amendment.committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'approve', entity_type: 'CommitteeAmendment', entity_id: amendment.id,
      entity_title: amendment.description || amendment.amendment_type,
      description: `اعتماد تعديل ونفاذ: ${amendment.amendment_type} — نسخة تشكيل #${formationVersion.version_number}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify
    let notified = 0;
    if (notify) {
      const activeMembers = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id: amendment.committee_id, status: 'active' }).catch(() => []);
      const committeeName = afterState.name_ar || committee.name_ar || committee.name_en || '';
      const subject = `اعتماد تعديل لجنة: ${committeeName}`;
      const emailBody = `السلام عليكم،\n\nتم اعتماد تعديل على لجنة "${committeeName}".\n\nنوع التعديل: ${amendment.amendment_type}\nالوصف: ${amendment.description || '—'}\nتاريخ النفاذ: ${today}\nنسخة التشكيل: #${formationVersion.version_number}\n\nالأثر: ${amendment.impact_summary || '—'}\n\nمع تحيات،\nلِجان™ — نظام تشغيل المجالس واللجان الوطنية\nPowered by CONNECTION™`;
      for (const m of (activeMembers || [])) {
        if (!m.user_email) continue;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to: m.user_email, subject, body: emailBody });
          notified++;
        } catch (e) {}
      }
    }

    return Response.json({
      status: 'ok',
      amendment_id,
      formation_version: formationVersion.version_number,
      notified,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}