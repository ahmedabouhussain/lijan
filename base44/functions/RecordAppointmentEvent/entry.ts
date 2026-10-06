import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { authorizeCommand, refusalResponse, requestClaims } from '../../shared/commandGuard.ts';
import { claimTransition, completeTransition, duplicateResponse } from '../../shared/transitionClaim.ts';
import {
  CONTINUITY_VERSION,
  APPOINTMENT_EVENTS,
  APPOINTABLE_ROLES,
  evaluateAppointmentEvent,
  assertSeatFreeForAssignment,
  refusal,
} from '../../shared/continuityContract.ts';

// RecordAppointmentEvent — every change to WHO occupies a seat is a dated, attributed institutional act.
//
// The seat is not the person. This command ends a seat (resignation, removal, end of term, incapacity,
// representation transfer, expiry of an acting appointment) or creates a NEW assignment under the
// successor's OWN identity. It never reuses the predecessor's account, grants or vote, and it never
// lets an office succeed itself: an acting appointment states the powers it carries and when it ends.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const {
      membership_id, event_type, effective_at, reason_class, reason_note, competent_authority,
      evidence_url, acting_scope, acting_expires_at, role, successor_user_id, successor_name,
      successor_email, predecessor_membership_id, notes,
    } = body;

    if (!membership_id || !event_type) {
      return Response.json({ error: 'membership_id and event_type are required' }, { status: 400 });
    }
    if (!APPOINTMENT_EVENTS[event_type]) return contractRefusal(refusal('unknown_event_type'));

    const contract = APPOINTMENT_EVENTS[event_type];
    // A personal act (resignation, a reported absence, accepting one's own appointment) is the seat
    // holder's own-act right; every institutional act requires the office that holds committee.manage.
    const capability = contract.self_service ? 'seat.resign' : 'committee.manage';

    const auth = await authorizeCommand(base44, {
      capability,
      target_type: 'CommitteeMembership',
      target_id: membership_id,
      ...requestClaims(body),
    });
    if (!auth.allowed) return refusalResponse(auth);
    const seat = auth.target;

    const evaluation = evaluateAppointmentEvent({
      event_type,
      seat,
      actor_user_id: auth.user.id,
      actor_is_competent_authority: !contract.self_service,
      acting_scope,
      acting_expires_at,
      reason_class: reason_class || 'institutional',
      evidence_url,
    });
    if (!evaluation.ok) return contractRefusal(evaluation);

    const effective = effective_at || new Date().toISOString();
    const key = `seat.event:${membership_id}:${event_type}:${effective}`;
    const claim = await claimTransition(base44, {
      key,
      command: 'RecordAppointmentEvent',
      entity_type: 'CommitteeMembership',
      entity_id: membership_id,
      committee_id: auth.trusted_target.derived_committee_id,
      organization_id: auth.organization_id,
      actor_user_id: auth.user.id,
    });
    if (!claim.won) return duplicateResponse(claim, 'This appointment event is already recorded');

    const sr = base44.asServiceRole;
    const committeeId = auth.trusted_target.derived_committee_id;
    const actorName = auth.user.full_name || auth.user.email;
    const now = new Date().toISOString();

    let successorMembership = null;
    // 1 — an assignment creates a NEW seat under its own identity (never the predecessor's account).
    if (evaluation.creates_assignment) {
      const assignRole = APPOINTABLE_ROLES.includes(role) ? role : seat.role;
      const activeSeats = await sr.entities.CommitteeMembership
        .filter({ committee_id: committeeId, status: 'active' }, { limit: 200 })
        .catch(() => []);
      const free = assertSeatFreeForAssignment({
        existing_seats: activeSeats || [],
        user_id: successor_user_id,
        role: assignRole,
        event_type,
      });
      if (free) {
        await completeTransition(base44, claim.claim_id, { result_ref: 'refused' });
        return contractRefusal(free);
      }
      successorMembership = await sr.entities.CommitteeMembership.create({
        organization_id: auth.organization_id,
        committee_id: committeeId,
        user_id: successor_user_id,
        user_email: successor_email || null,
        full_name: successor_name || null,
        full_name_ar: successor_name || null,
        role: assignRole,
        status: 'active',
        voting_right: assignRole !== 'observer' && assignRole !== 'advisor',
        appointment_type: evaluation.bounded ? 'acting' : 'permanent',
        acting_scope: evaluation.bounded ? (Array.isArray(acting_scope) ? acting_scope.filter(Boolean) : []) : [],
        acting_expires_at: evaluation.bounded ? acting_expires_at : null,
        predecessor_membership_id: predecessor_membership_id || (evaluation.bounded ? membership_id : null),
        term_start: now.slice(0, 10),
        term_end: null,
        authority_level: 'decision',
        membership_type: seat.membership_type || 'internal',
        represented_organization_id: seat.represented_organization_id || null,
        protocol_order: seat.protocol_order || 99,
      });
    }

    // 2 — an ended seat keeps its history and leaves a visible vacancy or an approved successor.
    if (evaluation.seats_ended) {
      const endedStatus = endedStatusFor(event_type);
      await sr.entities.CommitteeMembership.update(membership_id, {
        status: endedStatus,
        ended_at: now,
        end_reason: event_type,
        end_source_instrument_ref: `${event_type}:${key}`,
        end_source_instrument_id: successorMembership ? successorMembership.id : null,
        term_end: seat.term_end || effective.slice(0, 10),
      });
    }

    const eventRecord = await sr.entities.SeatAppointmentEvent.create({
      organization_id: auth.organization_id,
      committee_id: committeeId,
      membership_id,
      user_id: seat.user_id || null,
      person_name: seat.full_name_ar || seat.full_name || null,
      person_name_en: seat.full_name || null,
      seat_role: seat.role || null,
      event_type,
      effective_at: effective,
      recorded_at: now,
      competent_authority: competent_authority || (contract.self_service ? actorName : actorName),
      competent_authority_user_id: auth.user.id,
      reason_class: reason_class || 'institutional',
      reason_note: reason_note || null,
      evidence_url: evidence_url || null,
      acting_scope: Array.isArray(acting_scope) ? acting_scope.filter(Boolean) : [],
      acting_expires_at: acting_expires_at || null,
      bounded: evaluation.bounded,
      predecessor_membership_id: predecessor_membership_id || (evaluation.bounded ? membership_id : null),
      predecessor_user_id: seat.user_id || null,
      successor_membership_id: successorMembership ? successorMembership.id : membership_id,
      successor_user_id: successorMembership ? successor_user_id : (seat.user_id || null),
      seats_ended: evaluation.seats_ended,
      creates_vacancy: evaluation.creates_vacancy,
      vacancy_status: evaluation.creates_vacancy ? (successorMembership ? 'resolved' : 'open') : 'none',
      quorum_may_break: evaluation.quorum_may_break,
      powers_stopped: evaluation.powers_stopped,
      obligations_remain_with: evaluation.obligations_remain_with,
      contract_version: CONTINUITY_VERSION,
      status: 'effective',
    });

    await sr.entities.AuditEvent.create({
      organization_id: auth.organization_id, committee_id: committeeId,
      actor_user_id: auth.user.id, actor_name: actorName, actor_email: auth.user.email,
      action: `seat.${event_type}`, entity_type: 'CommitteeMembership', entity_id: membership_id,
      entity_title: seat.full_name || seat.full_name_ar || '',
      description: evaluation.seats_ended
        ? `Seat ended by ${event_type}; vacancy ${successorMembership ? 'resolved by a new assignment under a separate identity' : 'left open'}. Powers stopped: ${evaluation.powers_stopped.join(', ') || 'none'}.`
        : `Appointment event ${event_type} recorded (${evaluation.bounded ? 'bounded acting appointment' : 'permanent assignment'}).`,
      correlation_id: auth.correlation_id, authority_context: auth.authority_context,
    }).catch(() => null);

    await completeTransition(base44, claim.claim_id, { result_ref: eventRecord.id });

    return Response.json({
      status: 'ok',
      event_id: eventRecord.id,
      event_type,
      seats_ended: evaluation.seats_ended,
      creates_vacancy: evaluation.creates_vacancy,
      vacancy_status: evaluation.creates_vacancy ? (successorMembership ? 'resolved' : 'open') : 'none',
      successor_membership_id: successorMembership ? successorMembership.id : null,
      bounded: evaluation.bounded,
      acting_expires_at: acting_expires_at || null,
      auto_succession: false,
      obligations_remain_with: evaluation.obligations_remain_with,
      reason_visible_in_registers: evaluation.reason_visible_in_registers,
      handover_required: evaluation.requires_handover_when_ending,
      contract_version: CONTINUITY_VERSION,
      correlation_id: auth.correlation_id,
      notes: notes || null,
    });
  } catch (error) {
    return Response.json({ error: error.message, code: 'unexpected_error', contract_version: CONTINUITY_VERSION }, { status: 500 });
  }
}

function endedStatusFor(event_type) {
  if (event_type === 'resignation') return 'resigned';
  if (event_type === 'removal') return 'removed';
  return 'inactive';
}

function contractRefusal(r) {
  return Response.json(
    { error: r.reason, error_ar: r.reason_ar, code: r.code, contract_version: r.contract_version || CONTINUITY_VERSION },
    { status: r.status || 409 },
  );
}