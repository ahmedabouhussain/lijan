import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// UpdateCommitteeFormation — governed formation updates with instant member notification.
// Actions: add_member, remove_member, rename, update_mandate, reform
// After each change, notifies all active members who have an email on file.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      committee_id, action,
      member, membership_id,
      name_ar, name_en, mandate, scope,
      members, notify = true,
    } = body;

    if (!committee_id || !action) {
      return Response.json({ error: 'committee_id and action are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.manage' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    let actionDescription = '';

    if (action === 'add_member') {
      if (!member?.full_name || !member?.role) {
        return Response.json({ error: 'member.full_name and member.role are required' }, { status: 400 });
      }
      await base44.asServiceRole.entities.CommitteeMembership.create({
        organization_id: auth.organization_id,
        committee_id,
        full_name: member.full_name,
        full_name_ar: member.full_name_ar || null,
        user_email: member.email || null,
        role: member.role,
        authority_level: member.authority_level || 'decision',
        voting_right: !['observer', 'advisor'].includes(member.role),
        status: 'active',
        institution_name: member.institution_name || null,
        term_start: member.term_start || null,
        term_end: member.term_end || null,
        protocol_order: member.protocol_order || 99,
      });
      actionDescription = `إضافة عضو: ${member.full_name} (${member.role})`;
    }

    if (action === 'remove_member') {
      if (!membership_id) return Response.json({ error: 'membership_id is required' }, { status: 400 });
      const m = await base44.asServiceRole.entities.CommitteeMembership.get(membership_id).catch(() => null);
      if (!m || m.committee_id !== committee_id) {
        return Response.json({ error: 'Membership not found in this committee' }, { status: 404 });
      }
      await base44.asServiceRole.entities.CommitteeMembership.update(membership_id, {
        status: 'resigned',
        term_end: new Date().toISOString().split('T')[0],
      });
      actionDescription = `إزالة عضو: ${m.full_name}`;
    }

    if (action === 'rename') {
      if (!name_ar && !name_en) return Response.json({ error: 'name_ar or name_en is required' }, { status: 400 });
      const updates = {};
      if (name_ar) updates.name_ar = name_ar;
      if (name_en) updates.name_en = name_en;
      await base44.asServiceRole.entities.Committee.update(committee_id, updates);
      actionDescription = `إعادة تسمية اللجنة إلى: ${name_ar || name_en}`;
    }

    if (action === 'update_mandate') {
      const updates = {};
      if (mandate !== undefined) updates.mandate = mandate;
      if (scope !== undefined) updates.scope = scope;
      await base44.asServiceRole.entities.Committee.update(committee_id, updates);
      actionDescription = 'تحديث الصلاحية والاختصاصات';
    }

    if (action === 'reform') {
      // Mark all existing active members as resigned
      const existing = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id, status: 'active' }).catch(() => []);
      for (const m of (existing || [])) {
        await base44.asServiceRole.entities.CommitteeMembership.update(m.id, {
          status: 'resigned',
          term_end: new Date().toISOString().split('T')[0],
        });
      }
      // Create new roster
      let created = 0;
      for (const m of (members || [])) {
        if (!m.full_name || !m.role) continue;
        await base44.asServiceRole.entities.CommitteeMembership.create({
          organization_id: auth.organization_id,
          committee_id,
          full_name: m.full_name,
          full_name_ar: m.full_name_ar || null,
          user_email: m.email || null,
          role: m.role,
          authority_level: m.authority_level || 'decision',
          voting_right: !['observer', 'advisor'].includes(m.role),
          status: 'active',
          institution_name: m.institution_name || null,
          term_start: m.term_start || null,
          term_end: m.term_end || null,
          protocol_order: m.protocol_order || 99,
        });
        created++;
      }
      actionDescription = `إعادة تشكيل اللجنة (${created} أعضاء جدد)`;
    }

    // Audit
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'update', entity_type: 'Committee', entity_id: committee_id,
      entity_title: committee.name_ar || committee.name_en,
      description: actionDescription,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify active members with email on file
    let notified = 0;
    if (notify) {
      const activeMembers = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id, status: 'active' }).catch(() => []);
      const committeeName = action === 'rename' ? (name_ar || name_en) : (committee.name_ar || committee.name_en);
      const subject = `تحديث تشكيل اللجنة: ${committeeName}`;
      const emailBody = `السلام عليكم،\n\nتم تحديث تشكيل اللجنة "${committeeName}".\n\nالإجراء: ${actionDescription}\n\nمع تحيات،\nرَقِيم™ — نظام الحوكمة المؤسسية`;
      for (const m of (activeMembers || [])) {
        if (!m.user_email) continue;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: m.user_email, subject, body: emailBody,
          });
          notified++;
        } catch (e) {
          // skip failed sends
        }
      }
    }

    return Response.json({
      status: 'ok',
      action,
      description: actionDescription,
      notified,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}