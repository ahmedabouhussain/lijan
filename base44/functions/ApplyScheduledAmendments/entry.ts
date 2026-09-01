import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { applyAmendmentChanges } from '../../shared/amendmentApplier.ts';

// ApplyScheduledAmendments — finds scheduled amendments whose effective_date
// has arrived and applies them automatically. Called by the daily scheduled
// workflow "Scheduled Amendment Effectivation".
//
// No user context — runs as service role with system actor for audit.
// Only amendments with status "scheduled" and effective_date <= today are processed.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date().toISOString().split("T")[0];

    // Find all scheduled amendments
    const scheduled = await base44.asServiceRole.entities.CommitteeAmendment
      .filter({ status: "scheduled" })
      .catch(() => []);

    const due = (scheduled || []).filter((a) => a.effective_date && a.effective_date <= today);

    if (due.length === 0) {
      return Response.json({ status: "ok", processed: 0, message: "No scheduled amendments due" });
    }

    const results = [];
    for (const amendment of due) {
      try {
        const { formationVersion, committee } = await applyAmendmentChanges(base44, {
          amendment,
          organization_id: amendment.organization_id,
          effective_date: amendment.effective_date,
          approving_authority: "النفاذ المجدول الآلي",
        });

        // Mark amendment as effective
        await base44.asServiceRole.entities.CommitteeAmendment.update(amendment.id, {
          status: "effective",
          applied_at: new Date().toISOString(),
          formation_version_id: formationVersion.id,
        });

        // Audit
        await base44.asServiceRole.entities.AuditEvent.create({
          organization_id: amendment.organization_id,
          committee_id: amendment.committee_id,
          actor_name: "النفاذ المجدول الآلي",
          action: "approve",
          entity_type: "CommitteeAmendment",
          entity_id: amendment.id,
          entity_title: amendment.description || amendment.amendment_type,
          description: `نفاذ مجدول آلي: ${amendment.amendment_type} — نسخة تشكيل #${formationVersion.version_number}`,
          authority_context: "scheduled_effectivation",
        });

        // Notify affected members
        const activeMembers = await base44.asServiceRole.entities.CommitteeMembership
          .filter({ committee_id: amendment.committee_id, status: "active" }).catch(() => []);
        const committeeName = committee.name_ar || committee.name_en || "";
        const subject = `نفاذ تعديل مجدول: ${committeeName}`;
        const emailBody = `السلام عليكم،\n\nنفذ التعديل المجدول على لجنة "${committeeName}".\n\nنوع التعديل: ${amendment.amendment_type}\nالوصف: ${amendment.description || "—"}\nتاريخ النفاذ: ${amendment.effective_date}\nنسخة التشكيل: #${formationVersion.version_number}\n\nمع تحيات،\nرَقِيم™ — نظام الحوكمة المؤسسية`;
        let notified = 0;
        for (const m of (activeMembers || [])) {
          if (!m.user_email) continue;
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({ to: m.user_email, subject, body: emailBody });
            notified++;
          } catch (e) {}
        }

        results.push({ amendment_id: amendment.id, status: "effective", formation_version: formationVersion.version_number, notified });
      } catch (e) {
        results.push({ amendment_id: amendment.id, status: "error", error: e.message });
      }
    }

    return Response.json({ status: "ok", processed: due.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}