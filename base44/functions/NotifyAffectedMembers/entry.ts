import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// NotifyAffectedMembers — standalone notification for committee changes.
// Sends email to all active members with an email on file, and creates
// MemberAcknowledgement records (pending) for tracking.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      committee_id, amendment_id,
      subject, message,
      change_summary, new_role, access_impact, actions_required,
      create_acknowledgements = true,
    } = body;

    if (!committee_id) return Response.json({ error: 'committee_id is required' }, { status: 400 });

    const auth = await resolveAuthority(base44, { committee_id, capability: 'read' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    const committee = await base44.asServiceRole.entities.Committee.get(committee_id);
    const activeMembers = await base44.asServiceRole.entities.CommitteeMembership
      .filter({ committee_id, status: 'active' }).catch(() => []);

    const committeeName = committee?.name_ar || committee?.name_en || '';
    const emailSubject = subject || `إشعار تحديث لجنة: ${committeeName}`;
    const emailBody = message || `السلام عليكم،\n\nتم تحديث لجنة "${committeeName}".\n\n${change_summary || ''}\n\nمع تحيات،\nلِجان™ — نظام تشغيل المجالس واللجان الوطنية\nPowered by CONNECTION™`;

    let notified = 0;
    let acknowledgementsCreated = 0;

    for (const m of (activeMembers || [])) {
      // Send email
      if (m.user_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: m.user_email, subject: emailSubject, body: emailBody,
          });
          notified++;
        } catch (e) {}
      }

      // Create acknowledgement record
      if (create_acknowledgements && amendment_id) {
        const existing = await base44.asServiceRole.entities.MemberAcknowledgement
          .filter({ amendment_id, member_name: m.full_name }).catch(() => []);
        if (!existing || existing.length === 0) {
          await base44.asServiceRole.entities.MemberAcknowledgement.create({
            organization_id: auth.organization_id,
            committee_id,
            amendment_id,
            member_name: m.full_name,
            member_user_id: m.user_id || null,
            member_email: m.user_email || null,
            status: 'pending',
            notification_sent_at: new Date().toISOString(),
            change_summary: change_summary || null,
            new_role: new_role || null,
            access_impact: access_impact || null,
            actions_required: actions_required || null,
          });
          acknowledgementsCreated++;
        }
      }
    }

    return Response.json({ status: 'ok', notified, acknowledgements_created: acknowledgementsCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}