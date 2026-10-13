import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { buildReferenceNumber } from '../../shared/legislativeFileLifecycle.ts';

// OpenLegislativeFile — receive a referral and create the unified legislative file.
//
// The file is the connected through-line from referral to closure. This function creates
// it at the "referral_received" stage, assigns a reference number, and records the first
// stage-history entry. It does NOT assign the committee (a separate act) and does NOT
// claim any integration — the delivery channel defaults to manual_governed_handoff.
//
// Authority: the caller must be authenticated and a member of the organization (active_org_id
// matches the profile's organization). Platform admin may open for any org. No AI, no
// historical fabrication: the file opens at receipt, exactly as found.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const {
      organization_id,
      profile_id,
      referring_body,
      referring_body_en,
      referral_received_at,
      subject_title_ar,
      subject_title_en,
      subject_classification,
      subject_summary,
      subject_summary_en,
      legal_deadline,
      operational_deadline,
      is_demo_data,
      demo_dataset,
    } = body || {};

    if (!organization_id) return Response.json({ error: 'organization_id is required' }, { status: 400 });
    if (!subject_title_ar) return Response.json({ error: 'subject_title_ar is required' }, { status: 400 });
    if (!subject_classification) return Response.json({ error: 'subject_classification is required' }, { status: 400 });

    // Resolve the active organization from the user's session when available; admins may open
    // for any org, but the org must be the profile's org.
    const activeOrgId = user.data?.active_org_id || organization_id;
    const isPlatformAdmin = user.role === 'admin';
    const sr = base44.asServiceRole;

    // Load the profile (must be enabled for the legislative journey).
    const profileRows = profile_id
      ? await sr.entities.LegislativeProfile.filter({ id: profile_id }).catch(() => [])
      : await sr.entities.LegislativeProfile.filter({ organization_id, enabled: true, status: 'active' }).catch(() => []);
    const profile = (profileRows?.items || profileRows || [])[0] || null;
    if (!profile) {
      return Response.json({ error: 'No enabled legislative profile for this organization' }, { status: 400 });
    }
    if (profile.organization_id !== organization_id) {
      return Response.json({ error: 'Profile does not belong to this organization' }, { status: 400 });
    }

    // Authorization: org membership or platform admin.
    if (!isPlatformAdmin && activeOrgId !== organization_id) {
      return Response.json({ error: 'Not authorized for this organization' }, { status: 403 });
    }

    // Sequence for the reference number: count existing files for this org in the current year.
    const yearStart = new Date(new Date().getUTCFullYear(), 0, 1).toISOString();
    const existing = await sr.entities.LegislativeFile
      .filter({ organization_id, created_date: { $gte: yearStart } })
      .catch(() => ({ items: [] }));
    const seq = ((existing?.items || existing || []).length || 0) + 1;
    const reference_number = buildReferenceNumber(seq);

    const now = new Date().toISOString();
    const receivedAt = referral_received_at || now;

    const file = await base44.entities.LegislativeFile.create({
      organization_id,
      profile_id: profile.id,
      reference_number,
      referring_body,
      referring_body_en,
      referral_received_at: receivedAt,
      subject_title_ar,
      subject_title_en,
      subject_classification,
      subject_summary,
      subject_summary_en,
      legal_deadline,
      operational_deadline,
      stage: 'referral_received',
      stage_history: [`referral_received | ${now} | ${user.full_name || user.email || 'system'} | ملف مفتوح باستلام الإحالة`],
      current_owner_user_id: user.id,
      current_owner_name: user.full_name || user.email || null,
      current_owner_role: 'receiver',
      delivery_channel: profile.delivery_channels?.[0] || 'manual_governed_handoff',
      contract_version: 'legislative-file-1.0.0',
      correlation_id: `legfile-${now.replace(/[-:.]/g, '').slice(0, 14)}`,
      status: 'open',
      is_demo_data: !!is_demo_data,
      demo_dataset: demo_dataset || null,
    });

    // Audit trail — the open act is recorded.
    await sr.entities.AuditEvent.create({
      organization_id,
      committee_id: null,
      actor_user_id: user.id,
      actor_name: user.full_name || user.email || null,
      action: 'create',
      entity_type: 'LegislativeFile',
      entity_id: file.id,
      entity_title: reference_number,
      description: `فتح ملف تشريعي: ${reference_number} (${subject_classification})`,
      new_value: 'referral_received',
      correlation_id: file.correlation_id,
    }).catch(() => {});

    return Response.json({ file, reference_number });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}