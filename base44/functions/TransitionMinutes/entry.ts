import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse } from '../../shared/commandGuard.ts';
import { minutesTransition, canAdvanceMinutes, minutesRefusal } from '../../shared/meetingLifecycle.ts';
import { dispatchBatch } from '../../shared/notificationEngine.ts';

// TransitionMinutes — the minutes steps that had NO command (D-019).
//
// "Send for review", "issue to members" and "later amendment" used to be shown disabled with a reason
// because no governed command existed for them, and minutes state was never written from the browser.
// This command supplies those three transitions, each under the right that fits the act:
//   • submit_for_review — minutes.draft  (the office that prepares the minutes advances its own draft)
//   • issue             — minutes.issue  (releasing approved minutes to the members is its own right,
//                                         deliberately NOT the approval right itself)
//   • amend             — minutes.review (a correction after approval is a review-class act; it
//                                         produces 'amended', never an overwrite of the issued record)
// Approval itself stays with ApproveMinutes (minutes.approve) — this command cannot approve.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { minutes_id, transition } = body;

    if (!minutes_id || !transition) {
      return Response.json({ error: 'minutes_id, transition are required' }, { status: 400 });
    }

    const spec = minutesTransition(transition);
    if (!spec) {
      return Response.json({ ...minutesRefusal(transition, null), error: `Unknown minutes transition '${transition}'` }, { status: 400 });
    }

    const auth = await authorizeCommand(base44, {
      capability: spec.capability,
      target_type: 'MeetingMinutes',
      target_id: minutes_id,
      claimed_committee_id: body.committee_id || null,
    });
    if (!auth.allowed) return refusalResponse(auth);

    const minutes = auth.target;
    if (!canAdvanceMinutes(minutes.status, transition)) {
      return Response.json(minutesRefusal(transition, minutes.status), { status: 409 });
    }

    const patch: any = { status: spec.to };
    if (spec.to === 'issued') patch.issued_date = new Date().toISOString().split('T')[0];

    await base44.asServiceRole.entities.MeetingMinutes.update(minutes_id, patch);

    const committeeId = auth.trusted_target.derived_committee_id;

    await base44.asServiceRole.entities.AuditEvent.create({
      organization_id: auth.organization_id,
      committee_id: committeeId,
      actor_user_id: auth.user.id,
      actor_name: auth.user.full_name || auth.user.email,
      actor_email: auth.user.email,
      action: `minutes.${transition}`,
      entity_type: 'MeetingMinutes',
      entity_id: minutes_id,
      entity_title: minutes.minutes_number || '',
      description: `Minutes state ${minutes.status} → ${spec.to} by ${auth.effective_role} (right exercised: ${spec.capability})`,
      correlation_id: auth.correlation_id,
      authority_context: auth.authority_context,
    });

    // Issuing the minutes is the act that RELEASES them to the committee, so the members are told —
    // best effort, and never a reason to fail the transition that already took effect.
    if (spec.to === 'issued') {
      try {
        const members = await base44.asServiceRole.entities.CommitteeMembership
          .filter({ committee_id: committeeId, status: 'active' }).catch(() => []);
        const actors = (members || []).filter((m) => m.user_id && m.user_id !== auth.user.id);
        if (actors.length > 0) {
          const deepLink = `/o/${auth.organization_id}/c/${committeeId}/minutes`;
          const actorName = auth.user.full_name || auth.user.email;
          await dispatchBatch(base44, actors.map((m) => ({
            organization_id: auth.organization_id,
            committee_id: committeeId,
            recipient_user_id: m.user_id,
            recipient_name: m.full_name || m.full_name_ar || '',
            event_type: 'minutes_issued',
            context: {
              actor_name: actorName,
              message: `تم إصدار محضر الاجتماع ${minutes.minutes_number || ''} وإرساله إلى الأعضاء`,
              deep_link: deepLink,
            },
            source_entity_type: 'MeetingMinutes',
            source_entity_id: minutes_id,
            source_title: minutes.minutes_number || '',
            priority: 'normal',
            correlation_id: auth.correlation_id,
            actor_name: actorName,
            deep_link: deepLink,
          })));
        }
      } catch {}
    }

    return Response.json({
      status: 'ok',
      minutes_id,
      from: minutes.status,
      to: spec.to,
      capability: spec.capability,
      correlation_id: auth.correlation_id,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}