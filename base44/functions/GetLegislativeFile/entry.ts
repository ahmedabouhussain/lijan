import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { STAGE_LABELS_AR, STAGE_LABELS_EN, nextStageOf } from '../../shared/legislativeFileLifecycle.ts';

// GetLegislativeFile — the unified, governed read for one legislative file.
//
// Assembles the through-line in one call: the file, its committee, its profile, related
// meetings, hearing sessions, the committee report document, comparison table, and the
// follow-up action. Reads are scoped by the caller's organization (RLS on the entity), so a
// user never sees a file outside their council. Showcase data is tagged and never presented
// as official.

const arr = (x: any): any[] => (Array.isArray(x) ? x : (x?.items || []));

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_id } = body || {};
    if (!file_id) return Response.json({ error: 'file_id is required' }, { status: 400 });

    const file = await base44.entities.LegislativeFile.get(file_id).catch(() => null);
    if (!file) return Response.json({ error: 'not_found' }, { status: 404 });

    const sr = base44.asServiceRole;

    const [committee, profile, hearings, meetings, reportDoc, followUpAction] = await Promise.all([
      file.committee_id ? sr.entities.Committee.get(file.committee_id).catch(() => null) : Promise.resolve(null),
      file.profile_id ? sr.entities.LegislativeProfile.get(file.profile_id).catch(() => null) : Promise.resolve(null),
      sr.entities.HearingSession.filter({ legislative_file_id: file_id }).catch(() => []),
      (arr(file.related_meeting_ids).length
        ? sr.entities.Meeting.filter({ id: { $in: arr(file.related_meeting_ids) } }).catch(() => [])
        : Promise.resolve([])),
      file.report_document_id ? sr.entities.Document.get(file.report_document_id).catch(() => null) : Promise.resolve(null),
      file.follow_up_action_id ? sr.entities.Action.get(file.follow_up_action_id).catch(() => null) : Promise.resolve(null),
    ]);

    // Stage context — labels in both languages and the next stage.
    const next_stage = nextStageOf(file.stage);
    const stage_ar = STAGE_LABELS_AR[file.stage] || file.stage;
    const stage_en = STAGE_LABELS_EN[file.stage] || file.stage;
    const next_stage_ar = next_stage ? STAGE_LABELS_AR[next_stage] : null;
    const next_stage_en = next_stage ? STAGE_LABELS_EN[next_stage] : null;

    return Response.json({
      file,
      committee: committee ? {
        id: committee.id,
        name_ar: committee.name_ar,
        name_en: committee.name_en,
        type: committee.type,
        mandate: committee.mandate,
      } : null,
      profile: profile ? {
        id: profile.id,
        profile_name_ar: profile.profile_name_ar,
        profile_name_en: profile.profile_name_en,
        integration_posture: profile.integration_posture,
        vocabulary_active: profile.vocabulary_active,
      } : null,
      hearings: arr(hearings),
      meetings: arr(meetings),
      report_document: reportDoc,
      follow_up_action: followUpAction,
      stage_context: {
        current: file.stage,
        stage_ar,
        stage_en,
        next_stage,
        next_stage_ar,
        next_stage_en,
        is_closed: file.stage === 'closed',
      },
      my_role: user.role,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}