import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { STAGE_ORDER, STAGE_LABELS_AR, STAGE_LABELS_EN, isForwardTransition } from '../../shared/legislativeFileLifecycle.ts';

// TransitionLegislativeFile — move a legislative file forward along its journey.
//
// A forward transition appends to stage_history (append-only, never rewritten) and writes an
// audit event. A backward or sideways move is refused here — returning a file to an earlier
// stage is a different institutional act (a formal return for reconsideration) and is not
// allowed through this function. The caller names only the target stage and a note; authority
// (who, in what capacity) comes from the authenticated session, never the payload.

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { file_id, target_stage, note, committee_id, current_owner_user_id, current_owner_name, current_owner_role } = body || {};
    if (!file_id) return Response.json({ error: 'file_id is required' }, { status: 400 });
    if (!target_stage) return Response.json({ error: 'target_stage is required' }, { status: 400 });
    if (!STAGE_ORDER.includes(target_stage)) {
      return Response.json({ error: 'Unknown target stage' }, { status: 400 });
    }

    const file = await base44.entities.LegislativeFile.get(file_id).catch(() => null);
    if (!file) return Response.json({ error: 'not_found' }, { status: 404 });

    if (file.stage === target_stage) {
      return Response.json({ error: 'File is already at this stage' }, { status: 400 });
    }
    if (!isForwardTransition(file.stage, target_stage)) {
      return Response.json({
        error: 'Backward transition is not allowed through this function — use a formal return for reconsideration',
      }, { status: 400 });
    }

    const now = new Date().toISOString();
    const actorLabel = user.full_name || user.email || 'system';
    const stageLabelAr = STAGE_LABELS_AR[target_stage] || target_stage;
    const historyEntry = `${target_stage} | ${now} | ${actorLabel} | ${note || stageLabelAr}`;

    const update: any = {
      stage: target_stage,
      stage_history: [...(file.stage_history || []), historyEntry],
    };
    if (committee_id) update.committee_id = committee_id;
    if (current_owner_user_id) update.current_owner_user_id = current_owner_user_id;
    if (current_owner_name) update.current_owner_name = current_owner_name;
    if (current_owner_role) update.current_owner_role = current_owner_role;

    // Derive high-level status from the stage.
    if (target_stage === 'closed') {
      update.status = 'closed';
      update.closed_at = now;
      update.closed_by_user_id = user.id;
      update.closed_by_name = actorLabel;
      if (note) update.closure_notes = note;
    } else if (target_stage === 'delivered' || target_stage === 'delivery_confirmed' || target_stage === 'follow_up') {
      update.status = 'in_progress';
      if (target_stage === 'delivered') {
        update.delivery_status = 'delivered';
        update.delivered_at = now;
        update.delivered_by_user_id = user.id;
        update.delivered_by_name = actorLabel;
      }
      if (target_stage === 'delivery_confirmed') {
        update.delivery_status = 'delivery_confirmed';
        update.delivery_confirmed_at = now;
        update.delivery_confirmed_by_name = actorLabel;
      }
    } else {
      update.status = 'in_progress';
    }

    const updated = await base44.entities.LegislativeFile.update(file_id, update);

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: file.organization_id,
      committee_id: file.committee_id || null,
      actor_user_id: user.id,
      actor_name: actorLabel,
      action: target_stage === 'closed' ? 'close' : 'status_change',
      entity_type: 'LegislativeFile',
      entity_id: file_id,
      entity_title: file.reference_number,
      description: `انتقال الملف ${file.reference_number}: ${stageLabelAr}${note ? ` — ${note}` : ''}`,
      old_value: file.stage,
      new_value: target_stage,
      correlation_id: file.correlation_id,
    }).catch(() => {});

    return Response.json({ file: updated, stage: target_stage });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}