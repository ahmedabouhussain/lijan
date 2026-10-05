import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { canArchiveAgendaItem, archiveRefusal, AGENDA_ARCHIVE } from '../../shared/meetingLifecycle.ts';

// ArchiveAgendaItem — the governed answer to "remove this item" (D-024).
//
// Removal used to ride on the record's own administrative rule (`rls.delete` for an organisation
// admin): a DELETE, performed by a role rather than by an act, and irreversible. A governance record
// that can be deleted cannot be audited, so the item is WITHDRAWN instead — it leaves the live agenda
// and stays on the file, with the actor, the reason and the correlation id recorded.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { agenda_item_id } = body;

    if (!agenda_item_id) {
      return Response.json({ error: 'agenda_item_id is required' }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: AGENDA_ARCHIVE.capability,
      target_type: 'AgendaItem',
      target_id: agenda_item_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const item = auth.target;
    if (!canArchiveAgendaItem(item.status)) {
      return Response.json(archiveRefusal(item.status), { status: 409 });
    }

    // The record is UPDATED, never deleted: the stage becomes 'withdrawn' and the row remains
    // readable as the history of what was on the agenda and who took it off.
    await base44.asServiceRole.entities.AgendaItem.update(agenda_item_id, { status: AGENDA_ARCHIVE.to });

    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      actor_user_id: auth.user.id,
      actor_name: auth.user.full_name || auth.user.email,
      actor_email: auth.user.email,
      action: 'agenda.archive',
      entity_type: 'AgendaItem',
      entity_id: agenda_item_id,
      entity_title: item.title || item.title_ar || '',
      description: `Agenda item withdrawn from stage ${item.status} to ${AGENDA_ARCHIVE.to} by ${auth.effective_role} (right exercised: ${AGENDA_ARCHIVE.capability}); the record is retained, never deleted${reason ? ` — stated reason: ${reason}` : ''}`,
      correlation_id: auth.correlation_id,
      authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      agenda_item_id,
      from: item.status,
      to: AGENDA_ARCHIVE.to,
      retained: true,
      note: {
        ar: 'البند مسحوب من الأجندة الحيّة وسجله محفوظ للتدقيق — لا حذف في نظام حوكمة.',
        en: 'The item is withdrawn from the live agenda and its record is kept for audit — a governance system does not delete.',
      },
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}