import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { resolveAuthority } from '../../shared/authorityKernel.ts';

// SubmitAgendaItem — governed agenda item submission.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    // `presenter` is the legacy single-language body field and is treated as the ARABIC
    // reading only. Clients that know the active language send presenter_ar / presenter_en.
    const { committee_id, meeting_id, title, title_ar, objective, presenter, presenter_ar, presenter_en, time_allocation_minutes, required_decision, related_decision_id, classification } = body;

    if (!committee_id || !meeting_id || !title) {
      return Response.json({ error: 'committee_id, meeting_id, title are required' }, { status: 400 });
    }

    const auth = await resolveAuthority(base44, { committee_id, capability: 'agenda.propose' });
    if (!auth.allowed) return Response.json({ error: auth.reason || 'Forbidden' }, { status: auth.status || 403 });

    // Get current max sequence
    const items = await base44.asServiceRole.entities.AgendaItem
      .filter({ committee_id, meeting_id }).catch(() => []);
    const maxSeq = Math.max(0, ...(items || []).map(i => i.sequence || 0));

    const agendaItem = await base44.asServiceRole.entities.AgendaItem.create({
      organization_id: auth.organization_id,
      committee_id, meeting_id,
      sequence: maxSeq + 1,
      title, title_ar: title_ar || null,
      objective: objective || null,
      presenter: presenter || null,
      presenter_ar: presenter_ar || presenter || null,
      presenter_en: presenter_en || null,
      time_allocation_minutes: time_allocation_minutes || 15,
      required_decision: required_decision || null,
      related_decision_id: related_decision_id || null,
      classification: classification || 'internal',
      readiness: 'not_ready',
      status: 'pending',
    });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id,
      actor_user_id: auth.user.id, actor_name: auth.user.full_name || auth.user.email, actor_email: auth.user.email,
      action: 'agenda.submit', entity_type: 'AgendaItem', entity_id: agendaItem.id,
      entity_title: title, description: `Agenda item submitted by ${auth.effective_role}`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    });

    return Response.json({ status: 'ok', agenda_item: agendaItem, correlation_id: auth.correlation_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}