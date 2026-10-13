import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import {
  REPORT_STAGE_LABELS_AR, REPORT_STAGE_LABELS_EN, canTransitionReportStage,
} from '../../shared/legislativeFileLifecycle.ts';

// UpdateLegislativeReport — save the committee report draft (conclusions + recommendations)
// and/or advance the report's own lifecycle stage.
//
// The report stage is distinct from the file's journey stage: a report may be returned for
// amendments and resubmitted. Only forward-allowed moves are accepted here — a silent
// backwards edit is refused. Every save stamps report_last_updated_at/by and appends to the
// file's stage_history so the report's evolution is part of the append-only trail.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_id, report_conclusions, report_recommendations, target_report_stage, note } = body || {};
    if (!file_id) return Response.json({ error: 'file_id is required' }, { status: 400 });

    const file = await base44.entities.LegislativeFile.get(file_id).catch(() => null);
    if (!file) return Response.json({ error: 'not_found' }, { status: 404 });

    const now = new Date().toISOString();
    const actorLabel = user.full_name || user.email || 'system';
    const update = {
      report_last_updated_at: now,
      report_last_updated_by_name: actorLabel,
    };

    // Text fields are saved only when provided (undefined means "do not touch this field").
    if (report_conclusions !== undefined) update.report_conclusions = report_conclusions || '';
    if (report_recommendations !== undefined) update.report_recommendations = report_recommendations || '';

    // Report stage transition — forward-only, validated against the adjacency map.
    if (target_report_stage && target_report_stage !== file.report_stage) {
      if (!canTransitionReportStage(file.report_stage || 'not_started', target_report_stage)) {
        return Response.json({
          error: `Report cannot move from ${file.report_stage || 'not_started'} to ${target_report_stage}`,
        }, { status: 400 });
      }
      update.report_stage = target_report_stage;
      // Starting to draft implicitly begins the report lifecycle.
      if (target_report_stage === 'draft' && (!file.report_stage || file.report_stage === 'not_started')) {
        // no extra fields; the stage itself marks the start
      }
    }

    // Append a history entry when either text changed or the stage moved.
    const moved = update.report_stage && update.report_stage !== file.report_stage;
    const textChanged = report_conclusions !== undefined || report_recommendations !== undefined;
    if (moved || textChanged) {
      const label = update.report_stage
        ? `report_${update.report_stage}`
        : 'report_edit';
      const entry = `${label} | ${now} | ${actorLabel} | ${note || REPORT_STAGE_LABELS_AR[update.report_stage] || 'تحديث التقرير'}`;
      update.stage_history = [...(file.stage_history || []), entry];
    }

    const updated = await base44.entities.LegislativeFile.update(file_id, update);

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: file.organization_id,
      committee_id: file.committee_id || null,
      actor_user_id: user.id,
      actor_name: actorLabel,
      action: moved ? 'status_change' : 'create',
      entity_type: 'LegislativeFile',
      entity_id: file_id,
      entity_title: file.reference_number,
      description: update.report_stage
        ? `تقرير الملف ${file.reference_number}: ${REPORT_STAGE_LABELS_AR[update.report_stage]}${note ? ` — ${note}` : ''}`
        : `تحديث مسودة تقرير الملف ${file.reference_number}`,
      old_value: file.report_stage,
      new_value: update.report_stage || file.report_stage,
      correlation_id: file.correlation_id,
    }).catch(() => {});

    return Response.json({ file: updated, report_stage: update.report_stage || file.report_stage });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}