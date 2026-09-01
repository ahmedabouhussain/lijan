import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';
import { createFormationVersion } from '../../shared/formationVersioner.ts';

// EndCommitteeMembership — non-destructive membership termination.
// Does NOT hard-delete the member. Sets status to "resigned", records end reason,
// source instrument, and end date. Creates a new Formation Version snapshot.
// Past meetings, votes, and signatures remain attributed to this member.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      committee_id, membership_id,
      end_reason, end_source_instrument_ref, end_source_instrument_id,
      effective_date,
      notify = true,
    } = body;

    if (!committee_id || !membership_id) {
      return Response.json({ error: 'committee_id and membership_id are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'committee.manage' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const membership = await base44.asServiceRole.entities.CommitteeMembership.get(membership_id);
    if (!membership || membership.committee_id !== committee_id) {
      return Response.json({ error: 'Membership not found in this committee' }, { status: 404 });
    }

    const today = effective_date || new Date().toISOString().split('T')[0];

    // Non-destructive end
    await base44.asServiceRole.entities.CommitteeMembership.update(membership_id, {
      status: 'resigned',
      term_end: today,
      end_reason: end_reason || null,
      end_source_instrument_ref: end_source_instrument_ref || null,
      end_source_instrument_id: end_source_instrument_id || null,
      ended_at: new Date().toISOString(),
    });

    // Create new formation version
    const formationVersion = await createFormationVersion(base44, {
      committee_id,
      organization_id: auth.organization_id,
      effective_date: today,
      source_instrument_id: end_source_instrument_id || null,
      source_instrument_ref: end_source_instrument_ref || null,
      reason_for_change: `إنهاء عضوية: ${membership.full_name} — ${end_reason || 'بدون سبب محدد'}`,
      approving_authority: auth.user.full_name || auth.user.email,
    });

    // Audit
    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'update', entity_type: 'CommitteeMembership', entity_id: membership_id,
      entity_title: membership.full_name,
      description: `إنهاء عضوية (غير مدمِّر): ${membership.full_name} — ${end_reason || 'بدون سبب'}`,
      old_value: 'active', new_value: 'resigned',
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    // Notify
    let notified = 0;
    if (notify) {
      const activeMembers = await base44.asServiceRole.entities.CommitteeMembership
        .filter({ committee_id, status: 'active' }).catch(() => []);
      const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
      const committeeName = committee?.name_ar || committee?.name_en || '';
      const subject = `تحديث تشكيل اللجنة: ${committeeName}`;
      const emailBody = `السلام عليكم،\n\nتم إنهاء عضوية ${membership.full_name} في لجنة "${committeeName}".\n\nالسبب: ${end_reason || 'غير محدد'}\nالسند: ${end_source_instrument_ref || '—'}\nتاريخ النفاذ: ${today}\n\nمع تحيات،\nرَقِيم™ — نظام الحوكمة المؤسسية`;
      for (const m of (activeMembers || [])) {
        if (!m.user_email) continue;
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to: m.user_email, subject, body: emailBody });
          notified++;
        } catch (e) {}
      }
      // Also notify the departed member
      if (membership.user_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({ to: membership.user_email, subject, body: emailBody });
          notified++;
        } catch (e) {}
      }
    }

    return Response.json({
      status: 'ok',
      ended_member: membership.full_name,
      formation_version: formationVersion.version_number,
      notified,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}