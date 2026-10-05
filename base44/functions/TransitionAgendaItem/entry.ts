import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { agendaTransition, canAdvanceAgendaItem, agendaRefusal } from '../../shared/meetingLifecycle.ts';

// TransitionAgendaItem — the ONLY writer of an agenda item's stage (D-022).
//
// The stage was previously written from the browser with no command and no readiness gate, so a
// surface could move an item to "decided" and nothing on the server could tell the difference between
// that and a decision the committee actually took.
//
// The capability follows the ACT, not the record: beginning, deferring and withdrawing are acts of
// PREPARING the agenda (agenda.edit — the secretariat's office), while closing an item as DECIDED is
// an act of APPROVING it (agenda.approve — the chair's office). The states each transition may act on
// come from the shared contract (meeting-lifecycle-1.0.0), so this command and the surface that
// offers the buttons cannot disagree about what is permitted.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { agenda_item_id, transition } = body;

    if (!agenda_item_id || !transition) {
      return Response.json({ error: 'agenda_item_id, transition are required' }, { status: 400 });
    }

    const spec = agendaTransition(transition);
    if (!spec) {
      return Response.json({ ...agendaRefusal(transition, null), error: `Unknown agenda transition '${transition}'` }, { status: 400 });
    }

    // Authority on a TRUSTED target: the committee is derived from the item's own meeting, and the
    // guard applies the permitted-state gate for the capability before anything is written.
    const auth = await authorizeCommand(base44, {
      capability: spec.capability,
      target_type: 'AgendaItem',
      target_id: agenda_item_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const item = auth.target;
    if (!canAdvanceAgendaItem(item.status, transition)) {
      return Response.json(agendaRefusal(transition, item.status), { status: 409 });
    }

    // Readiness is COMPUTED by EvaluateAgendaReadiness, never asserted by hand: closing an item as
    // decided is exactly the act the evidence gate exists for, so an item whose computed readiness is
    // not 'ready' is not closed here however the caller asks.
    if (transition === 'decide' && item.readiness !== 'ready') {
      return Response.json({
        error: `Agenda item readiness is '${item.readiness}', not 'ready'`,
        code: 'readiness_gate_closed',
        message: {
          ar: 'بوابة الجاهزية مغلقة: تُفتح عندما تُحسب الجاهزية «جاهز» من متطلبات الأدلة المرتبطة بالبند.',
          en: 'The readiness gate is closed: it opens when the readiness evaluation computes Ready from the item’s evidence requirements.',
        },
        readiness: item.readiness ?? null,
        correlation_id: auth.correlation_id,
      }, { status: 409 });
    }

    await base44.asServiceRole.entities.AgendaItem.update(agenda_item_id, { status: spec.to });

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id: auth.trusted_target.derived_committee_id,
      actor_user_id: auth.user.id,
      actor_name: auth.user.full_name || auth.user.email,
      actor_email: auth.user.email,
      action: `agenda.${transition}`,
      entity_type: 'AgendaItem',
      entity_id: agenda_item_id,
      entity_title: item.title || item.title_ar || '',
      description: `Agenda item stage ${item.status} → ${spec.to} by ${auth.effective_role} (right exercised: ${spec.capability})`,
      correlation_id: auth.correlation_id,
      authority_context: auth.authority_context,
    });

    return Response.json({
      status: 'ok',
      agenda_item_id,
      from: item.status,
      to: spec.to,
      capability: spec.capability,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}